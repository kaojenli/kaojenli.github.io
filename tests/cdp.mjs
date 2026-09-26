// Tiny Chrome DevTools Protocol driver for local checks (uses the installed Google Chrome, no npm packages).
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const SITE = new URL("../index.html", import.meta.url).href;

export async function open(url, { width = 1440, height = 900, mobile = false, reducedMotion = false } = {}) {
  // Chrome picks a free port and writes it into its profile folder, so we always talk to the Chrome we started
  const dir = mkdtempSync(join(tmpdir(), "cdp-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=0",
    `--user-data-dir=${dir}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    await sleep(200);
    try {
      const port = readFileSync(join(dir, "DevToolsActivePort"), "utf8").split("\n")[0];
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!page) { proc.kill(); throw new Error("Chrome did not start"); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) logs.push(m.params.type + " " + m.params.args.map((a) => a.value ?? a.description).join(" "));
  };
  // every call answers within 30s or fails loudly (a stuck call must not hang the test run)
  const send = (method, params = {}) => new Promise((r) => {
    const i = ++id, timer = setTimeout(() => { pending.delete(i); r({ error: `timeout: ${method}` }); }, 30000);
    pending.set(i, (m) => { clearTimeout(timer); r(m); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  if (reducedMotion) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url });
  const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); return r.result?.exceptionDetails ? "ERR " + r.result.exceptionDetails.exception?.description : r.result?.result?.value; };
  const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const click = async (x, y) => { await mouse("mousePressed", x, y); await mouse("mouseReleased", x, y); await sleep(150); };
  const key = async (k) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: k === "Escape" ? 27 : k === "Enter" ? 13 : 0 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k }); await sleep(100); };
  const shot = async (path, clip) => { const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { captureBeyondViewport: true, clip } : {}) }); writeFileSync(path, Buffer.from(r.result.data, "base64")); };
  // wait for the page to finish loading (scripts have built the scene), then let first animations settle
  for (let i = 0; i < 100 && (await ev("document.readyState")) !== "complete"; i++) await sleep(100);
  await sleep(800);
  const close = () => { ws.close(); proc.kill(); };
  return { ev, send, click, key, shot, close, logs, sleep };
}
