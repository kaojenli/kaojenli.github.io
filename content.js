// All site text lives here. Edit this file to update the portfolio.
const CONTENT = {
  person: {
    name: "Jen Li Kao",
    tagline: "Computer Vision & 3D Reconstruction · Signal Processing & Sensing · Machine Learning & Evaluation",
    now: "AI Engineer @ We Share Baseball",
    email: "kaojenli@gmail.com",
    intro:
      "My research interests are computer vision, sensing and medical devices: recovering 3D human motion from " +
      "multiple cameras, millimeter-wave and radar sensing, imaging systems for medicine from MRI hardware to breast " +
      "cancer detection, and how to evaluate the models behind them.",
    links: [
      { label: "GitHub", url: "https://github.com/Dino-Boooo" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jenlikao/" },
      { label: "Email", url: "mailto:kaojenli@gmail.com" },
    ],
  },

  hero: {
    eyebrow: "AI Engineer · Computer Vision & Sensing",
    caption: "A cabin with a room for each project. Everyone inside is busy with one of them; click anyone to say hi.",
  },
  news: {
    headline: "Now: AI Engineer at We Share Baseball",
    text: "building multi-view 3D pose and multi-camera tracking pipelines for pro baseball.",
    link: { label: "See the project", href: "#project-pitching" },
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

  projectGroups: ["Work", "Research", "Academic"],

  projects: [
    {
      slug: "pitching",
      room: "Practice field",
      cat: "Work",
      title: "Vision-Based Player Motion & Injury-Risk Analysis",
      org: "We Share Baseball",
      date: "Mar 2026 – Present",
      file: "pitching-pose-3d.mov",
      bullets: [
        "Develop computer-vision pipelines for video-based human-motion understanding, including multi-view 3D pose reconstruction from synchronized cameras and temporal feature extraction.",
        "Engineer kinematic motion features from reconstructed pose data to quantify pitching mechanics.",
        "Leverage temporal pose sequences for fine-grained motion classification, supporting injury-risk assessment and return-to-play analysis.",
      ],
      tags: ["Multi-view 3D pose", "Kinematics", "Sequence classification"],
      links: [],
    },
    {
      slug: "tracking",
      room: "Café & hacker room",
      cat: "Work",
      title: "Multi-Camera Customer Tracking & Analytics System",
      org: "We Share Baseball",
      date: "Mar 2026 – Present",
      file: "multicam-tracking.mov",
      bullets: [
        "Built an end-to-end multi-camera perception pipeline for person detection, multi-object tracking, and cross-camera re-identification into consistent global identities over time.",
        "Maintained identities under occlusion and viewpoint change using appearance-embedding matching.",
        "Applied camera calibration and bird's-eye-view mapping to reconstruct multi-agent trajectories and produce spatial heatmaps and zone-level flow analytics.",
        "Designed job-scheduling and resource-allocation logic for concurrent video-analysis jobs, with batch processing and structured data export for downstream analytics.",
      ],
      tags: ["Detection", "Multi-object tracking", "Re-ID", "Camera calibration", "BEV"],
      links: [],
    },
    {
      slug: "sigma",
      room: "Security room",
      cat: "Research",
      title: "Automatic Sigma Rule Generation Using Language and Vision Models",
      org: "Applied Machine Learning Research, Texas A&M",
      date: "May 2025 – May 2026",
      file: "sigma-rules.log",
      bullets: [
        "Developed an end-to-end framework for automated Sigma rule generation by integrating LLM reasoning, AST-based structural parsing, and multimodal security inputs.",
        "Designed a language-to-AST parsing pipeline to evaluate rule consistency, structural complexity (Halstead and Cyclomatic), and syntactic correctness across varied model architectures.",
        "Prototyped a system that interprets heterogeneous security artifacts into machine-interpretable rules, and benchmarked natural-language and AST-guided models on a purpose-built dataset.",
      ],
      tags: ["LLMs", "Multimodal", "AST parsing", "Benchmarking"],
      links: [],
    },
    {
      slug: "mmwave",
      room: "mmWave lab",
      cat: "Research",
      title: "Breast Tumor Detection Using Multi-Channel Millimeter-wave 3D Imaging",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      date: "Sept 2020 – May 2022",
      file: "mmwave-3d.mov",
      bullets: [
        "Developed a breast tumor detection system using millimeter-wave imaging and computer vision techniques to enhance high-resolution, non-invasive cancer imaging.",
        "Designed synthetic 3D phantoms for breast, tumor, and skin-layer phantoms based on referenced studies to simulate real-world imaging conditions.",
        "Conducted 6 experiments to evaluate system performance, including detection depth, minimum tumor size, and multi-angle imaging accuracy to enhance 3D reconstruction quality.",
        "Implemented noise-reduction and beamforming methods to reconstruct enhanced 2D and 3D images and improve overall image quality and spatial resolution.",
        "Ran animal experiments, imaging tumors in mice with the millimeter-wave sensor.",
      ],
      tags: ["mmWave imaging", "Beamforming", "3D reconstruction", "Phantoms", "Mouse study"],
      links: [{ label: "Paper (IEEE Xplore)", url: "https://ieeexplore.ieee.org/document/9945009" }],
    },
    {
      slug: "mri",
      room: "MRI lab",
      cat: "Academic",
      title: "Integrated MRI Hardware and Pulse-Sequence System Using Analog Discovery 2",
      org: "Texas A&M",
      date: "Fall 2024",
      file: "mini-mri.mov",
      bullets: [
        "Built a mini-MRI system using AD2 with RF control, gradient encoding, and Python acquisition.",
        "Calibrated RF and gradient hardware, performed shimming, and acquired optimized spin echoes.",
        "Developed 2D imaging using PR with gradient encoding, k-space sampling, and FFT.",
      ],
      tags: ["MRI", "RF & gradients", "k-space", "FFT"],
      links: [{ label: "GitHub", url: "https://github.com/Dino-Boooo/Instrumentation-and-System-Design-for-Advanced-MRI-Imaging" }],
    },
    {
      slug: "mammo",
      room: "Reading room",
      cat: "Academic",
      title: "Breast Cancer Imaging Classification",
      org: "Texas A&M",
      date: "Fall 2024",
      file: "mammo-classify.mov",
      bullets: [
        "Conducted a comparative study on breast cancer classification using the mammogram dataset.",
        "Built SVM models with GLCM features and compared them with CNN and ResNet-based models.",
        "Applied image preprocessing (normalization, contrast, augmentation) to improve accuracy.",
      ],
      tags: ["GLCM", "SVM", "CNN", "ResNet"],
      links: [{ label: "GitHub", url: "https://github.com/xoumyax/Breast-Cancer-Classification" }],
      image: { src: "assets/mammo-workflow.png", alt: "Workflow: dataset split, preprocessing, GLCM features, normalization, SVM with RBF kernel, cross-validation" },
    },
    {
      slug: "metagenomic",
      room: "Server room",
      cat: "Academic",
      title: "Benchmarking Transformer-Based Metagenomic Functional Profiling",
      org: "Texas A&M",
      date: "Spring 2025",
      file: "metagenomic-bench.log",
      bullets: [
        "Compared alignment-based vs. ML methods for enzyme function prediction.",
        "Accelerated transformer inference with CUDA and benchmarked GPU performance on HPRC clusters.",
      ],
      tags: ["Transformers", "CUDA", "HPRC", "Bioinformatics"],
      links: [{ label: "GitHub", url: "https://github.com/Dino-Boooo/Metagenomic-Functional-Profiling" }],
    },
  ],

  // Newest first. `project` links the row to a project window.
  experience: [
    {
      role: "AI Engineer",
      org: "We Share Baseball",
      place: "Taipei, Taiwan",
      date: "Mar 2026 – Present",
      bullets: ["Vision-based player motion & injury-risk analysis.", "Multi-camera customer tracking & analytics system."],
      project: "pitching",
    },
    {
      role: "Research Co-op",
      org: "Applied Machine Learning Research, Texas A&M",
      place: "College Station, TX",
      date: "May 2025 – May 2026",
      bullets: ["Automatic Sigma rule generation using language and vision models."],
      project: "sigma",
    },
    {
      role: "Research Assistant",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Sept 2020 – May 2022",
      bullets: ["Breast tumor detection using multi-channel millimeter-wave 3D imaging."],
      project: "mmwave",
    },
    {
      role: "Teaching Assistant",
      org: "Data Structure and Algorithm, Dept. CSIE, Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Fall 2021 – Spring 2022",
      bullets: ["Assisted in preparing lecture materials, grading, and counseling students on programming issues."],
    },
    {
      role: "Research Assistant",
      org: "Medical Imaging Processing & Computer Vision Lab, Chang Gung University",
      place: "Taoyuan, Taiwan",
      date: "Jan 2021 – Dec 2021",
      bullets: [
        "Mobile health technology medical device pre-market review trend analysis.",
        "Collected and analyzed pre-market guidelines for mobile medical devices and digital health regulations.",
        "Assisted ASUS and Quanta with pre-market compliance documents and compiled review Q&A.",
      ],
    },
    {
      role: "Intern",
      org: "CYLTEK Ltd.",
      place: "Hsinchu, Taiwan",
      date: "Sept 2020 – Feb 2021",
      bullets: [
        "Developed Python-based real-time signal-processing algorithms using millimeter-wave radar for contactless measurement of chest displacement, heart rate, and respiration.",
        "Ported DSP algorithms to C++ for embedded integration and validated data-acquisition timing and synchronization with hardware engineers, alongside MediaTek and Chang Gung Hospital.",
      ],
    },
  ],

  education: [
    {
      school: "Texas A&M University",
      degree: "MS in Electrical and Computer Engineering",
      place: "College Station, TX",
      date: "Sept 2023 – May 2025",
      notes: [
        "Graduate Merit Scholarship, Dept. of ECE.",
        "Coursework: Digital Image Processing & CV, Pattern Recognition, Data Mining & Analysis, Analysis of Algorithms, MR Engineering, Advanced Ultrasound Imaging Techniques, Bioelectromagnetism, Algorithms in Structural Bioinformatics.",
      ],
    },
    {
      school: "Chang Gung University",
      degree: "MS in Computer Science and Information",
      place: "Taoyuan, Taiwan",
      date: "Jul 2022",
      notes: ["Thesis: Breast Tumor Detection Using Multi-Channel Millimeter-wave 3D Imaging: A Preliminary Study."],
    },
    {
      school: "National Dong Hwa University",
      degree: "BS in Computer Science and Information",
      place: "Hualien, Taiwan",
      date: "Jun 2018",
      notes: [],
    },
  ],

  papers: [
    {
      kind: "Conference paper",
      cite:
        "<b>J.-L. Kao</b> and Y.-P. Chao, “Breast Tumor Detection Using Multi-Channel 62-69 GHz Millimeter-wave 3D Imaging Technology,” " +
        "2022 IEEE 4th Eurasia Conference on Biomedical Engineering, Healthcare and Sustainability (ECBIOS), 2022, pp. 16-19.",
      link: { label: "DOI: 10.1109/ECBIOS54627.2022.9945009", url: "https://ieeexplore.ieee.org/document/9945009" },
    },
    {
      kind: "Talk",
      cite:
        "“Breast Tumor Detection Using Multi-Channel Millimeter-wave 3D Imaging Technology: A Preliminary Study.” " +
        "The 16th Symposium of Medical Imaging and Radiological Sciences (SMIRS), Taoyuan, Taiwan, 22 Oct 2022.",
      badge: "Honorable Mention Award",
    },
  ],

  skills: [
    { name: "Computer Vision", items: "detection, tracking, re-identification, pose estimation, camera calibration" },
    { name: "Time-Series Modeling", items: "temporal feature extraction, sequence classification, radar vital signs" },
    { name: "Sensing Systems", items: "millimeter-wave array imaging, radar sensing, RF and gradient control" },
    { name: "Reconstruction", items: "beamforming, k-space sampling and FFT, 2D and 3D image reconstruction" },
    { name: "Machine Learning", items: "deep learning (CNNs, Transformers), multimodal LLMs, GPU acceleration" },
    { name: "Model Evaluation", items: "benchmark design, cross-model comparison, structural consistency checks" },
  ],
  stack: [
    "Python", "NumPy", "SciPy", "pandas", "OpenCV", "scikit-learn", "PyTorch", "Hugging Face",
    "C/C++", "MATLAB", "CUDA", "Analog Discovery 2 SDK", "Git", "Linux", "SLURM/HPRC",
  ],

  // Speech bubbles. `lines` pop up on their own; `click` when you click the NPC.
  npcs: {
    jen: { name: "Jen", lines: [], click: ["Hi, I'm Jen. Welcome in.", "Every room here is one of my projects.", "Click around, everyone's busy with something."] },
    dancer: { name: "Dancer", lines: ["one more song!", "dance break", "training converged!"], click: ["join me!"] },
    pitcher: { name: "Pitcher", lines: ["keypoints: 17/17", "one more rep!", "fastball incoming"], click: ["relax, my elbow is tracked in 3D"] },
    barista: { name: "Barista", lines: ["one latte, coming up!", "next, please!", "oat milk?"], click: ["this one's on the house"] },
    hacker: { name: "Hacker", lines: ["re-ID: same person on camera 2", "heatmap updated", "the queue is growing!"], click: ["watching the foot traffic in real time"] },
    q1: { name: "Customer #3", lines: ["is it my turn yet?", "worth the wait"], click: ["I'm in a queue"] },
    q2: { name: "Customer #4", lines: ["the line is moving!", "hi camera!"], click: ["why do I have a box around me?"] },
    q3: { name: "Customer #5", lines: ["I'm ID #5 apparently", "smells like espresso"], click: ["tracked, but caffeinated"] },
    q4: { name: "Customer #6", lines: ["double shot please", "5 minutes left?"], click: ["still waiting for my double shot"] },
    q5: { name: "Customer #7", lines: ["what's a bounding box?", "so many cameras"], click: ["smile for the dataset"] },
    q6: { name: "Customer #8", lines: ["back of the line...", "croissant time"], click: ["the line starts back here"] },
    customerA: { name: "Customer #1", lines: ["this table is mine", "am I being tracked?"], click: ["green box = me"] },
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
    parrot: { name: "Parrot", lines: ["hello world!", "squawk! CUDA!", "pretty bird"], click: ["hello! hello!"] },
    coffee: { name: "Coffee person", lines: ["brb, coffee", "CUDA out of memory??", "is the SLURM queue moving?"], click: ["espresso-driven development"] },
  },
};
