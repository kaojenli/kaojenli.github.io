// All site text lives here. Edit this file to update the portfolio.
const CONTENT = {
  person: {
    name: "Jen Li Kao",
    tagline: "Computer Vision · Imaging Systems · Signal Processing · Machine Learning Systems",
    now: "AI Engineer @ We Share Baseball",
    email: "kaojenli@gmail.com",
    // the "Get in touch" form posts here (FormSubmit: emails each message to the address; the very first inquiry
    // sends an activation email instead, and messages arrive once its link is clicked)
    messageForm: "https://formsubmit.co/ajax/kaojenli@gmail.com",
    intro:
      "My research interests span computer vision, machine learning, and imaging systems, with a focus on developing " +
      "end-to-end AI systems, from data acquisition and processing to model development, deployment, and continuous " +
      "improvement. I am particularly interested in interdisciplinary problems that bring together perception, learning, " +
      "and systems design across different modalities and application domains.",
    links: [
      { label: "GitHub", url: "https://github.com/Dino-Boooo" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jenlikao/" },
      { label: "Email", url: "mailto:kaojenli@gmail.com" },
      // To offer the CV: upload a copy without the phone number (e.g. to Google Drive, shared as "anyone with the link")
      // and add { label: "CV (PDF)", url: "https://..." } here. It then shows in both versions.
    ],
  },

  hero: {
    eyebrow: "Computer Vision · Imaging Systems · Signal Processing · Machine Learning Systems",
    caption: "A cabin with a room for each project. Everyone inside is busy with one of them; click anyone to say hi.",
  },

  // Page sections, top to bottom; `label` is the navigation link.
  sections: [
    { id: "about", title: "About", label: "About" },
    { id: "projects", title: "Projects", label: "Projects" },
    { id: "experience", title: "Experience", label: "Experience" },
    { id: "education", title: "Education", label: "Education" },
    { id: "papers", title: "Papers & Talks", label: "Papers" },
    { id: "skills", title: "Skills", label: "Skills" },
  ],

  projectGroups: ["Work", "Research", "Course Projects"],

  projects: [
    {
      slug: "pitching",
      room: "Practice field",
      cat: "Work",
      title: "Vision-Based Pitching Analysis & Player Training System",
      short: "Pitching Analysis",
      org: "We Share Baseball",
      date: "Mar 2026 – Present",
      file: "pitching-pose-3d.mov",
      // company project: the approach only, no figures or footage
      bullets: [
        "Build and deploy an in-season pitching analysis platform that fine-tunes detection, segmentation, and 3D pose estimation, and retrains player-specific models on new game data.",
        "Design multi-view 3D pose fusion for uncalibrated, unsynchronized cameras, combining time alignment, camera geometry, and confidence weighting.",
        "Engineer joint-angle and key-motion features to compare mechanics within each player and flag movements linked to injury risk.",
      ],
      tags: ["3D pose estimation", "Multi-view fusion", "Segmentation", "Motion features"],
      links: [],
    },
    {
      slug: "tracking",
      room: "Café & hacker room",
      cat: "Work",
      title: "Multi-Camera Customer Tracking & Analytics System",
      short: "Multi-Camera Tracking",
      org: "We Share Baseball",
      date: "Mar 2026 – Present",
      file: "multicam-tracking.mov",
      // company project: the approach only, no figures or footage
      bullets: [
        "Build a multi-camera tracking pipeline for a retail store, linking identities across cameras through appearance-based re-identification and spatial proximity.",
        "Project tracks onto a bird's-eye-view floor plan via homography to produce trajectories, occupancy heatmaps, and dwell-time statistics.",
        "Migrate to a GPU-accelerated NVIDIA DeepStream pipeline that unifies detection, 3D tracking, and ground-plane localization, with tracklet stitching and multi-GPU scheduling.",
      ],
      tags: ["Detection", "Multi-object tracking", "Re-ID", "Homography", "BEV", "DeepStream"],
      links: [],
    },
    {
      slug: "sigma",
      room: "Security room",
      cat: "Research",
      title: "Automatic Sigma Rule Generation Using Language and Vision Models",
      short: "Sigma Rule Generation",
      org: "Applied Machine Learning Research, CSE, Texas A&M University",
      date: "May 2025 – Present",
      file: "sigma-rules.log",
      bullets: [
        "Developed a framework integrating LLM reasoning, AST-based parsing, and multimodal inputs to automate Sigma rule generation, reaching 89% rule validity and 0.81 detection F1 on 64 held-out reports.",
        "Built an AST-based evaluation pipeline with Halstead and cyclomatic metrics, showing that AST-guided generation raises syntactic validity by 11 points over natural-language prompts across 6 LLMs.",
        "Active research: knowledge-graph-based memory that helps LLM agents reuse knowledge across tasks.",
      ],
      tags: ["LLMs", "Multimodal", "AST parsing", "Benchmarking", "Agent memory"],
      links: [],
    },
    {
      slug: "mmwave",
      room: "mmWave lab",
      cat: "Research",
      title: "Breast Tumor Detection Using Multi-Channel Millimeter-Wave 3D Imaging",
      short: "mmWave Imaging",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      date: "Sep 2020 – May 2022",
      file: "mmwave-3d.mov",
      bullets: [
        "Built a 62–69 GHz MIMO radar (20 Tx × 20 Rx) imaging system that detects breast tumors by dielectric contrast, localizing a 10 mm tumor phantom with MSE of 0.077 on-axis and 0.097 off-axis.",
        "Implemented clutter suppression and delay-and-sum beamforming, and fused 36 multi-angle acquisitions (10° steps, 360°) into 3D images, improving tumor-size estimation over 2D imaging.",
        "Fabricated tissue-mimicking phantoms and performed dielectric characterization, detecting tumors as small as 6 mm (vs. 8 mm in prior work) at depths up to 20 mm.",
      ],
      tags: ["MIMO radar", "Beamforming", "3D reconstruction", "Phantoms", "Dielectric contrast"],
      links: [{ label: "Paper (IEEE Xplore)", url: "https://ieeexplore.ieee.org/document/9945009" }],
    },
    {
      slug: "mri",
      room: "MRI lab",
      cat: "Course Projects",
      title: "Benchtop MRI System",
      short: "Benchtop MRI",
      org: "Texas A&M University",
      date: "Fall 2024",
      file: "mini-mri.mov",
      bullets: [
        "Built a benchtop MRI system with programmable control of RF pulses and gradients, calibrated the gradients, and improved spin-echo SNR by 5 dB through RF coil matching and shimming.",
        "Reconstructed images by filtered backprojection and by phase-encoded k-space imaging with 2D FFT.",
      ],
      tags: ["MRI", "RF & gradients", "Shimming", "k-space", "Backprojection"],
      links: [{ label: "GitHub", url: "https://github.com/Dino-Boooo/Instrumentation-and-System-Design-for-Advanced-MRI-Imaging" }],
    },
    {
      slug: "mammo",
      room: "Reading room",
      cat: "Course Projects",
      title: "Breast Cancer Classification on CBIS-DDSM",
      short: "Mammogram Study",
      org: "Texas A&M University",
      date: "Fall 2024",
      file: "mammo-classify.mov",
      bullets: [
        "Reproduced a published GLCM texture-feature and SVM pipeline on 2,620 mammograms, showing held-out accuracy (0.52–0.57) well below cross-validation estimates (up to 0.79).",
        "Trained an Xception-based CNN to 0.91 held-out accuracy, outperforming all classical baselines.",
      ],
      tags: ["GLCM", "SVM", "CNN", "Xception", "Evaluation"],
      links: [{ label: "GitHub", url: "https://github.com/xoumyax/Breast-Cancer-Classification" }],
    },
    {
      slug: "metagenomic",
      room: "Server room",
      cat: "Course Projects",
      title: "Benchmarking Transformer-Based Metagenomic Functional Profiling",
      short: "Metagenomics",
      org: "Texas A&M University",
      date: "Spring 2025",
      file: "metagenomic-bench.log",
      bullets: [
        "Compared DeepECtransformer against alignment-based and CNN baselines on ~250k EC-labeled sequences from five body sites, reaching micro-F1 of 0.89–0.91.",
        "Enabled GPU deployment on an HPC cluster through model-version and compatibility fixes, analyzed misclassified proteins by sequence similarity, and evaluated a ProtT5 encoder as an alternative backbone.",
      ],
      tags: ["Transformers", "ProtT5", "HPC", "Bioinformatics"],
      links: [{ label: "GitHub", url: "https://github.com/Dino-Boooo/Metagenomic-Functional-Profiling" }],
    },
    {
      slug: "fashion",
      room: "Studio",
      cat: "Course Projects",
      title: "CNN vs. LightGBM on Fashion-MNIST",
      short: "Model Comparison",
      org: "Texas A&M University",
      date: "Fall 2024",
      file: "fashion-mnist-compare.ipynb",
      bullets: [
        "Compared a convolutional network with a gradient-boosted tree model on the same 70,000-image clothing classification task, weighing accuracy against training cost: the CNN reached 92% accuracy, LightGBM 89% in a third of the training time.",
        "Traced both models' errors to the same visually similar classes (shirt, coat, pullover) with per-class confusion matrices, and mapped LightGBM's most important pixel features back onto the images to show that the tree model relies on coarse outline cues.",
      ],
      tags: ["CNN", "LightGBM", "PyTorch", "Model selection", "Explainability"],
      links: [{ label: "GitHub", url: "https://github.com/Dino-Boooo/Fashion-MNIST-Model-Comparison" }],
    },
  ],

  // Newest first. `project` links the row to a project window.
  experience: [
    {
      role: "AI Engineer",
      org: "We Share Baseball",
      orgShort: "We Share Baseball",
      place: "Taipei, Taiwan",
      date: "Mar 2026 – Present",
      bullets: ["Vision-based pitching analysis; multi-camera customer tracking."],
      project: "pitching",
    },
    {
      role: "Research Co-op",
      org: "Applied Machine Learning Research, CSE, Texas A&M University",
      orgShort: "TAMU",
      place: "College Station, TX",
      date: "May 2025 – Present",
      bullets: ["Sigma rule generation with LLMs; memory for LLM agents."],
      project: "sigma",
    },
    {
      role: "Research Assistant",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      orgShort: "Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Sep 2020 – May 2022",
      bullets: ["Millimeter-wave 3D imaging for breast tumor detection."],
      project: "mmwave",
    },
    {
      role: "Research Assistant",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      orgShort: "Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Jan 2021 – Dec 2021",
      bullets: ["Pre-market regulatory review for mobile health devices."],
    },
    {
      role: "Teaching Assistant",
      org: "CSIE, Chang Gung University",
      orgShort: "Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Fall 2021 – Spring 2022",
      bullets: ["Data Structures and Algorithms."],
    },
    {
      role: "Intern",
      org: "CYLTEK Ltd.",
      orgShort: "CYLTEK",
      place: "Hsinchu, Taiwan",
      date: "Sep 2020 – Feb 2021",
      bullets: ["Contactless vital-sign monitoring with mmWave radar."],
    },
  ],

  education: [
    {
      school: "Texas A&M University",
      degree: "MS in Electrical and Computer Engineering",
      place: "College Station, TX",
      date: "Sep 2023 – May 2025",
      notes: ["Graduate Merit Scholarship, Department of ECE."],
    },
    {
      school: "Chang Gung University",
      degree: "MS in Computer Science and Information Engineering",
      place: "Taoyuan, Taiwan",
      date: "Jul 2022",
      notes: ["Thesis: Breast Tumor Detection Using Multi-Channel Millimeter-wave 3D Imaging: A Preliminary Study."],
    },
    {
      school: "National Dong Hwa University",
      degree: "BS in Computer Science and Information Engineering",
      place: "Hualien, Taiwan",
      date: "Jun 2018",
      notes: [],
    },
  ],

  // small things made on the side, shown as a short row of cards under the projects (ASCII version)
  miniProjects: [
    {
      slug: "jammynote",
      title: "JammyNote",
      kind: "macOS app",
      date: "2026 Nov · actively updated",
      summary: "A lightweight sticky-note app for macOS, built to stay out of the way.",
      points: [
        ["Lightweight", "floats above other windows, lives in the menu bar, updates itself."],
        ["Smart scheduling", "dated lines become Calendar events or Reminders, with tags and alerts."],
        ["Auto-tidy", "scheduled lines are cleaned up automatically, leaving only the task."],
        ["Any style", "rich text, checklists and images; custom shapes, colours, textures and fonts."],
        ["Easy sharing", "send notes as images via Messages, Mail or AirDrop; drag one back in and it becomes an editable note again."],
      ],
      tags: ["macOS 13+", "Apple silicon & Intel", "Calendar & Reminders"],
      link: { label: "Releases", url: "https://github.com/Dino-Boooo/jammy-note-releases" },
    },
  ],

  papers: [
    {
      kind: "Conference paper",
      cite:
        "<b>J.-L. Kao</b> and Y.-P. Chao, “Breast Tumor Detection Using Multi-Channel 62-69 GHz Millimeter-wave 3D Imaging Technology,” " +
        "2022 IEEE 4th Eurasia Conference on Biomedical Engineering, Healthcare and Sustainability (ECBIOS), 2022, pp. 16–19.",
      link: { label: "DOI: 10.1109/ECBIOS54627.2022.9945009", url: "https://ieeexplore.ieee.org/document/9945009" },
    },
    {
      kind: "Presentation",
      cite:
        "<b>J.-L. Kao</b>, “Breast Tumor Detection Using Multi-Channel Millimeter-wave 3D Imaging Technology: A Preliminary Study,” " +
        "The 16th Symposium of Medical Imaging and Radiological Sciences (SMIRS), Taoyuan, Taiwan, Oct 2022.",
      badge: "Honorable Mention Award",
    },
  ],

  skills: [
    { name: "Machine Learning", items: "deep learning, LLMs, model evaluation" },
    { name: "Computer Vision", items: "detection, tracking, re-ID, 3D pose" },
    { name: "Signal Processing", items: "radar, physiological and time-series signals" },
    { name: "Imaging Systems", items: "calibration, beamforming, reconstruction" },
    { name: "Systems", items: "multi-GPU scheduling, HPC (SLURM), Docker, embedded DSP" },
  ],
  stack: [
    "Python", "PyTorch", "scikit-learn", "SciPy", "OpenCV", "Flask", "C/C++", "MATLAB", "Linux", "Git",
  ],

  // The café's customers (cabin.js): what they say ordering, what the barista answers, what they say once seated, and
  // when the line is too long to join or there's nowhere left to sit.
  cafe: {
    order: ["one brownie, please!", "a latte and a brownie, please", "can I get a brownie?", "flat white, please", "an oat latte to stay"],
    serve: ["one brownie, coming up!", "here's your brownie!", "last warm brownie, enjoy!", "coming right up!", "take a seat, I'll bring it"],
    seated: ["this table is mine", "one more chapter", "deadline tonight...", "best latte in town", "am I being tracked?", "nice heatmap", "so cozy in here"],
    tooLong: ["the line's too long!", "maybe later", "I'll come back"],
    takeaway: ["to go, then!", "no seats, I'll take it away"],
  },

  // Speech bubbles. `lines` pop up on their own; `click` when you click the NPC.
  npcs: {
    jen: { name: "Jen", lines: [], click: ["Hi, I'm Jen. Welcome in.", "Every room here is one of my projects.", "Click around, everyone's busy with something."] },
    pitcher: { name: "Pitcher", lines: ["keypoints: 17/17", "one more rep!", "fastball incoming"], click: ["relax, my elbow is tracked in 3D"] },
    barista: { name: "Barista", lines: ["one latte, coming up!", "next, please!", "oat milk?", "fresh brownies today!"], click: ["this one's on the house"] },
    hacker: { name: "Hacker", lines: ["re-ID: same person on camera 2", "heatmap updated", "the queue is growing!"], click: ["watching the foot traffic in real time"] },
    q1: { name: "Customer #3", lines: ["is it my turn yet?", "worth the wait"], click: ["I'm in a queue"] },
    q2: { name: "Customer #4", lines: ["the line is moving!", "hi camera!"], click: ["why do I have a box around me?"] },
    q3: { name: "Customer #5", lines: ["I'm ID #5 apparently", "smells like espresso", "those brownies look good"], click: ["tracked, but caffeinated"] },
    q4: { name: "Customer #6", lines: ["double shot please", "5 minutes left?"], click: ["still waiting for my double shot"] },
    q5: { name: "Customer #7", lines: ["what's a bounding box?", "so many cameras"], click: ["smile for the dataset"] },
    q6: { name: "Customer #8", lines: ["back of the line...", "croissant time"], click: ["the line starts back here"] },
    customerA: { name: "Customer #1", lines: ["am I being tracked?", "worth the wait"], click: ["green box = me"] },
    customerB: { name: "Customer #2", lines: ["same ID on every camera!", "nice heatmap"], click: ["I'm ID #2 on all cameras"] },
    analyst: { name: "Security analyst", lines: ["that process looks sus", "LLM, write me a rule", "AST check: passed"], click: ["one more Sigma rule..."] },
    robot: { name: "LLM bot", lines: ["title: Suspicious Process", "detection: selection", "level: high"], click: ["beep. rule generated."] },
    labA: { name: "Phantom maker", lines: ["skin layer next!", "mixing the phantom...", "this one gets a tumor"], click: ["pink = breast tissue phantom"] },
    radar: { name: "Radar person", lines: ["scanning 62–69 GHz...", "beamforming...", "3D volume ready"], click: ["good phantom, holding very still"] },
    labB: { name: "Mouse researcher", lines: ["good mouse", "tumor scan in progress", "time for a scan"], click: ["the sensor is imaging the mouse's tumor"] },
    tech: { name: "MRI tech", lines: ["shimming...", "spin echo acquired", "k-space → FFT!"], click: ["mini MRI, maxi fun"] },
    student: { name: "Grad student", lines: ["GLCM features look good", "SVM vs CNN, round 2", "reviewer 2 again..."], click: ["LaTeX, why"] },
    cat: { name: "Cat", lines: ["meow", "*stretches*", "*sits on keyboard*"], click: ["purr..."] },
    dog: { name: "Dog", lines: ["woof!", "*chases the fastball*", "woof woof"], click: ["good dog"] },
    sam: { name: "Sam", lines: ["slow and steady", "I'll get there", "is it lettuce time?"], click: ["Hi, I'm Sam.", "no rush"] },
    snowgirl: { name: "Snow girl", lines: ["love my scarf", "stay cool, everyone", "please don't aim that ball at me"], click: ["Hi, I'm Snow girl.", "it's a red tartan scarf!"] },
    lady: { name: "Lady", lines: ["what a lovely street", "is that café any good?", "Coco, heel!"], click: ["darling, mind the snow"] },
    pup: { name: "Coco", lines: ["yip!", "*sniffs the snowman*", "yip yip"], click: ["*wags*"] },
    mom: { name: "Mom", lines: ["stay close, sweetie", "brownies after lunch", "look, a snowman!"], click: ["family day out"] },
    kid: { name: "Kid", lines: ["can I have a brownie?", "are we there yet?", "a turtle!"], click: ["hi! I'm five!"] },
    dad: { name: "Dad", lines: ["who's hungry?", "nice cabin", "that line is long"], click: ["just walking the family"] },
    parrot: { name: "Parrot", lines: ["hello world!", "squawk! CUDA!", "pretty bird"], click: ["hello! hello!"] },
    coffee: { name: "Coffee person", lines: ["brb, coffee", "CUDA out of memory??", "is the SLURM queue moving?"], click: ["espresso-driven development"] },
  },
};
