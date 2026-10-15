# Voice-over for the pixel tours: reads every subtitle in js/tours.js aloud with Kokoro (an open text-to-speech model),
# writes one narration track per tour to audio/<slug>.mp3, and writes js/narration.js, which tells the player how
# much to slow each scene so every spoken line fits before the next one starts.
#
#   python3 -m venv .tts && .tts/bin/pip install kokoro-onnx soundfile
#   (download kokoro-v1.0.onnx and voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx/releases, model-files-v1.0)
#   .tts/bin/python tools/narrate.py path/to/models [voice]      then: node tools/check.mjs --stamp
#
# Dev only (needs node and ffmpeg too); run it again whenever a subtitle in tours.js changes.
import hashlib, json, os, re, subprocess, sys
import numpy as np
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS, VOICE = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "af_heart")
SPEED, GAP, TAIL, SR = 1.1, 0.3, 0.7, 24000  # speech rate; silence after each line, and after a scene's last line

# the scenes and their subtitles, straight from tours.js
DUMP = """const vm = require("vm"), fs = require("fs");
const ctx = { matchMedia: () => ({ matches: false }) };
const T = vm.runInNewContext(fs.readFileSync("js/tours.js", "utf8") + ";TOURS", ctx);
console.log(JSON.stringify(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.scenes.map((s) => ({ dur: s.dur, subs: s.subs || [] }))]))));"""
tours = json.loads(subprocess.check_output(["node", "-e", DUMP], cwd=ROOT))

# how to say what the subtitles write in short (units, symbols, names a text-to-speech model would spell out or misread)
SAY = [(r"\bGHz\b", "gigahertz"), (r"\bMHz\b", "megahertz"), (r"\bHz\b", "hertz"), (r"\bdB\b", "decibels"), (r"(\d) cm\b", r"\1 centimeters"),
       (r"(\d)°", r"\1-degree"), (r" × ", " by "), (r"(\d+)–(\d+)%", r"\1 to \2 percent"), (r"70 / 30", "seventy-thirty"), (r"–", "-"),
       (r"\bMIMO\b", "my-moh"), (r"\bYAML\b", "yammel"), (r"\bTE\b", "T E"), (r"\bEC\b", "E C"), (r"HUMAnN3", "Human 3"),
       (r"DeepECtransformer", "Deep E C transformer"), (r"ECPICK", "E C Pick"), (r"UniRef90", "Uni-Ref 90"), (r"ProtT5", "Prot T 5"),
       (r"XGBoost", "X G Boost"), (r"CBIS-DDSM", "C B I S, D D S M"), (r"micro-F1", "micro F 1"), (r"Macro-F1", "Macro F 1"), (r"\bF1\b", "F 1")]
def spoken(text):
    for pat, rep in SAY: text = re.sub(pat, rep, text)
    return text

tts = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
def say(text):  # a spoken line, with the silence around it trimmed
    a, sr = tts.create(spoken(text), voice=VOICE, speed=SPEED, lang="en-us")
    assert sr == SR
    loud = np.nonzero(np.abs(a) > 2e-3)[0]
    return a[max(0, loud[0] - 480): loud[-1] + 960] if len(loud) else a

os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
out = {}
for slug, scenes in tours.items():
    pace, parts, at = [], [], 0.0  # at: where this scene starts in the narration track (seconds)
    for sc in scenes:
        clips = [say(text) for _, text in sc["subs"]]
        cues = [t0 for t0, _ in sc["subs"]]
        # k: how much slower the scene runs, so each line ends (plus a breath) before the next line's subtitle shows
        k = max([1.0] + [(len(c) / SR + GAP) / (cues[j + 1] - cues[j]) for j, c in enumerate(clips[:-1])])
        real = sc["dur"] * k
        if clips: real = max(real, cues[-1] * k + len(clips[-1]) / SR + TAIL)  # hold the last picture until the line ends
        for t0, c in zip(cues, clips): parts.append((at + t0 * k, c))
        pace.append([round(k, 3), round(real - sc["dur"] * k, 3)])
        at += real
    track = np.zeros(int(at * SR) + SR, dtype=np.float32)
    for start, c in parts: i = int(start * SR); track[i:i + len(c)] += c[: len(track) - i]
    path = os.path.join(ROOT, "audio", slug + ".mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", "loudnorm=I=-18:TP=-2", "-ar", str(SR), "-codec:a", "libmp3lame", "-b:a", "48k", path],
                   input=np.clip(track, -1, 1).tobytes(), check=True)
    ver = hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]
    out[slug] = {"src": f"audio/{slug}.mp3?v={ver}", "pace": pace}
    print(f"{slug}: {at:.1f} s of narration ({sum(s['dur'] for s in scenes):.1f} s before)")

with open(os.path.join(ROOT, "js", "narration.js"), "w") as f:
    f.write("// Written by tools/narrate.py: don't edit by hand. For each tour, the voice-over track and, per scene,\n"
            "// [k, hold]: the scene runs k times slower than written so every spoken line fits, then holds its last picture\n"
            "// for `hold` seconds while the last line finishes.\n")
    f.write("const NARRATION = {\n" + "".join(f"  {s}: {json.dumps(v)},\n" for s, v in out.items()) + "};\n")
