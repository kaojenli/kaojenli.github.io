// Written by tools/narrate.py: don't edit by hand. For each tour, the voice-over track and, per scene,
// [k, hold]: the scene runs k times slower than written so every spoken line fits, then holds its last picture
// for `hold` seconds while the last line finishes.
const NARRATION = {
  mmwave: {"src": "audio/mmwave.mp3?v=b0c03e8a", "pace": [[1.118, 0.0], [1.264, 0.0], [1.02, 0.0], [1.557, 0.0], [1.181, 0.461], [1.309, 0.121], [1.0, 0.439], [1.359, 0.0], [1.07, 0.0], [1.07, 0.0], [1.087, 0.0], [1.092, 0.0], [1.63, 0.0], [1.078, 0.0], [1.017, 0.0]]},
  sigma: {"src": "audio/sigma.mp3?v=8a397047", "pace": [[1.051, 0.302], [1.037, 0.0], [1.153, 0.0], [1.0, 0.0], [1.525, 0.0], [1.137, 0.0], [1.07, 0.0], [1.03, 0.75], [1.098, 0.0], [1.058, 0.055], [1.081, 0.0], [1.054, 0.0]]},
  mri: {"src": "audio/mri.mp3?v=aeb09897", "pace": [[1.197, 0.207], [1.145, 0.0], [1.149, 0.0], [1.601, 0.0], [1.441, 0.0], [1.095, 2.408], [1.058, 0.264], [1.207, 0.0], [1.089, 0.0], [1.0, 0.0]]},
  mammo: {"src": "audio/mammo.mp3?v=695529ff", "pace": [[1.129, 0.0], [1.088, 0.137], [1.568, 0.0], [1.0, 0.358], [1.039, 0.0], [1.063, 1.641], [1.047, 0.0], [1.705, 0.0], [1.089, 0.0]]},
  metagenomic: {"src": "audio/metagenomic.mp3?v=4d1c5751", "pace": [[1.179, 0.0], [1.165, 0.0], [1.242, 0.0], [1.178, 2.393], [1.141, 0.0], [1.338, 0.0], [1.428, 0.0], [1.271, 0.0], [1.021, 0.098]]},
};
