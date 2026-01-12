// Adaptive debounce - adjusts delay based on last conversion time
let lastConversionTime = 50; // Start with reasonable default
const MIN_DEBOUNCE = 20;     // Minimum debounce delay
const DEBOUNCE_BUFFER = 10;  // Extra buffer on top of conversion time

function adaptiveDebounce(fn) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        const delay = Math.max(MIN_DEBOUNCE, lastConversionTime + DEBOUNCE_BUFFER);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Character sets
const CHAR_SETS = {
    standard: '@%#+=*-:. ',
    detailed: '$@B%8&WM#oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~*<>i!lI;:,"^`\'. ',
    blocks: '█▓▒░ ',
    simple: '#. ',
    single: '█'
};

// Edge detection characters by direction
const EDGE_CHARS = {
    horizontal: '-',
    vertical: '|',
    diag1: '/',
    diag2: '\\',
    corner: '+',
    none: ' '
};

// Auto-fit font size bounds
const AUTO_FIT_FONT_MIN = 4;
const AUTO_FIT_FONT_MAX = 48;

// Default settings preset
const DEFAULT_SETTINGS = {
    // Display
    outputBackground: 'dark',
    charsPerRow: 100,
    fontSize: 10,
    autoFitFontSize: false,
    autoRatio: true,
    charRatio: 0.5,
    // Character Set
    charSetPreset: 'standard',
    customChars: '@%#+=*-:. ',
    // Output
    colorMode: 'truecolor',
    invertBrightness: true,
    histogramEq: true,
    contrast: 100,
    brightnessBlend: 50,
    saturation: 100,
    opacity: 100,
    brightnessAsOpacity: false,
    monoFg: '#f0f0f0',
    monoBg: '#0d0d0d'
};

// Built-in settings presets
const SETTINGS_PRESETS = {
    'default': {
        name: 'Default',
        settings: { ...DEFAULT_SETTINGS, autoFitFontSize: true }
    },
    'high-detail': {
        name: 'High Detail',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charsPerRow: 150,
            charSetPreset: 'detailed',
            customChars: '$@B%8&WM#oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~*<>i!lI;:,"^`\'. ',
            colorMode: 'truecolor'
        }
    },
    'retro-terminal': {
        name: 'Retro Terminal',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charSetPreset: 'simple',
            customChars: '#. ',
            colorMode: 'monochrome',
            monoFg: '#33ff33',
            monoBg: '#0a0a0a',
            invertBrightness: true
        }
    },
    'classic-ascii': {
        name: 'Classic ASCII',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            colorMode: 'monochrome',
            monoFg: '#ffffff',
            monoBg: '#000000'
        }
    },
    'print-friendly': {
        name: 'Print Friendly',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            outputBackground: 'light',
            colorMode: 'monochrome',
            invertBrightness: false,
            monoFg: '#000000',
            monoBg: '#ffffff'
        }
    },
    'colorful': {
        name: 'Colorful',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            colorMode: 'truecolor',
            saturation: 150,
            contrast: 120
        }
    },
    'limited-palette': {
        name: 'Limited Palette (16)',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            colorMode: 'adaptive16',
            contrast: 110
        }
    },
    'grayscale': {
        name: 'Grayscale',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            colorMode: 'adaptive16',
            saturation: 0
        }
    },
    'blocks': {
        name: 'Blocks',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charSetPreset: 'blocks',
            customChars: '█▓▒░ ',
            colorMode: 'truecolor'
        }
    },
    'blocks-grayscale': {
        name: 'Blocks Grayscale',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charSetPreset: 'blocks',
            customChars: '█▓▒░ ',
            colorMode: 'adaptive16',
            saturation: 0
        }
    },
    'opacity-color': {
        name: 'Opacity (Color)',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charSetPreset: 'single',
            customChars: '█',
            colorMode: 'truecolor',
            brightnessAsOpacity: true
        }
    },
    'opacity-grayscale': {
        name: 'Opacity (Grayscale)',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            charSetPreset: 'single',
            customChars: '█',
            colorMode: 'adaptive16',
            saturation: 0,
            brightnessAsOpacity: true
        }
    },
    'transparent-overlay': {
        name: 'Transparent Overlay',
        settings: {
            ...DEFAULT_SETTINGS,
            autoFitFontSize: true,
            opacity: 60,
            colorMode: 'truecolor'
        }
    }
};

// Measure visual brightness of a character (0 = black/dense, 1 = white/empty)
function measureCharBrightness(char, fontFamilyValue) {
    const size = 24;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Draw character in black
    ctx.fillStyle = 'black';
    ctx.font = `${size}px ${fontFamilyValue}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(char, size / 2, 0);

    // Calculate average brightness (white pixels = 255, black = 0)
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    let total = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        total += pixels[i]; // Red channel (grayscale)
    }
    // Return 0-1 where 0 = dense/dark character, 1 = empty/light character
    return total / (size * size * 255);
}

// Sort characters by brightness and optionally reduce to N chars
function sortAndOptimizeChars(chars, reduceCount, fontFamilyValue) {
    // Remove duplicates while preserving order
    const uniqueChars = [...new Set(chars.split(''))];

    // Check if space is included
    const hasSpace = uniqueChars.includes(' ');
    const charsToMeasure = uniqueChars.filter(c => c !== ' ');

    // Measure brightness for each character
    const measured = charsToMeasure.map(char => ({
        char,
        brightness: measureCharBrightness(char, fontFamilyValue)
    }));

    // Sort by brightness (dark to light)
    measured.sort((a, b) => a.brightness - b.brightness);

    let result = measured;

    // Reduce to N chars if specified (and > 0)
    if (reduceCount > 0 && reduceCount < measured.length) {
        // Select characters at evenly-spaced brightness intervals
        const reduced = [];
        for (let i = 0; i < reduceCount; i++) {
            // Map i to index in sorted array
            const index = Math.round(i * (measured.length - 1) / (reduceCount - 1));
            reduced.push(measured[index]);
        }
        result = reduced;
    }

    // Build result string, add space at end if it was present
    let resultStr = result.map(m => m.char).join('');
    if (hasSpace) {
        resultStr += ' ';
    }

    return resultStr;
}

// ANSI 256 color palette (standard xterm colors)
const ANSI_256 = (function() {
    const colors = [];
    // Standard colors (0-15)
    const standard = [
        [0,0,0], [128,0,0], [0,128,0], [128,128,0],
        [0,0,128], [128,0,128], [0,128,128], [192,192,192],
        [128,128,128], [255,0,0], [0,255,0], [255,255,0],
        [0,0,255], [255,0,255], [0,255,255], [255,255,255]
    ];
    colors.push(...standard);
    // 216 color cube (16-231)
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
                colors.push([r ? r * 40 + 55 : 0, g ? g * 40 + 55 : 0, b ? b * 40 + 55 : 0]);
            }
        }
    }
    // Grayscale (232-255)
    for (let i = 0; i < 24; i++) {
        const v = i * 10 + 8;
        colors.push([v, v, v]);
    }
    return colors;
})();

// Median cut color quantization
function quantizeColors(pixels, numColors, saturation = 1) {
    // Collect unique colors (sample for performance)
    const colorMap = new Map();
    const step = Math.max(1, Math.floor(pixels.length / 4 / 10000)); // Sample max ~10k pixels
    for (let i = 0; i < pixels.length; i += 4 * step) {
        let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

        // Apply saturation before quantization (for grayscale palettes)
        if (saturation < 1) {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            r = Math.round(gray + saturation * (r - gray));
            g = Math.round(gray + saturation * (g - gray));
            b = Math.round(gray + saturation * (b - gray));
        }

        const key = (r << 16) | (g << 8) | b;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Convert to array of [r, g, b, count]
    let colorList = [];
    for (const [key, count] of colorMap) {
        colorList.push([
            (key >> 16) & 0xff,
            (key >> 8) & 0xff,
            key & 0xff,
            count
        ]);
    }

    if (colorList.length <= numColors) {
        return colorList.map(c => [c[0], c[1], c[2]]);
    }

    // Median cut algorithm
    function getRange(colors, channel) {
        let min = 255, max = 0;
        for (const c of colors) {
            if (c[channel] < min) min = c[channel];
            if (c[channel] > max) max = c[channel];
        }
        return max - min;
    }

    function medianCut(colors, depth) {
        if (depth === 0 || colors.length <= 1) {
            // Average the colors in this bucket
            let tr = 0, tg = 0, tb = 0, tw = 0;
            for (const c of colors) {
                tr += c[0] * c[3];
                tg += c[1] * c[3];
                tb += c[2] * c[3];
                tw += c[3];
            }
            if (tw === 0) return [];
            return [[Math.round(tr / tw), Math.round(tg / tw), Math.round(tb / tw)]];
        }

        // Find channel with largest range
        const ranges = [getRange(colors, 0), getRange(colors, 1), getRange(colors, 2)];
        const channel = ranges.indexOf(Math.max(...ranges));

        // Sort by that channel
        colors.sort((a, b) => a[channel] - b[channel]);

        // Split at median
        const mid = Math.floor(colors.length / 2);
        return [
            ...medianCut(colors.slice(0, mid), depth - 1),
            ...medianCut(colors.slice(mid), depth - 1)
        ];
    }

    const depth = Math.ceil(Math.log2(numColors));
    return medianCut(colorList, depth).slice(0, numColors);
}

// Find nearest color in palette
function nearestColor(r, g, b, palette) {
    let minDist = Infinity;
    let nearest = palette[0];
    for (const c of palette) {
        const dr = r - c[0], dg = g - c[1], db = b - c[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
            minDist = dist;
            nearest = c;
        }
    }
    return nearest;
}

// State
let currentImage = null;
let cachedCharRatio = null;
let cachedPalette = null;
let lastColoredHtml = '';

// Web Worker for off-thread processing
let asciiWorker = null;
let workerBusy = false;
let pendingConversion = false;

// Initialize worker
try {
    asciiWorker = new Worker('ascii-worker.js');
    asciiWorker.onmessage = handleWorkerMessage;
    asciiWorker.onerror = (e) => {
        console.warn('Worker error, falling back to main thread:', e);
        asciiWorker = null;
    };
} catch (e) {
    console.warn('Workers not supported, using main thread');
}

// Video state
let currentVideo = null;
let isVideoMode = false;
let isVideoPlaying = false;
let videoAnimationId = null;
let lastFrameTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;
let currentFps = 0;

// Webcam state
let webcamStream = null;
let isWebcamActive = false;
let webcamAnimationId = null;

// Reusable video frame extraction objects
let videoFrameCanvas = null;
let videoFrameCtx = null;

// Reusable canvas for image scaling (optimization #3)
let scalingCanvas = null;
let scalingCtx = null;

// GIF recording state
let isRecordingGif = false;
let gifFrames = [];
let gifStartTime = 0;
const GIF_MAX_DURATION = 10000; // 10 seconds max
const GIF_FRAME_INTERVAL = 100; // 10 FPS for GIF

// Video recording state (MediaRecorder)
let isRecordingVideo = false;
let mediaRecorder = null;
let videoChunks = [];
let videoStartTime = 0;
let videoMaxDuration = 30000; // configurable via modal

// Video recording settings (from modal)
let videoSettings = {
    format: 'webm-vp9',
    quality: 'medium',
    framerate: 30,
    duration: 30
};

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropzoneContextMenu = document.getElementById('dropzone-context-menu');
const contextPasteBtn = document.getElementById('context-paste');
const contextBrowseBtn = document.getElementById('context-browse');
const imagePreview = document.getElementById('image-preview');
const videoPreview = document.getElementById('video-preview');
const videoControls = document.getElementById('video-controls');
const videoPlayBtn = document.getElementById('video-play-btn');
const videoPauseBtn = document.getElementById('video-pause-btn');
const videoStopBtn = document.getElementById('video-stop-btn');
const videoSeek = document.getElementById('video-seek');
const videoTime = document.getElementById('video-time');
const videoFps = document.getElementById('video-fps');
const videoLoop = document.getElementById('video-loop');
const noPreview = document.getElementById('no-preview');

// Webcam elements
const webcamStartBtn = document.getElementById('webcam-start-btn');
const webcamStopBtn = document.getElementById('webcam-stop-btn');
const webcamControls = document.getElementById('webcam-controls');
const webcamSelect = document.getElementById('webcam-select');
const webcamMirror = document.getElementById('webcam-mirror');
const charsPerRow = document.getElementById('chars-per-row');
const charsValue = document.getElementById('chars-value');
const asciiOutput = document.getElementById('ascii-output');
const asciiCanvas = document.getElementById('ascii-canvas');
const asciiCanvasCtx = asciiCanvas.getContext('2d', { alpha: false });
const outputInfo = document.getElementById('output-info');
const placeholder = document.getElementById('placeholder');
const copyTextBtn = document.getElementById('copy-text-btn');
const copyHtmlBtn = document.getElementById('copy-html-btn');
const copyMarkdownBtn = document.getElementById('copy-markdown-btn');
const downloadPngBtn = document.getElementById('download-png-btn');
const sharePngBtn = document.getElementById('share-png-btn');
const gifExportControls = document.getElementById('gif-export-controls');
const downloadGifBtn = document.getElementById('download-gif-btn');
const downloadVideoBtn = document.getElementById('download-video-btn');
const gifStatus = document.getElementById('gif-status');
const settingsPreset = document.getElementById('settings-preset');
const saveSettingsPresetBtn = document.getElementById('save-settings-preset-btn');
const deleteSettingsPresetBtn = document.getElementById('delete-settings-preset-btn');
const toast = document.getElementById('toast');

// Video settings modal elements
const videoSettingsModal = document.getElementById('video-settings-modal');
const modalClose = document.getElementById('modal-close');
const modalCloseSave = document.getElementById('modal-close-save');
const videoPreferencesBtn = document.getElementById('video-preferences-btn');
const videoFormatSelect = document.getElementById('video-format');
const videoQualitySelect = document.getElementById('video-quality');
const videoFramerateSelect = document.getElementById('video-framerate');
const videoDurationSelect = document.getElementById('video-duration');

// Display settings
const outputBackground = document.getElementById('output-background');
const fontFamily = document.getElementById('font-family');
const fontSize = document.getElementById('font-size');
const fontSizeValue = document.getElementById('font-size-value');
const autoFitFont = document.getElementById('auto-fit-font');
const charRatio = document.getElementById('char-ratio');
const charRatioValue = document.getElementById('char-ratio-value');
const autoRatio = document.getElementById('auto-ratio');

// Character set settings
const charSet = document.getElementById('char-set');
const charSetCustomGroup = document.getElementById('char-set-custom-group');
const customChars = document.getElementById('custom-chars');
const sortCharsBtn = document.getElementById('sort-chars-btn');
const reduceCount = document.getElementById('reduce-count');
const saveCharsBtn = document.getElementById('save-chars-btn');
const deleteCharsBtn = document.getElementById('delete-chars-btn');

// Output settings (global)
const invertBrightness = document.getElementById('invert-brightness');
const contrastAmount = document.getElementById('contrast-amount');
const contrastAmountValue = document.getElementById('contrast-amount-value');
const contrastHistogram = document.getElementById('contrast-histogram');
const colorMode = document.getElementById('color-mode');
const colorSliders = document.querySelectorAll('.color-slider');
const brightnessBlend = document.getElementById('brightness-blend');
const brightnessBlendValue = document.getElementById('brightness-blend-value');
const colorSaturation = document.getElementById('color-saturation');
const colorSaturationValue = document.getElementById('color-saturation-value');
const globalOpacity = document.getElementById('global-opacity');
const globalOpacityValue = document.getElementById('global-opacity-value');
const brightnessOpacity = document.getElementById('brightness-opacity');
const monoSettings = document.querySelector('.mono-settings');
const monoFg = document.getElementById('mono-fg');
const monoBg = document.getElementById('mono-bg');

// Font detection
const CANDIDATE_FONTS = [
    { name: 'Courier New', value: "'Courier New', Courier, monospace" },
    { name: 'Consolas', value: "'Consolas', monospace" },
    { name: 'Monaco', value: "'Monaco', monospace" },
    { name: 'Menlo', value: "'Menlo', monospace" },
    { name: 'Liberation Mono', value: "'Liberation Mono', monospace" },
    { name: 'Lucida Console', value: "'Lucida Console', monospace" },
    { name: 'DejaVu Sans Mono', value: "'DejaVu Sans Mono', monospace" },
    { name: 'Fira Code', value: "'Fira Code', monospace" },
    { name: 'Source Code Pro', value: "'Source Code Pro', monospace" },
    { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { name: 'Roboto Mono', value: "'Roboto Mono', monospace" },
    { name: 'Ubuntu Mono', value: "'Ubuntu Mono', monospace" },
    { name: 'SF Mono', value: "'SF Mono', monospace" },
    { name: 'Cascadia Code', value: "'Cascadia Code', monospace" },
    { name: 'Hack', value: "'Hack', monospace" },
    { name: 'Inconsolata', value: "'Inconsolata', monospace" },
    { name: 'Droid Sans Mono', value: "'Droid Sans Mono', monospace" },
    { name: 'PT Mono', value: "'PT Mono', monospace" },
    { name: 'Andale Mono', value: "'Andale Mono', monospace" },
    { name: 'OCR A Extended', value: "'OCR A Extended', monospace" },
];

function isFontAvailable(fontName) {
    // Create test elements
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = testSize;
    span.style.lineHeight = 'normal';
    span.textContent = testString;
    document.body.appendChild(span);

    // Get baseline widths
    const baseWidths = {};
    for (const baseFont of baseFonts) {
        span.style.fontFamily = baseFont;
        baseWidths[baseFont] = span.offsetWidth;
    }

    // Test the candidate font
    let detected = false;
    for (const baseFont of baseFonts) {
        span.style.fontFamily = `'${fontName}', ${baseFont}`;
        if (span.offsetWidth !== baseWidths[baseFont]) {
            detected = true;
            break;
        }
    }

    document.body.removeChild(span);
    return detected;
}

function populateFontSelector() {
    const availableFonts = CANDIDATE_FONTS.filter(f => isFontAvailable(f.name));

    // System monospace as default (first option)
    const allFonts = [
        { name: 'System Monospace', value: 'monospace' },
        ...availableFonts
    ];

    fontFamily.innerHTML = '';
    for (const font of allFonts) {
        const option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.name;
        fontFamily.appendChild(option);
    }
}

// Output background handling
function applyOutputBackground(bg) {
    const asciiContainer = asciiOutput.parentElement;
    if (asciiContainer) {
        asciiContainer.classList.remove('bg-dark', 'bg-light');
        asciiContainer.classList.add(`bg-${bg}`);
    }
    localStorage.setItem('ascii-output-background', bg);
    updateInvertDefaults();
    updateMonoColors();
}

function isDarkMode() {
    return outputBackground.value === 'dark';
}

function updateInvertDefaults() {
    const shouldInvert = isDarkMode();
    invertBrightness.checked = shouldInvert;
}

// Initialize
function init() {
    // Load saved output background or default to dark
    const savedBg = localStorage.getItem('ascii-output-background') || 'dark';
    outputBackground.value = savedBg;
    applyOutputBackground(savedBg);

    populateFontSelector();
    populateSettingsPresetDropdown();

    // Apply default preset settings on page load
    applySettings(SETTINGS_PRESETS['default'].settings, true);

    setupEventListeners();
    setupSectionToggles();
    updateDisplaySettings();
    updateCharRatio();
    updateMonoColors();
    initColorModeVisibility();
    initSliderValues();
    loadSavedChars();
    updateSettingsDeleteButtonVisibility();
    charRatio.disabled = autoRatio.checked;

    // Show share button if Web Share API with file support is available
    if (navigator.canShare && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })) {
        sharePngBtn.style.display = '';
    }

    // Setup mobile UI
    setupMobileUI();

    // Auto-load default image
    loadDefaultImage();
}

// Mobile UI handling
function setupMobileUI() {
    const mobileToolbarBtns = document.querySelectorAll('.mobile-toolbar-btn');
    const mobilePreset = document.getElementById('mobile-preset');
    const mobilePanelOverlay = document.getElementById('mobile-panel-overlay');
    const mobilePanelClose = document.getElementById('mobile-panel-close');
    const controls = document.querySelector('.controls');

    // Sync mobile preset with main preset dropdown
    function syncMobilePreset() {
        if (!mobilePreset) return;
        mobilePreset.innerHTML = settingsPreset.innerHTML;
        mobilePreset.value = settingsPreset.value;
    }

    // Initial sync
    syncMobilePreset();

    // Watch for changes to main preset and sync
    settingsPreset.addEventListener('change', syncMobilePreset);

    // Mobile preset change handler
    if (mobilePreset) {
        mobilePreset.addEventListener('change', () => {
            settingsPreset.value = mobilePreset.value;
            handleSettingsPresetChange();
            syncMobilePreset();
        });
    }

    // Open panel when toolbar button clicked
    mobileToolbarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.dataset.panel;
            openMobilePanel(panelId);
        });
    });

    // Close panel handlers
    if (mobilePanelOverlay) {
        mobilePanelOverlay.addEventListener('click', closeMobilePanel);
    }
    if (mobilePanelClose) {
        mobilePanelClose.addEventListener('click', closeMobilePanel);
    }

    function openMobilePanel(panelId) {
        // Remove active from all sections
        document.querySelectorAll('.control-section').forEach(s => {
            s.classList.remove('mobile-active');
        });

        // Find and activate the target section
        const targetSection = document.querySelector(`.control-section[data-section="${panelId}"]`);
        if (targetSection) {
            targetSection.classList.add('mobile-active');
        }

        // Show the controls panel
        if (controls) {
            controls.classList.add('mobile-panel-open');
        }
        if (mobilePanelClose) {
            mobilePanelClose.classList.add('visible');
        }

        // Highlight active toolbar button
        mobileToolbarBtns.forEach(b => b.classList.remove('active'));
        document.querySelector(`.mobile-toolbar-btn[data-panel="${panelId}"]`)?.classList.add('active');
    }

    function closeMobilePanel() {
        if (controls) {
            controls.classList.remove('mobile-panel-open');
        }
        if (mobilePanelClose) {
            mobilePanelClose.classList.remove('visible');
        }
        document.querySelectorAll('.control-section').forEach(s => {
            s.classList.remove('mobile-active');
        });
        mobileToolbarBtns.forEach(b => b.classList.remove('active'));
    }

    // Close panel on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && controls?.classList.contains('mobile-panel-open')) {
            closeMobilePanel();
        }
    });

    // Close panel when tapping outside (on mobile)
    document.addEventListener('click', (e) => {
        if (!controls?.classList.contains('mobile-panel-open')) return;

        // Check if click is outside the controls panel and not on toolbar buttons
        const isOutsideControls = !controls.contains(e.target);
        const isToolbarBtn = e.target.closest('.mobile-toolbar-btn');

        if (isOutsideControls && !isToolbarBtn) {
            closeMobilePanel();
        }
    });
}

function setupSectionToggles() {
    const sections = document.querySelectorAll('.control-section[data-section]');
    const savedStates = JSON.parse(localStorage.getItem('ascii-sections') || '{}');

    sections.forEach(section => {
        const name = section.dataset.section;
        const h3 = section.querySelector('h3');

        // Restore collapsed state
        if (savedStates[name]) {
            section.classList.add('collapsed');
        }

        // Add click handler
        h3.addEventListener('click', () => {
            section.classList.toggle('collapsed');
            // Save state
            const states = JSON.parse(localStorage.getItem('ascii-sections') || '{}');
            states[name] = section.classList.contains('collapsed');
            localStorage.setItem('ascii-sections', JSON.stringify(states));
        });
    });
}

function updateMonoColors() {
    const dark = isDarkMode();
    monoFg.value = dark ? '#f0f0f0' : '#000000';
    monoBg.value = dark ? '#0d0d0d' : '#ffffff';
}

function initColorModeVisibility() {
    const isMono = colorMode.value === 'monochrome';
    monoSettings.style.display = isMono ? 'block' : 'none';
    colorSliders.forEach(el => el.classList.toggle('disabled', isMono));
}

function initSliderValues() {
    // Initialize all slider value displays from actual slider values
    fontSizeValue.textContent = fontSize.value;
    charsValue.textContent = charsPerRow.value;
    charRatioValue.textContent = charRatio.value;
    contrastAmountValue.textContent = contrastAmount.value;
    brightnessBlendValue.textContent = brightnessBlend.value;
    colorSaturationValue.textContent = colorSaturation.value;
    globalOpacityValue.textContent = globalOpacity.value;
}

// Character set preset management
function getCustomPresets() {
    return JSON.parse(localStorage.getItem('ascii-custom-presets') || '{}');
}

function saveCustomPreset(name, chars) {
    const presets = getCustomPresets();
    presets[name] = chars;
    localStorage.setItem('ascii-custom-presets', JSON.stringify(presets));
}

function deleteCustomPreset(name) {
    const presets = getCustomPresets();
    delete presets[name];
    localStorage.setItem('ascii-custom-presets', JSON.stringify(presets));
}

function populateCustomPresets() {
    const presets = getCustomPresets();
    const names = Object.keys(presets).sort();

    // Populate char set dropdown
    charSetCustomGroup.innerHTML = '';
    for (const name of names) {
        const option = document.createElement('option');
        option.value = 'custom:' + name;
        option.textContent = name;
        charSetCustomGroup.appendChild(option);
    }
}

function isCustomPreset(value) {
    return value && value.startsWith('custom:');
}

function getPresetName(value) {
    return value.replace('custom:', '');
}

function updateDeleteButtonVisibility() {
    deleteCharsBtn.style.display = isCustomPreset(charSet.value) ? 'inline-block' : 'none';
}

function handleSavePreset(charsInput, selectEl) {
    const chars = charsInput.value.trim();
    if (!chars) {
        showToast('No characters to save');
        return;
    }

    const name = prompt('Enter a name for this character set:');
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();
    if (CHAR_SETS[trimmedName.toLowerCase()]) {
        showToast('Cannot use a built-in preset name');
        return;
    }

    saveCustomPreset(trimmedName, chars);
    populateCustomPresets();
    selectEl.value = 'custom:' + trimmedName;
    updateDeleteButtonVisibility();
    showToast('Preset saved: ' + trimmedName);
}

function handleDeletePreset(selectEl, charsInput) {
    const value = selectEl.value;
    if (!isCustomPreset(value)) return;

    const name = getPresetName(value);
    if (!confirm('Delete preset "' + name + '"?')) return;

    deleteCustomPreset(name);
    populateCustomPresets();
    selectEl.value = 'standard';
    charsInput.value = CHAR_SETS.standard;
    updateDeleteButtonVisibility();
    showToast('Preset deleted');
    if (currentImage) convertToAscii();
}

function handlePresetChange(selectEl, charsInput) {
    const value = selectEl.value;
    let chars;
    if (isCustomPreset(value)) {
        // Custom presets: use as-saved (user's intentional order)
        const name = getPresetName(value);
        const presets = getCustomPresets();
        chars = presets[name] || CHAR_SETS.standard;
    } else {
        // Built-in presets: auto-sort for current font
        const baseChars = CHAR_SETS[value] || CHAR_SETS.standard;
        chars = sortAndOptimizeChars(baseChars, 0, fontFamily.value);
    }
    charsInput.value = chars;
    updateDeleteButtonVisibility();
    if (currentImage) convertToAscii();
}

// Legacy character persistence (for backwards compatibility)
function loadSavedChars() {
    const savedCustom = localStorage.getItem('ascii-custom-chars');
    if (savedCustom) customChars.value = savedCustom;
    populateCustomPresets();
    updateDeleteButtonVisibility();
}

// Debounced conversion for smooth slider dragging (adaptive delay)
const debouncedConvert = adaptiveDebounce(() => {
    if (currentImage) convertToAscii();
});

function setupEventListeners() {
    // Drop zone
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Global paste handler for images and URLs
    document.addEventListener('paste', handlePaste);

    // Custom context menu for dropzone
    dropZone.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        dropzoneContextMenu.style.left = e.clientX + 'px';
        dropzoneContextMenu.style.top = e.clientY + 'px';
        dropzoneContextMenu.classList.add('show');
    });

    contextPasteBtn.addEventListener('click', async () => {
        dropzoneContextMenu.classList.remove('show');
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                // Check for image types
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    loadImageFile(blob);
                    return;
                }
                // Check for text (URL)
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    const text = await blob.text();
                    const trimmed = text.trim();
                    if (trimmed.match(/^https?:\/\/.+/i) && trimmed.length < 500) {
                        if (trimmed.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) {
                            loadVideo(trimmed);
                        } else {
                            loadImage(trimmed);
                        }
                        return;
                    }
                }
            }
            showToast('No image or URL in clipboard');
        } catch (err) {
            showToast('Cannot access clipboard. Use Ctrl+V instead.');
        }
    });

    contextBrowseBtn.addEventListener('click', () => {
        dropzoneContextMenu.classList.remove('show');
        fileInput.click();
    });

    // Close context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!dropzoneContextMenu.contains(e.target)) {
            dropzoneContextMenu.classList.remove('show');
        }
    });

    // Video controls
    videoPlayBtn.addEventListener('click', playVideo);
    videoPauseBtn.addEventListener('click', pauseVideo);
    videoStopBtn.addEventListener('click', () => {
        stopVideo();
        // Keep video mode but stop playback and seek to start
        if (videoPreview.src) {
            isVideoMode = true;
            currentVideo = videoPreview;
            videoControls.style.display = 'block';
            videoPreview.style.display = 'block';
            gifExportControls.style.display = 'flex';
            videoPreview.currentTime = 0;
            updateVideoTime();
        }
    });
    videoSeek.addEventListener('input', () => {
        seekVideo(parseInt(videoSeek.value));
    });
    videoPreview.addEventListener('ended', () => {
        if (videoLoop.checked) {
            // Loop: restart from beginning
            currentVideo.currentTime = 0;
            videoSeek.value = 0;
            updateVideoTime();
        } else {
            pauseVideo();
            videoSeek.value = videoSeek.max;
            updateVideoTime();
        }
    });
    videoLoop.addEventListener('change', () => {
        if (currentVideo) {
            currentVideo.loop = videoLoop.checked;
        }
    });

    // Webcam controls
    webcamStartBtn.addEventListener('click', startWebcam);
    webcamStopBtn.addEventListener('click', stopWebcam);
    webcamSelect.addEventListener('change', () => {
        if (isWebcamActive) {
            switchCamera(webcamSelect.value);
        }
    });
    webcamMirror.addEventListener('change', updateWebcamMirror);

    // Click on ASCII output to toggle play/pause for video/webcam
    const asciiContainer = asciiOutput.parentElement;
    asciiContainer.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons or controls inside
        if (e.target.closest('button') || e.target.closest('a')) return;

        // Ignore clicks that happen right after closing a modal (prevents ghost clicks on mobile)
        if (Date.now() - modalCloseTime < 300) return;

        if (isWebcamActive) {
            // Toggle webcam pause/resume
            if (webcamAnimationId) {
                // Pause webcam
                cancelAnimationFrame(webcamAnimationId);
                webcamAnimationId = null;
                videoFps.textContent = 'Paused';
            } else {
                // Resume webcam
                webcamAnimationId = requestAnimationFrame(webcamCaptureLoop);
            }
        } else if (isVideoPlaying) {
            pauseVideo();
        } else if (isVideoMode && currentVideo) {
            playVideo();
        }
    });

    downloadGifBtn.addEventListener('click', () => {
        if (isRecordingGif) {
            stopGifRecording(true);
        } else {
            startGifRecording();
        }
    });
    downloadVideoBtn.addEventListener('click', () => {
        if (isRecordingVideo) {
            stopVideoRecording();
        } else {
            startVideoRecording();
        }
    });

    // Video preferences button
    videoPreferencesBtn.addEventListener('click', showVideoSettingsModal);

    // Video settings modal handlers
    modalClose.addEventListener('click', hideVideoSettingsModal);
    modalCloseSave.addEventListener('click', () => {
        // Save settings from modal
        videoSettings.format = videoFormatSelect.value;
        videoSettings.quality = videoQualitySelect.value;
        videoSettings.framerate = parseInt(videoFramerateSelect.value);
        videoSettings.duration = parseInt(videoDurationSelect.value);
        videoMaxDuration = videoSettings.duration * 1000;

        hideVideoSettingsModal();
    });
    videoSettingsModal.addEventListener('click', (e) => {
        // Close on overlay click
        if (e.target === videoSettingsModal) {
            hideVideoSettingsModal();
        }
    });

    // Display settings
    outputBackground.addEventListener('change', () => {
        applyOutputBackground(outputBackground.value);
        if (currentImage) convertToAscii();
    });

    fontFamily.addEventListener('change', () => {
        updateDisplaySettings();
        updateCharRatio();
        if (currentImage) convertToAscii();
    });

    fontSize.addEventListener('input', () => {
        // Disable auto-fit when user manually drags the slider
        if (autoFitFont.checked) {
            autoFitFont.checked = false;
        }
        fontSizeValue.textContent = fontSize.value;
        updateDisplaySettings();
        updateCharRatio();
        debouncedConvert();
    });

    // Auto-fit font size checkbox
    autoFitFont.addEventListener('change', () => {
        if (autoFitFont.checked) {
            calculateAutoFitFontSize();
        }
    });

    charRatio.addEventListener('input', () => {
        charRatioValue.textContent = charRatio.value;
        if (!autoRatio.checked) debouncedConvert();
    });

    autoRatio.addEventListener('change', () => {
        charRatio.disabled = autoRatio.checked;
        if (autoRatio.checked) {
            updateCharRatio();
            if (currentImage) convertToAscii();
        }
    });

    // Conversion settings
    charsPerRow.addEventListener('input', () => {
        charsValue.textContent = charsPerRow.value;
        debouncedConvert();
    });

    // Character set settings
    charSet.addEventListener('change', () => handlePresetChange(charSet, customChars));
    customChars.addEventListener('input', () => { if (currentImage) convertToAscii(); });
    sortCharsBtn.addEventListener('click', () => {
        const count = parseInt(reduceCount.value) || 0;
        customChars.value = sortAndOptimizeChars(customChars.value, count, fontFamily.value);
        if (currentImage) convertToAscii();
    });
    saveCharsBtn.addEventListener('click', () => handleSavePreset(customChars, charSet));
    deleteCharsBtn.addEventListener('click', () => handleDeletePreset(charSet, customChars));

    // Output settings (global)
    invertBrightness.addEventListener('change', () => { if (currentImage) convertToAscii(); });
    contrastAmount.addEventListener('input', () => {
        contrastAmountValue.textContent = contrastAmount.value;
        debouncedConvert();
    });
    contrastHistogram.addEventListener('change', () => { if (currentImage) convertToAscii(); });
    colorMode.addEventListener('change', () => {
        const isMono = colorMode.value === 'monochrome';
        monoSettings.style.display = isMono ? 'block' : 'none';
        colorSliders.forEach(el => el.classList.toggle('disabled', isMono));
        cachedPalette = null; // Clear palette cache
        if (currentImage) convertToAscii();
    });
    brightnessBlend.addEventListener('input', () => {
        brightnessBlendValue.textContent = brightnessBlend.value;
        debouncedConvert();
    });
    colorSaturation.addEventListener('input', () => {
        colorSaturationValue.textContent = colorSaturation.value;
        debouncedConvert();
    });
    globalOpacity.addEventListener('input', () => {
        globalOpacityValue.textContent = globalOpacity.value;
        debouncedConvert();
    });
    brightnessOpacity.addEventListener('change', () => {
        if (currentImage) convertToAscii();
    });
    monoFg.addEventListener('input', debouncedConvert);
    monoBg.addEventListener('input', debouncedConvert);

    // Copy buttons
    copyTextBtn.addEventListener('click', copyAsText);
    copyHtmlBtn.addEventListener('click', copyAsHtml);
    copyMarkdownBtn.addEventListener('click', copyAsMarkdown);
    downloadPngBtn.addEventListener('click', downloadAsPng);
    sharePngBtn.addEventListener('click', shareAsPng);

    // Settings presets
    settingsPreset.addEventListener('change', handleSettingsPresetChange);
    saveSettingsPresetBtn.addEventListener('click', () => {
        const name = prompt('Enter a name for this preset:');
        if (name && name.trim()) {
            saveCurrentAsPreset(name.trim());
        }
    });
    deleteSettingsPresetBtn.addEventListener('click', () => {
        const value = settingsPreset.value;
        if (value.startsWith('custom:')) {
            const name = value.substring(7);
            if (confirm(`Delete preset "${name}"?`)) {
                deleteSettingsPreset(name);
            }
        }
    });

    // Window resize listener for auto-fit font size
    window.addEventListener('resize', debouncedAutoFit);
}

// Get current settings as an object
function getCurrentSettings() {
    return {
        // Display
        outputBackground: outputBackground.value,
        charsPerRow: parseInt(charsPerRow.value),
        fontSize: parseInt(fontSize.value),
        autoFitFontSize: autoFitFont.checked,
        autoRatio: autoRatio.checked,
        charRatio: parseFloat(charRatio.value),
        // Character Set
        charSetPreset: charSet.value,
        customChars: customChars.value,
        // Output
        colorMode: colorMode.value,
        invertBrightness: invertBrightness.checked,
        histogramEq: contrastHistogram.checked,
        contrast: parseInt(contrastAmount.value),
        brightnessBlend: parseInt(brightnessBlend.value),
        saturation: parseInt(colorSaturation.value),
        opacity: parseInt(globalOpacity.value),
        brightnessAsOpacity: brightnessOpacity.checked,
        monoFg: monoFg.value,
        monoBg: monoBg.value
    };
}

// Apply settings from an object
function applySettings(settings, skipConvert = false) {
    // Display settings
    if (settings.outputBackground !== undefined) {
        outputBackground.value = settings.outputBackground;
        applyOutputBackground(settings.outputBackground);
    }
    if (settings.charsPerRow !== undefined) {
        charsPerRow.value = settings.charsPerRow;
    }
    if (settings.fontSize !== undefined) {
        fontSize.value = settings.fontSize;
    }
    if (settings.autoFitFontSize !== undefined) {
        autoFitFont.checked = settings.autoFitFontSize;
    }
    if (settings.autoRatio !== undefined) {
        autoRatio.checked = settings.autoRatio;
        charRatio.disabled = settings.autoRatio;
    }
    if (settings.charRatio !== undefined && !settings.autoRatio) {
        charRatio.value = settings.charRatio;
    }

    // Character set settings
    if (settings.charSetPreset !== undefined) {
        charSet.value = settings.charSetPreset;
    }
    if (settings.customChars !== undefined) {
        // Sort for current font if it's a built-in preset
        if (settings.charSetPreset && !isCustomPreset(settings.charSetPreset)) {
            customChars.value = sortAndOptimizeChars(settings.customChars, 0, fontFamily.value);
        } else {
            customChars.value = settings.customChars;
        }
    }

    // Output settings
    if (settings.colorMode !== undefined) {
        colorMode.value = settings.colorMode;
    }
    if (settings.invertBrightness !== undefined) {
        invertBrightness.checked = settings.invertBrightness;
    }
    if (settings.histogramEq !== undefined) {
        contrastHistogram.checked = settings.histogramEq;
    }
    if (settings.contrast !== undefined) {
        contrastAmount.value = settings.contrast;
    }
    if (settings.brightnessBlend !== undefined) {
        brightnessBlend.value = settings.brightnessBlend;
    }
    if (settings.saturation !== undefined) {
        colorSaturation.value = settings.saturation;
    }
    if (settings.opacity !== undefined) {
        globalOpacity.value = settings.opacity;
    }
    if (settings.brightnessAsOpacity !== undefined) {
        brightnessOpacity.checked = settings.brightnessAsOpacity;
    }
    if (settings.monoFg !== undefined) {
        monoFg.value = settings.monoFg;
    }
    if (settings.monoBg !== undefined) {
        monoBg.value = settings.monoBg;
    }

    // Update all UI state
    updateDisplaySettings();
    if (settings.autoRatio) {
        updateCharRatio();
    } else {
        charRatioValue.textContent = charRatio.value;
    }
    initColorModeVisibility();
    initSliderValues();
    updateDeleteButtonVisibility();
    cachedPalette = null; // Clear palette cache

    // Re-convert if image loaded
    if (!skipConvert && currentImage) {
        convertToAscii();
    }
}

// Settings presets localStorage management
function getCustomSettingsPresets() {
    return JSON.parse(localStorage.getItem('ascii-settings-presets') || '{}');
}

function saveCustomSettingsPresets(presets) {
    localStorage.setItem('ascii-settings-presets', JSON.stringify(presets));
}

function saveCurrentAsPreset(name) {
    const presets = getCustomSettingsPresets();
    presets[name] = getCurrentSettings();
    saveCustomSettingsPresets(presets);
    populateSettingsPresetDropdown();
    settingsPreset.value = 'custom:' + name;
    updateSettingsDeleteButtonVisibility();
    showToast(`Preset "${name}" saved`);
}

function deleteSettingsPreset(name) {
    const presets = getCustomSettingsPresets();
    delete presets[name];
    saveCustomSettingsPresets(presets);
    populateSettingsPresetDropdown();
    settingsPreset.value = 'default';
    updateSettingsDeleteButtonVisibility();
    showToast(`Preset "${name}" deleted`);
}

function populateSettingsPresetDropdown() {
    const customPresets = getCustomSettingsPresets();

    // Clear and rebuild
    settingsPreset.innerHTML = '';

    // Built-in presets
    const builtInGroup = document.createElement('optgroup');
    builtInGroup.label = 'Built-in';
    for (const [key, preset] of Object.entries(SETTINGS_PRESETS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.name;
        builtInGroup.appendChild(option);
    }
    settingsPreset.appendChild(builtInGroup);

    // Custom presets
    const customKeys = Object.keys(customPresets);
    if (customKeys.length > 0) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = 'Custom';
        for (const name of customKeys) {
            const option = document.createElement('option');
            option.value = 'custom:' + name;
            option.textContent = name;
            customGroup.appendChild(option);
        }
        settingsPreset.appendChild(customGroup);
    }
}

function updateSettingsDeleteButtonVisibility() {
    const isCustom = settingsPreset.value.startsWith('custom:');
    deleteSettingsPresetBtn.style.display = isCustom ? 'inline-block' : 'none';
}

function handleSettingsPresetChange() {
    const value = settingsPreset.value;
    if (value.startsWith('custom:')) {
        const name = value.substring(7);
        const presets = getCustomSettingsPresets();
        if (presets[name]) {
            applySettings(presets[name]);
        }
    } else if (SETTINGS_PRESETS[value]) {
        applySettings(SETTINGS_PRESETS[value].settings);
    }
    updateSettingsDeleteButtonVisibility();
}

function updateDisplaySettings() {
    asciiOutput.style.fontFamily = fontFamily.value;
    asciiOutput.style.fontSize = fontSize.value + 'px';
    asciiOutput.style.lineHeight = '1';
}

function updateCharRatio() {
    if (!autoRatio.checked) return;

    const measured = measureCharCell();
    cachedCharRatio = measured.width / measured.height;
    // Round to 1 decimal for slider compatibility
    charRatio.value = cachedCharRatio.toFixed(1);
    charRatioValue.textContent = cachedCharRatio.toFixed(1);
}

// Current ASCII output dimensions (updated after each conversion)
let currentAsciiWidth = 0;
let currentAsciiHeight = 0;
let needsInitialAutoFit = false; // Flag to trigger auto-fit on first frame of video/webcam

// Calculate and apply auto-fit font size
function calculateAutoFitFontSize() {
    if (!autoFitFont.checked) return;
    if (currentAsciiWidth === 0 || currentAsciiHeight === 0) return;

    const asciiContainer = asciiOutput.parentElement;
    if (!asciiContainer) return;

    // Get container inner dimensions (subtract padding)
    const containerStyle = getComputedStyle(asciiContainer);
    const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const paddingY = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom);

    // Use scrollWidth/scrollHeight to get the actual available space
    // Subtract a small safety margin to prevent any overflow
    const safetyMargin = 2;
    const containerWidth = asciiContainer.clientWidth - paddingX - safetyMargin;
    const containerHeight = asciiContainer.clientHeight - paddingY - safetyMargin;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    // Measure character dimensions at a reference font size
    const refSize = 10;
    const span = document.createElement('span');
    span.style.fontFamily = fontFamily.value;
    span.style.fontSize = refSize + 'px';
    span.style.lineHeight = '1';
    span.style.letterSpacing = '0';
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    // Measure with a string of characters for more accurate average width
    span.textContent = '@@@@@@@@@@';
    document.body.appendChild(span);
    const rect = span.getBoundingClientRect();
    document.body.removeChild(span);

    const charWidthRatio = (rect.width / 10) / refSize;  // average char width per pixel of font size
    const charHeightRatio = rect.height / refSize;

    // Calculate font size needed to fit width and height
    const fontSizeForWidth = containerWidth / (currentAsciiWidth * charWidthRatio);
    const fontSizeForHeight = containerHeight / (currentAsciiHeight * charHeightRatio);

    // Use the smaller font size to ensure output fits within container
    let optimalFontSize = Math.min(fontSizeForWidth, fontSizeForHeight);

    // Clamp to bounds
    optimalFontSize = Math.max(AUTO_FIT_FONT_MIN, Math.min(AUTO_FIT_FONT_MAX, optimalFontSize));

    // Floor to avoid subpixel overflow
    optimalFontSize = Math.floor(optimalFontSize);

    // Update the font size slider and display
    fontSize.value = optimalFontSize;
    fontSizeValue.textContent = optimalFontSize;

    // Apply the new font size
    updateDisplaySettings();
    updateCharRatio();
}

// Debounced auto-fit for window resize
let autoFitResizeTimeout;
function debouncedAutoFit() {
    clearTimeout(autoFitResizeTimeout);
    autoFitResizeTimeout = setTimeout(calculateAutoFitFontSize, 150);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
            loadVideoFile(file);
        } else if (file.type.startsWith('image/')) {
            loadImageFile(file);
        }
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('video/')) {
            loadVideoFile(file);
        } else {
            loadImageFile(file);
        }
    }
}

// Image loading
function loadImageFile(file) {
    stopVideo();
    stopWebcam();
    const reader = new FileReader();
    reader.onload = (e) => {
        loadImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Video loading
function loadVideoFile(file) {
    stopVideo();
    stopWebcam();
    const url = URL.createObjectURL(file);
    loadVideo(url);
}

// Clipboard paste handling
function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for image data first
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
                loadImageFile(file);
                return;
            }
        }
    }

    // Check for text that might be a URL
    for (const item of items) {
        if (item.type === 'text/plain') {
            item.getAsString((text) => {
                const trimmed = text.trim();
                // Check if it looks like a URL
                if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|webm|mov|avi)/i) ||
                    trimmed.match(/^https?:\/\/.+/i) && trimmed.length < 500) {
                    // Try to load as image/video URL
                    if (trimmed.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) {
                        loadVideo(trimmed);
                    } else {
                        loadImage(trimmed);
                    }
                }
            });
            return;
        }
    }
}

function loadVideo(src) {
    stopVideo();
    stopWebcam();
    placeholder.style.display = 'none';

    videoPreview.src = src;
    videoPreview.load();

    videoPreview.onloadedmetadata = () => {
        isVideoMode = true;
        currentVideo = videoPreview;
        currentImage = null;

        // Show video preview, hide image preview
        imagePreview.style.display = 'none';
        videoPreview.style.display = 'block';
        noPreview.style.display = 'none';
        videoControls.style.display = 'block';
        gifExportControls.style.display = 'flex';
        document.querySelector('.media-input-row')?.classList.add('has-preview');

        // Update seek bar max
        videoSeek.max = Math.floor(videoPreview.duration);
        updateVideoTime();

        // Show first frame
        videoPreview.currentTime = 0;
    };

    videoPreview.onseeked = () => {
        if (!isVideoPlaying) {
            convertVideoFrame();
        }
    };

    videoPreview.oncanplay = () => {
        if (!isVideoPlaying) {
            convertVideoFrame();
        }
    };

    videoPreview.onerror = () => {
        const error = videoPreview.error;
        let message = 'Failed to load video.';

        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Video loading aborted.';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    message = 'Network error loading video.';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    message = 'Video codec not supported. Try converting to MP4 (H.264).';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Video format not supported. Try MP4 or WebM.';
                    break;
            }
            console.error('Video error:', error.code, error.message);
        }

        showToast(message);
        isVideoMode = false;
        placeholder.style.display = 'block';
    };
}

function convertVideoFrame() {
    if (!currentVideo) return;

    // Create video frame proxy that works with drawImage and has width/height
    // This avoids creating new canvas/image objects every frame
    const videoProxy = {
        width: currentVideo.videoWidth,
        height: currentVideo.videoHeight,
        // Used by drawImage - we draw from the video element directly
        _source: currentVideo
    };

    // Store as currentImage for conversion (conversion will use this with drawImage)
    currentImage = videoProxy;
    cachedPalette = null;
    convertToAscii();
}

function videoPlaybackLoop(timestamp) {
    if (!isVideoPlaying) return;

    // Calculate FPS
    frameCount++;
    if (timestamp - fpsUpdateTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        fpsUpdateTime = timestamp;
        videoFps.textContent = `FPS: ${currentFps}`;
    }

    // Convert current frame
    convertVideoFrame();

    // Update seek bar and time
    videoSeek.value = Math.floor(currentVideo.currentTime);
    updateVideoTime();

    // Continue loop
    videoAnimationId = requestAnimationFrame(videoPlaybackLoop);
}

function playVideo() {
    if (!currentVideo) return;
    currentVideo.play();
    isVideoPlaying = true;
    needsInitialAutoFit = true; // Trigger auto-fit on first frame
    videoPlayBtn.style.display = 'none';
    videoPauseBtn.style.display = '';
    videoFps.style.display = '';
    videoFps.textContent = 'FPS: --';
    frameCount = 0;
    fpsUpdateTime = performance.now();
    // Make container unselectable and show pointer cursor during video playback
    asciiOutput.parentElement.style.userSelect = 'none';
    asciiOutput.parentElement.style.cursor = 'pointer';
    videoAnimationId = requestAnimationFrame(videoPlaybackLoop);
}

function pauseVideo() {
    if (!currentVideo) return;
    currentVideo.pause();
    isVideoPlaying = false;
    videoPlayBtn.style.display = '';
    videoPauseBtn.style.display = 'none';
    videoFps.style.display = 'none';
    // Restore selectability when paused, keep pointer cursor for click-to-play
    asciiOutput.parentElement.style.userSelect = '';
    asciiOutput.parentElement.style.cursor = 'pointer';
    if (videoAnimationId) {
        cancelAnimationFrame(videoAnimationId);
        videoAnimationId = null;
    }
    // Re-render current frame in HTML mode for copy/paste support
    convertToAscii();
}

function stopVideo() {
    if (currentVideo) {
        currentVideo.pause();
        currentVideo.currentTime = 0;
    }
    isVideoPlaying = false;
    isVideoMode = false;
    currentVideo = null;
    videoPlayBtn.style.display = '';
    videoPauseBtn.style.display = 'none';
    // Restore selectability and cursor when stopped
    asciiOutput.parentElement.style.userSelect = '';
    asciiOutput.parentElement.style.cursor = '';
    if (videoAnimationId) {
        cancelAnimationFrame(videoAnimationId);
        videoAnimationId = null;
    }
    // Stop any GIF/video recording and clear frames
    if (isRecordingGif) {
        stopGifRecording(false);
    }
    if (isRecordingVideo) {
        stopVideoRecording();
    }
    gifFrames = [];
    videoFps.style.display = 'none';
    videoControls.style.display = 'none';
    videoPreview.style.display = 'none';
    gifExportControls.style.display = 'none';
    // Switch back to HTML mode
    setCanvasMode(false);
}

function seekVideo(time) {
    if (!currentVideo) return;
    currentVideo.currentTime = time;
    updateVideoTime();
}

function updateVideoTime() {
    if (!currentVideo) return;
    const current = formatTime(currentVideo.currentTime);
    const duration = formatTime(currentVideo.duration);
    videoTime.textContent = `${current} / ${duration}`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Webcam Functions
async function startWebcam() {
    if (isWebcamActive) return;

    try {
        // Stop any playing video first
        if (isVideoPlaying) {
            pauseVideo();
        }

        // Get selected camera or default
        const deviceId = webcamSelect.value;
        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false
        };

        webcamStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Show webcam in video preview element
        videoPreview.srcObject = webcamStream;
        videoPreview.src = '';
        await videoPreview.play();

        isWebcamActive = true;
        isVideoMode = true;
        currentVideo = videoPreview;
        currentImage = null;

        // Update UI
        imagePreview.style.display = 'none';
        videoPreview.style.display = 'block';
        noPreview.style.display = 'none';
        videoControls.style.display = 'none';
        gifExportControls.style.display = 'flex';
        webcamControls.style.display = 'block';
        webcamStartBtn.style.display = 'none';
        webcamStopBtn.style.display = '';
        placeholder.style.display = 'none';
        document.querySelector('.media-input-row')?.classList.add('has-preview');

        // Apply mirror if enabled
        updateWebcamMirror();

        // Populate camera list if not done
        await populateCameraList();

        // Start frame capture loop
        frameCount = 0;
        fpsUpdateTime = performance.now();
        videoFps.style.display = '';
        videoFps.textContent = 'FPS: --';
        asciiOutput.parentElement.style.userSelect = 'none';
        asciiOutput.parentElement.style.cursor = 'pointer';
        needsInitialAutoFit = true; // Trigger auto-fit on first frame
        webcamAnimationId = requestAnimationFrame(webcamCaptureLoop);

        showToast('Webcam started');
    } catch (err) {
        console.error('Webcam error:', err);
        if (err.name === 'NotAllowedError') {
            showToast('Camera permission denied');
        } else if (err.name === 'NotFoundError') {
            showToast('No camera found');
        } else {
            showToast('Failed to start webcam');
        }
    }
}

function stopWebcam() {
    if (!isWebcamActive) return;

    // Stop the stream
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }

    // Cancel animation frame
    if (webcamAnimationId) {
        cancelAnimationFrame(webcamAnimationId);
        webcamAnimationId = null;
    }

    // Stop any recordings
    if (isRecordingGif) {
        stopGifRecording(false);
    }
    if (isRecordingVideo) {
        stopVideoRecording();
    }

    isWebcamActive = false;
    isVideoMode = false;
    currentVideo = null;

    // Reset video element
    videoPreview.srcObject = null;
    videoPreview.style.display = 'none';
    videoPreview.classList.remove('webcam-mirrored');

    // Update UI
    webcamControls.style.display = 'none';
    webcamStartBtn.style.display = '';
    webcamStopBtn.style.display = 'none';
    gifExportControls.style.display = 'none';
    videoFps.style.display = 'none';
    asciiOutput.parentElement.style.userSelect = '';
    asciiOutput.parentElement.style.cursor = '';

    // Switch back to HTML mode
    setCanvasMode(false);

    // Show placeholder if no image
    if (!currentImage) {
        placeholder.style.display = 'block';
        document.querySelector('.media-input-row')?.classList.remove('has-preview');
    }

    showToast('Webcam stopped');
}

function webcamCaptureLoop(timestamp) {
    if (!isWebcamActive) return;

    // Calculate FPS
    frameCount++;
    if (timestamp - fpsUpdateTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        fpsUpdateTime = timestamp;
        videoFps.textContent = `FPS: ${currentFps}`;
    }

    // Convert current frame
    convertVideoFrame();

    // Continue loop
    webcamAnimationId = requestAnimationFrame(webcamCaptureLoop);
}

async function populateCameraList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');

        webcamSelect.innerHTML = '';

        if (cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No cameras found';
            webcamSelect.appendChild(option);
            return;
        }

        cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            webcamSelect.appendChild(option);
        });

        // Select current camera if active
        if (webcamStream) {
            const currentTrack = webcamStream.getVideoTracks()[0];
            if (currentTrack) {
                const settings = currentTrack.getSettings();
                if (settings.deviceId) {
                    webcamSelect.value = settings.deviceId;
                }
            }
        }
    } catch (err) {
        console.error('Failed to enumerate cameras:', err);
    }
}

let isSwitchingCamera = false;

async function switchCamera(deviceId) {
    if (!isWebcamActive) return;
    if (isSwitchingCamera) return; // Prevent concurrent switches

    isSwitchingCamera = true;

    // Pause the capture loop during switch
    const wasCapturing = webcamAnimationId !== null;
    if (webcamAnimationId) {
        cancelAnimationFrame(webcamAnimationId);
        webcamAnimationId = null;
    }

    // Stop current stream tracks
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }

    // Clear video element and event handlers
    videoPreview.onloadedmetadata = null;
    videoPreview.onerror = null;
    videoPreview.srcObject = null;

    try {
        // Build constraints - use 'ideal' instead of 'exact' for better compatibility
        const constraints = {
            video: deviceId ? { deviceId: { ideal: deviceId } } : true,
            audio: false
        };

        webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = webcamStream;

        // Wait for video to be ready
        await waitForVideoReady(videoPreview);

        await videoPreview.play();
        updateWebcamMirror();
        currentVideo = videoPreview;

        // Resume capture loop
        if (wasCapturing) {
            webcamAnimationId = requestAnimationFrame(webcamCaptureLoop);
        }
    } catch (err) {
        console.error('Failed to switch camera:', err);
        showToast('Failed to switch camera');
        // Try to restart with any camera
        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoPreview.srcObject = webcamStream;
            await waitForVideoReady(videoPreview);
            await videoPreview.play();
            updateWebcamMirror();
            currentVideo = videoPreview;
            // Resume capture loop
            if (wasCapturing) {
                webcamAnimationId = requestAnimationFrame(webcamCaptureLoop);
            }
        } catch (fallbackErr) {
            console.error('Fallback camera also failed:', fallbackErr);
            stopWebcam();
        }
    } finally {
        isSwitchingCamera = false;
    }
}

// Helper to wait for video element to be ready
function waitForVideoReady(video, timeout = 5000) {
    return new Promise((resolve, reject) => {
        // Check if already ready
        if (video.readyState >= 2) {
            resolve();
            return;
        }

        let resolved = false;
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                video.onloadedmetadata = null;
                video.onerror = null;
                reject(new Error('Timeout waiting for camera'));
            }
        }, timeout);

        const onReady = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                video.onloadedmetadata = null;
                video.onerror = null;
                resolve();
            }
        };

        const onError = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                video.onloadedmetadata = null;
                video.onerror = null;
                reject(new Error('Video element error'));
            }
        };

        video.onloadedmetadata = onReady;
        video.oncanplay = onReady; // Also listen for canplay as backup
        video.onerror = onError;
    });
}

function updateWebcamMirror() {
    if (webcamMirror.checked) {
        videoPreview.classList.add('webcam-mirrored');
    } else {
        videoPreview.classList.remove('webcam-mirrored');
    }
}

// GIF Recording
function startGifRecording() {
    if (!isVideoMode || !currentVideo) {
        showToast('Load a video or start webcam first');
        return;
    }

    isRecordingGif = true;
    gifFrames = [];
    gifStartTime = performance.now();

    downloadGifBtn.textContent = '⏹ Stop Recording';
    downloadGifBtn.classList.add('recording');
    gifStatus.textContent = 'Recording...';

    // Start video playback if not playing (not for webcam - it's already streaming)
    if (!isVideoPlaying && !isWebcamActive) {
        playVideo();
    }

    // Start capturing frames
    captureGifFrameLoop();
}

let lastGifFrameTime = 0;
function captureGifFrameLoop() {
    if (!isRecordingGif) return;

    const now = performance.now();
    const elapsed = now - gifStartTime;

    // Check duration limit
    if (elapsed >= GIF_MAX_DURATION) {
        stopGifRecording(true);
        return;
    }

    // Capture frame at interval
    if (now - lastGifFrameTime >= GIF_FRAME_INTERVAL) {
        captureGifFrame();
        lastGifFrameTime = now;
        gifStatus.textContent = `Recording... ${(elapsed / 1000).toFixed(1)}s`;
    }

    requestAnimationFrame(captureGifFrameLoop);
}

function captureGifFrame() {
    // If using canvas mode, just copy the canvas directly
    if (asciiCanvas.style.display !== 'none' && asciiCanvas.width > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = asciiCanvas.width;
        canvas.height = asciiCanvas.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(asciiCanvas, 0, 0);
        gifFrames.push(canvas);
        return;
    }

    // HTML mode: render from DOM
    // Get computed styles
    const styles = window.getComputedStyle(asciiOutput);
    const fontSizeVal = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight) || fontSizeVal * 1.2;
    const fontFamilyVal = styles.fontFamily;

    // Calculate actual content size based on ASCII dimensions
    const text = asciiOutput.textContent;
    const lines = text.split('\n');
    const numLines = lines.length;
    const maxLineLength = Math.max(...lines.map(l => l.length));

    // Create measuring canvas to get accurate character width
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = `${fontSizeVal}px ${fontFamilyVal}`;
    const charWidth = measureCtx.measureText('M').width; // Use monospace char width

    // Calculate canvas size based on content, not container
    const contentWidth = Math.ceil(maxLineLength * charWidth);
    const contentHeight = Math.ceil(numLines * lineHeight);

    const canvas = document.createElement('canvas');
    canvas.width = contentWidth;
    canvas.height = contentHeight;

    const ctx = canvas.getContext('2d');

    // Draw background
    const bgColor = isDarkMode() ? '#0d0d0d' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSizeVal}px ${fontFamilyVal}`;
    ctx.textBaseline = 'top';

    // Render the ASCII content
    const isMono = colorMode.value === 'monochrome';
    if (isMono) {
        ctx.fillStyle = monoFg.value;
        lines.forEach((line, i) => {
            ctx.fillText(line, 0, i * lineHeight);
        });
    } else {
        // For colored output, render each span
        const spans = asciiOutput.querySelectorAll('span');
        if (spans.length > 0) {
            let x = 0, y = 0;
            spans.forEach(span => {
                const spanText = span.textContent;
                const color = span.style.color || styles.color;
                ctx.fillStyle = color;

                for (const char of spanText) {
                    if (char === '\n') {
                        x = 0;
                        y += lineHeight;
                    } else {
                        ctx.fillText(char, x, y);
                        x += ctx.measureText(char).width;
                    }
                }
            });
        }
    }

    gifFrames.push(canvas);
}

function stopGifRecording(encode) {
    isRecordingGif = false;
    downloadGifBtn.textContent = 'Record GIF';
    downloadGifBtn.classList.remove('recording');

    if (!encode || gifFrames.length === 0) {
        gifStatus.textContent = '';
        gifFrames = [];
        return;
    }

    gifStatus.textContent = `Encoding ${gifFrames.length} frames...`;

    // Encode GIF using gif.js
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: gifFrames[0].width,
        height: gifFrames[0].height,
        workerScript: 'gif.worker.js'
    });

    gifFrames.forEach(canvas => {
        gif.addFrame(canvas, { delay: GIF_FRAME_INTERVAL });
    });

    gif.on('finished', blob => {
        // Download the GIF
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ascii-animation.gif';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        gifStatus.textContent = '';
        gifFrames = [];
        showToast('GIF downloaded!');
    });

    gif.on('progress', p => {
        gifStatus.textContent = `Encoding... ${Math.round(p * 100)}%`;
    });

    gif.render();
}

// Video Settings Modal
let modalCloseTime = 0; // Track when modal was closed to prevent ghost clicks on mobile

function showVideoSettingsModal() {
    // Update format options based on browser support
    updateFormatOptions();

    videoSettingsModal.classList.add('show');
}

function hideVideoSettingsModal() {
    videoSettingsModal.classList.remove('show');
    modalCloseTime = Date.now();
}

function updateFormatOptions() {
    // Check which formats are supported
    const formats = [
        { value: 'webm-vp9', mime: 'video/webm;codecs=vp9', label: 'WebM (VP9) - Best quality' },
        { value: 'webm-vp8', mime: 'video/webm;codecs=vp8', label: 'WebM (VP8) - Compatible' },
        { value: 'mp4', mime: 'video/mp4', label: 'MP4 (H.264) - Safari' }
    ];

    videoFormatSelect.innerHTML = '';
    let firstSupported = null;

    for (const format of formats) {
        const supported = MediaRecorder.isTypeSupported(format.mime);
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.label + (supported ? '' : ' (not supported)');
        option.disabled = !supported;
        videoFormatSelect.appendChild(option);

        if (supported && !firstSupported) {
            firstSupported = format.value;
        }
    }

    // Restore previously selected format if supported, otherwise select first supported
    const savedFormat = videoSettings.format;
    const savedOption = videoFormatSelect.querySelector(`option[value="${savedFormat}"]`);
    if (savedOption && !savedOption.disabled) {
        videoFormatSelect.value = savedFormat;
    } else if (firstSupported) {
        videoFormatSelect.value = firstSupported;
    }
}

// Video Recording (MediaRecorder API)
function startVideoRecording() {
    if (!isVideoPlaying && !isWebcamActive) {
        showToast('Play a video or start webcam first');
        return;
    }

    // Check if canvas mode is active
    if (asciiCanvas.style.display === 'none' || asciiCanvas.width === 0) {
        showToast('Canvas not ready for recording');
        return;
    }

    // Get canvas stream with selected framerate
    const stream = asciiCanvas.captureStream(videoSettings.framerate);

    // Determine MIME type based on settings
    const formatMimeMap = {
        'webm-vp9': 'video/webm;codecs=vp9',
        'webm-vp8': 'video/webm;codecs=vp8',
        'mp4': 'video/mp4'
    };
    let mimeType = formatMimeMap[videoSettings.format];

    // Fallback if selected format not supported
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        const fallbacks = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        mimeType = fallbacks.find(m => MediaRecorder.isTypeSupported(m)) || '';
    }

    if (!mimeType) {
        showToast('Video recording not supported in this browser');
        return;
    }

    // Determine bitrate based on quality setting
    const qualityBitrateMap = {
        'high': 8000000,    // 8 Mbps
        'medium': 5000000,  // 5 Mbps
        'low': 2000000      // 2 Mbps
    };
    const bitrate = qualityBitrateMap[videoSettings.quality] || 5000000;

    try {
        videoChunks = [];
        mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: bitrate
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                videoChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            // Create blob and download
            const blob = new Blob(videoChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ascii-video.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            gifStatus.textContent = '';
            videoChunks = [];
            showToast('Video downloaded!');
        };

        mediaRecorder.start(100); // Collect data every 100ms
        isRecordingVideo = true;
        videoStartTime = performance.now();
        downloadVideoBtn.textContent = '⏹ Stop';
        downloadVideoBtn.classList.add('recording');
        gifStatus.textContent = 'Recording video...';

        // Auto-stop after max duration
        requestAnimationFrame(videoRecordingLoop);
    } catch (e) {
        console.error('Failed to start video recording:', e);
        showToast('Failed to start recording');
    }
}

function videoRecordingLoop() {
    if (!isRecordingVideo) return;

    const elapsed = performance.now() - videoStartTime;
    gifStatus.textContent = `Recording... ${(elapsed / 1000).toFixed(1)}s`;

    if (elapsed >= videoMaxDuration || (!isVideoPlaying && !isWebcamActive)) {
        stopVideoRecording();
        return;
    }

    requestAnimationFrame(videoRecordingLoop);
}

function stopVideoRecording() {
    if (!isRecordingVideo || !mediaRecorder) return;

    isRecordingVideo = false;
    downloadVideoBtn.textContent = 'Record Video';
    downloadVideoBtn.classList.remove('recording');

    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    mediaRecorder = null;
}


function loadDefaultImage() {
    loadImage('default_image.jpg');
}

function loadImage(src) {
    stopVideo();
    stopWebcam();
    placeholder.style.display = 'none';

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
        currentImage = img;
        currentVideo = null;
        isVideoMode = false;
        cachedPalette = null; // Clear palette cache for new image
        if (asciiWorker) asciiWorker.postMessage({ type: 'clearCache' });
        showPreview(src);
        convertToAscii();
    };

    img.onerror = () => {
        showToast('Failed to load image. Try a different source.');
        if (!currentImage) {
            placeholder.style.display = 'block';
        }
    };

    img.src = src;
}

function showPreview(src) {
    imagePreview.src = src;
    imagePreview.style.display = 'block';
    videoPreview.style.display = 'none';
    videoControls.style.display = 'none';
    gifExportControls.style.display = 'none';
    noPreview.style.display = 'none';
    document.querySelector('.media-input-row')?.classList.add('has-preview');
}

// Measure character cell dimensions
function measureCharCell() {
    const span = document.createElement('span');
    span.style.fontFamily = fontFamily.value;
    span.style.fontSize = fontSize.value + 'px';
    span.style.lineHeight = '1';
    span.style.letterSpacing = '0';
    span.style.position = 'absolute';
    span.style.visibility = 'hidden';
    span.textContent = '@';
    document.body.appendChild(span);
    const rect = span.getBoundingClientRect();
    document.body.removeChild(span);
    return { width: rect.width, height: rect.height };
}

function getCharRatio() {
    if (autoRatio.checked) {
        return cachedCharRatio || 0.5;
    }
    return parseFloat(charRatio.value) || 0.5;
}

// Render ASCII to canvas (fast, no DOM overhead)
function renderToCanvas(ascii, colorData, width, height) {
    const mode = colorMode.value;
    const font = fontFamily.value;
    const size = parseInt(fontSize.value);
    const ratio = getCharRatio();

    // Calculate character dimensions
    const charWidth = size * ratio;
    const charHeight = size;

    // Size canvas
    const canvasWidth = Math.ceil(width * charWidth);
    const canvasHeight = height * charHeight;

    if (asciiCanvas.width !== canvasWidth || asciiCanvas.height !== canvasHeight) {
        asciiCanvas.width = canvasWidth;
        asciiCanvas.height = canvasHeight;
        // Set CSS size to match internal resolution (prevents flex stretching on mobile)
        asciiCanvas.style.width = canvasWidth + 'px';
        asciiCanvas.style.height = canvasHeight + 'px';
    }

    // Set up context
    asciiCanvasCtx.font = `${size}px ${font}`;
    asciiCanvasCtx.textBaseline = 'top';

    // Clear with background color
    if (mode === 'monochrome') {
        asciiCanvasCtx.fillStyle = monoBg.value;
    } else {
        asciiCanvasCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#1a1a2e';
    }
    asciiCanvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Get monochrome foreground color if needed
    const fg = monoFg.value;
    const fgR = parseInt(fg.slice(1, 3), 16);
    const fgG = parseInt(fg.slice(3, 5), 16);
    const fgB = parseInt(fg.slice(5, 7), 16);

    // Render characters
    let lineStart = 0;
    for (let y = 0; y < height; y++) {
        const py = y * charHeight;

        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const charCode = ascii.charCodeAt(lineStart + x);
            if (charCode === 10 || isNaN(charCode)) continue;

            const char = String.fromCharCode(charCode);
            const px = x * charWidth;

            // Set color
            if (colorData && colorData.colorR) {
                // Full color mode
                const r = colorData.colorR[idx];
                const g = colorData.colorG[idx];
                const b = colorData.colorB[idx];
                const a = colorData.opacities[idx];
                asciiCanvasCtx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(2)})`;
            } else if (colorData && colorData.opacities) {
                // Monochrome with brightness opacity
                const a = colorData.opacities[idx];
                asciiCanvasCtx.fillStyle = `rgba(${fgR},${fgG},${fgB},${a.toFixed(2)})`;
            } else {
                // Plain monochrome
                const baseOpacity = parseInt(globalOpacity.value) / 100;
                asciiCanvasCtx.fillStyle = `rgba(${fgR},${fgG},${fgB},${baseOpacity})`;
            }

            asciiCanvasCtx.fillText(char, px, py);
        }
        lineStart += width + 1; // +1 for newline
    }
}

// Show/hide canvas vs HTML output
function setCanvasMode(enabled) {
    if (enabled) {
        asciiOutput.style.display = 'none';
        asciiCanvas.style.display = 'block';
    } else {
        asciiOutput.style.display = '';
        asciiCanvas.style.display = 'none';
    }
}

// Handle worker response
function handleWorkerMessage(e) {
    const { type, ascii, html, colorData, width, height, duration } = e.data;

    if (type === 'result') {
        workerBusy = false;
        const asciiContainer = asciiOutput.parentElement;
        const mode = colorMode.value;

        // Canvas mode (video playback/webcam - always use canvas for live feed)
        if (isVideoPlaying || isWebcamActive) {
            setCanvasMode(true);
            renderToCanvas(ascii, colorData, width, height);
            if (mode === 'monochrome') {
                asciiContainer.style.backgroundColor = monoBg.value;
            } else {
                asciiContainer.style.backgroundColor = '';
            }
            // Store ASCII for when video pauses
            lastAscii = ascii;
            lastWidth = width;
            lastHeight = height;
        }
        // HTML mode (static images with color/opacity)
        else if (html) {
            setCanvasMode(false);
            asciiOutput.innerHTML = html;
            lastColoredHtml = html;
            asciiOutput.style.opacity = '';
            if (mode === 'monochrome') {
                asciiContainer.style.backgroundColor = monoBg.value;
            } else {
                asciiContainer.style.backgroundColor = '';
            }
        } else if (mode === 'monochrome') {
            // Plain monochrome without brightness opacity (static images)
            setCanvasMode(false);
            const baseOpacity = parseInt(globalOpacity.value) / 100;
            asciiContainer.style.backgroundColor = monoBg.value;
            asciiOutput.style.color = monoFg.value;
            asciiOutput.style.opacity = baseOpacity < 1 ? baseOpacity : '';
            asciiOutput.innerHTML = '';
            asciiOutput.textContent = ascii;
            lastColoredHtml = '';
        }

        lastConversionTime = duration;
        outputInfo.textContent = `${width} × ${height} chars`;

        // Update current ASCII dimensions for auto-fit
        currentAsciiWidth = width;
        currentAsciiHeight = height;

        // Process pending conversion if any
        if (pendingConversion) {
            pendingConversion = false;
            convertToAscii();
        } else if (!isVideoPlaying && !isWebcamActive) {
            // Only calculate auto-fit on final conversion (no pending)
            calculateAutoFitFontSize();
        } else if (needsInitialAutoFit || autoFitFont.checked) {
            // Calculate auto-fit on first frame of video/webcam, or when auto-fit is enabled
            needsInitialAutoFit = false;
            calculateAutoFitFontSize();
        }
    }
}

// Store last frame data for re-rendering when video pauses
let lastAscii = '';
let lastWidth = 0;
let lastHeight = 0;

// ASCII conversion dispatcher
function convertToAscii() {
    if (!currentImage) return;

    const mode = colorMode.value;
    const width = parseInt(charsPerRow.value);

    // Use worker for conversion
    if (asciiWorker) {
        // If worker is busy, mark pending and return
        if (workerBusy) {
            pendingConversion = true;
            return;
        }

        workerBusy = true;

        // Get image data
        const { imageData, height } = getScaledImageData(currentImage, width);
        const pixels = imageData.data;

        // Prepare settings for worker
        const fg = monoFg.value;
        const settings = {
            chars: customChars.value || '@%#*+=-:. ',
            invert: invertBrightness.checked,
            contrast: parseInt(contrastAmount.value) / 100,
            histogram: contrastHistogram.checked,
            colorMode: mode,
            saturation: parseInt(colorSaturation.value) / 100,
            blend: parseInt(brightnessBlend.value) / 100,
            baseOpacity: parseInt(globalOpacity.value) / 100,
            brightnessOpacity: brightnessOpacity.checked,
            fgR: parseInt(fg.slice(1, 3), 16),
            fgG: parseInt(fg.slice(3, 5), 16),
            fgB: parseInt(fg.slice(5, 7), 16)
        };

        // Send to worker (transfer pixel buffer for zero-copy)
        // Use canvas mode during video playback for better performance
        const pixelsCopy = new Uint8ClampedArray(pixels);
        asciiWorker.postMessage({
            type: 'convert',
            pixels: pixelsCopy,
            width,
            height,
            settings,
            ansi256Palette: ANSI_256,
            canvasMode: isVideoPlaying || isWebcamActive
        }, [pixelsCopy.buffer]);
    }
}


// Apply color to ASCII output (pixels passed in to avoid duplicate getScaledImageData)
// Optimized with Array.join() and span combining for adjacent same-color chars
function applyColorToAscii(ascii, width, height, pixels, brightnessData) {
    const mode = colorMode.value;

    // Monochrome mode - just return plain text
    if (mode === 'monochrome') {
        return null;
    }
    const saturation = parseInt(colorSaturation.value) / 100;
    const blend = parseInt(brightnessBlend.value) / 100;
    const baseOpacity = parseInt(globalOpacity.value) / 100;
    const useBrightnessOpacity = brightnessOpacity.checked;
    const invert = invertBrightness.checked;

    // Get or build palette
    let palette = null;
    if (mode === 'ansi256') {
        palette = ANSI_256;
    } else if (mode.startsWith('adaptive')) {
        const numColors = parseInt(mode.replace('adaptive', ''));
        // Cache palette for performance (invalidate when saturation changes)
        if (!cachedPalette || cachedPalette.numColors !== numColors || cachedPalette.saturation !== saturation) {
            cachedPalette = {
                numColors,
                saturation,
                colors: quantizeColors(pixels, numColors, saturation)
            };
        }
        palette = cachedPalette.colors;
    }

    const lines = ascii.split('\n');
    const parts = []; // Use array for O(n) concatenation

    // Helper to get color string
    function getColorString(r, g, b, opacity) {
        if (opacity < 1) {
            return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
        }
        return `rgb(${r},${g},${b})`;
    }

    for (let y = 0; y < height; y++) {
        let currentColor = null;
        let currentChars = '';

        for (let x = 0; x < width; x++) {
            const char = lines[y] ? lines[y][x] : ' ';
            if (!char) continue;

            const i = (y * width + x) * 4;
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];

            // Map to palette if not true color
            if (palette) {
                const nearest = nearestColor(r, g, b, palette);
                r = nearest[0];
                g = nearest[1];
                b = nearest[2];
            }

            // Apply saturation
            if (saturation !== 1) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = Math.round(gray + saturation * (r - gray));
                g = Math.round(gray + saturation * (g - gray));
                b = Math.round(gray + saturation * (b - gray));
            }

            // Apply brightness blend
            if (blend !== 0.5 && brightnessData) {
                const charBrightness = brightnessData[y * width + x];
                const adjustedBlend = (blend - 0.5) * 2;
                let factor;
                if (adjustedBlend >= 0) {
                    factor = 1 - adjustedBlend * (1 - charBrightness);
                } else {
                    factor = 1 + Math.abs(adjustedBlend) * (1 - charBrightness);
                }
                r = Math.round(r * factor);
                g = Math.round(g * factor);
                b = Math.round(b * factor);
            }

            // Clamp values
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            // Calculate opacity
            let opacity = baseOpacity;
            if (useBrightnessOpacity && brightnessData) {
                let charBrightness = brightnessData[y * width + x];
                if (invert) {
                    charBrightness = 1 - charBrightness;
                }
                opacity *= (1 - charBrightness);
            }

            const colorStr = getColorString(r, g, b, opacity);

            // Combine adjacent same-color characters into single span
            if (colorStr === currentColor) {
                currentChars += escapeHtml(char);
            } else {
                // Flush previous span
                if (currentColor !== null) {
                    parts.push(`<span style="color:${currentColor}">${currentChars}</span>`);
                }
                currentColor = colorStr;
                currentChars = escapeHtml(char);
            }
        }

        // Flush last span of the line
        if (currentColor !== null) {
            parts.push(`<span style="color:${currentColor}">${currentChars}</span>`);
        }
        parts.push('\n');
    }

    return parts.join('');
}

// Get scaled image data (reuses canvas for performance)
function getScaledImageData(img, width) {
    const ratio = getCharRatio();
    const imgAspect = img.height / img.width;
    const height = Math.max(1, Math.round(width * imgAspect * ratio));

    // Reuse canvas if possible, create if needed
    if (!scalingCanvas) {
        scalingCanvas = document.createElement('canvas');
        scalingCtx = scalingCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Resize only if dimensions changed
    if (scalingCanvas.width !== width || scalingCanvas.height !== height) {
        scalingCanvas.width = width;
        scalingCanvas.height = height;
    }

    // Support video proxy objects with _source property
    const source = img._source || img;

    // Apply horizontal flip for webcam mirror
    const shouldMirror = isWebcamActive && webcamMirror.checked;
    if (shouldMirror) {
        scalingCtx.save();
        scalingCtx.scale(-1, 1);
        scalingCtx.drawImage(source, -width, 0, width, height);
        scalingCtx.restore();
    } else {
        scalingCtx.drawImage(source, 0, 0, width, height);
    }

    return {
        imageData: scalingCtx.getImageData(0, 0, width, height),
        width,
        height
    };
}

// Algorithm: Brightness Mapping
function brightnessMapping(img) {
    const width = parseInt(charsPerRow.value);
    const { imageData, height } = getScaledImageData(img, width);
    const pixels = imageData.data;

    let chars = customChars.value || CHAR_SETS.standard;

    if (invertBrightness.checked) {
        chars = chars.split('').reverse().join('');
    }

    // Calculate brightness values
    const brightnessValues = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const pi = i * 4;
        brightnessValues[i] = getBrightness(pixels[pi], pixels[pi + 1], pixels[pi + 2]);
    }

    // Apply contrast pre-processing
    applyContrast(brightnessValues);

    let ascii = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const brightness = brightnessValues[y * width + x];
            const charIndex = Math.min(chars.length - 1, Math.floor(brightness * chars.length));
            ascii += chars[charIndex];
        }
        ascii += '\n';
    }

    return { ascii, width, height };
}

// Contrast pre-processing helper
function applyContrast(brightness) {
    const contrast = parseInt(contrastAmount.value) / 100;
    const useHistogram = contrastHistogram.checked;

    // Skip if no adjustments needed
    if (contrast === 1 && !useHistogram) {
        return brightness;
    }

    // Histogram equalization
    if (useHistogram) {
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < brightness.length; i++) {
            const bin = Math.floor(brightness[i] * 255);
            histogram[bin]++;
        }

        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }

        const cdfMin = cdf.find(v => v > 0);
        const total = brightness.length;
        for (let i = 0; i < brightness.length; i++) {
            const bin = Math.floor(brightness[i] * 255);
            brightness[i] = (cdf[bin] - cdfMin) / (total - cdfMin);
        }
    }

    // Apply contrast adjustment
    if (contrast !== 1) {
        for (let i = 0; i < brightness.length; i++) {
            let b = brightness[i];
            b = (b - 0.5) * contrast + 0.5;
            brightness[i] = Math.max(0, Math.min(1, b));
        }
    }

    return brightness;
}

// Utility functions
function getBrightness(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy functions
function copyAsText() {
    const text = asciiOutput.textContent;
    if (!text) {
        showToast('Nothing to copy');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied as text!');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

function copyAsHtml() {
    const isColored = colorMode.value !== 'monochrome' && lastColoredHtml;
    const isMono = colorMode.value === 'monochrome';
    const bgColor = isMono ? monoBg.value : (isDarkMode() ? '#0d0d0d' : '#ffffff');
    const textColor = isMono ? monoFg.value : (isDarkMode() ? '#f0f0f0' : '#000000');
    let html;

    const baseStyles = `font-family: ${fontFamily.value}; font-size: ${fontSize.value}px; line-height: 1; letter-spacing: 0; white-space: pre; background-color: ${bgColor}; padding: 16px; margin: 0; display: inline-block;`;

    if (isColored) {
        html = `<pre style="${baseStyles}">${lastColoredHtml}</pre>`;
    } else {
        const text = asciiOutput.textContent;
        if (!text) {
            showToast('Nothing to copy');
            return;
        }
        html = `<pre style="${baseStyles} color: ${textColor};">${escapeHtml(text)}</pre>`;
    }

    // Copy HTML source code as plain text
    navigator.clipboard.writeText(html).then(() => {
        showToast('Copied HTML code!');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

function copyAsMarkdown() {
    const text = asciiOutput.textContent;
    if (!text) {
        showToast('Nothing to copy');
        return;
    }

    const markdown = '```\n' + text + '```';

    navigator.clipboard.writeText(markdown).then(() => {
        showToast('Copied as Markdown!');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

function downloadAsPng() {
    const text = asciiOutput.textContent;
    if (!text && !lastColoredHtml) {
        showToast('Nothing to download');
        return;
    }

    const isColored = colorMode.value !== 'monochrome' && lastColoredHtml;
    const lines = text ? text.split('\n').filter(l => l.length > 0) : [];

    // Measure character dimensions
    const measureSpan = document.createElement('span');
    measureSpan.style.fontFamily = fontFamily.value;
    measureSpan.style.fontSize = fontSize.value + 'px';
    measureSpan.style.lineHeight = '1';
    measureSpan.style.position = 'absolute';
    measureSpan.style.visibility = 'hidden';
    measureSpan.textContent = 'M';
    document.body.appendChild(measureSpan);
    const charWidth = measureSpan.getBoundingClientRect().width;
    const charHeight = measureSpan.getBoundingClientRect().height;
    document.body.removeChild(measureSpan);

    // Calculate canvas size
    const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const padding = 20;
    const canvasWidth = Math.ceil(maxLineLength * charWidth) + padding * 2;
    const canvasHeight = Math.ceil(lines.length * charHeight) + padding * 2;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill background (skip for brightness-as-opacity to preserve transparency)
    const isMono = colorMode.value === 'monochrome';
    const useBrightnessOpacity = brightnessOpacity.checked;
    if (!useBrightnessOpacity) {
        const bgColor = isMono ? monoBg.value : (isDarkMode() ? '#0d0d0d' : '#ffffff');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    // else: canvas starts transparent, alpha channel will be preserved

    // Set font
    ctx.font = `${fontSize.value}px ${fontFamily.value}`;
    ctx.textBaseline = 'top';

    if (isColored || (isMono && useBrightnessOpacity)) {
        // Parse colored HTML and render each character with opacity support
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lastColoredHtml;

        let x = padding;
        let y = padding;

        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                for (const char of text) {
                    if (char === '\n') {
                        x = padding;
                        y += charHeight;
                    } else {
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = isDarkMode() ? '#f0f0f0' : '#000000';
                        ctx.fillText(char, x, y);
                        x += charWidth;
                    }
                }
            } else if (node.tagName === 'SPAN') {
                const color = node.style.color || (isDarkMode() ? '#f0f0f0' : '#000000');
                const text = node.textContent;
                // Parse rgba to extract alpha for canvas
                const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (rgbaMatch) {
                    const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`;
                } else {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = color;
                }
                // Render each character in the span (spans may contain multiple chars)
                for (const char of text) {
                    ctx.fillText(char, x, y);
                    x += charWidth;
                }
            }
        }
        ctx.globalAlpha = 1; // Reset
    } else {
        // Render plain text with global opacity
        const textColor = isMono ? monoFg.value : (isDarkMode() ? '#f0f0f0' : '#000000');
        const baseOpacity = parseInt(globalOpacity.value) / 100;
        ctx.globalAlpha = baseOpacity;
        ctx.fillStyle = textColor;

        lines.forEach((line, i) => {
            ctx.fillText(line, padding, padding + i * charHeight);
        });
        ctx.globalAlpha = 1; // Reset
    }

    // Download
    const link = document.createElement('a');
    link.download = 'ascii-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('Downloaded as PNG!');
}

async function shareAsPng() {
    const text = asciiOutput.textContent;
    if (!text && !lastColoredHtml) {
        showToast('Nothing to share');
        return;
    }

    // Generate PNG using same logic as downloadAsPng
    const isColored = colorMode.value !== 'monochrome' && lastColoredHtml;
    const lines = text ? text.split('\n').filter(l => l.length > 0) : [];

    const measureSpan = document.createElement('span');
    measureSpan.style.fontFamily = fontFamily.value;
    measureSpan.style.fontSize = fontSize.value + 'px';
    measureSpan.style.lineHeight = '1';
    measureSpan.style.position = 'absolute';
    measureSpan.style.visibility = 'hidden';
    measureSpan.textContent = 'M';
    document.body.appendChild(measureSpan);
    const charWidth = measureSpan.getBoundingClientRect().width;
    const charHeight = measureSpan.getBoundingClientRect().height;
    document.body.removeChild(measureSpan);

    const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const padding = 20;
    const canvasWidth = Math.ceil(maxLineLength * charWidth) + padding * 2;
    const canvasHeight = Math.ceil(lines.length * charHeight) + padding * 2;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const isMono = colorMode.value === 'monochrome';
    const useBrightnessOpacity = brightnessOpacity.checked;
    if (!useBrightnessOpacity) {
        const bgColor = isMono ? monoBg.value : (isDarkMode() ? '#0d0d0d' : '#ffffff');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.font = `${fontSize.value}px ${fontFamily.value}`;
    ctx.textBaseline = 'top';

    if (isColored || (isMono && useBrightnessOpacity)) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lastColoredHtml;

        let x = padding;
        let y = padding;

        for (const node of tempDiv.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.textContent;
                for (const char of nodeText) {
                    if (char === '\n') {
                        x = padding;
                        y += charHeight;
                    } else {
                        ctx.globalAlpha = 1;
                        ctx.fillStyle = isDarkMode() ? '#f0f0f0' : '#000000';
                        ctx.fillText(char, x, y);
                        x += charWidth;
                    }
                }
            } else if (node.tagName === 'SPAN') {
                const color = node.style.color || (isDarkMode() ? '#f0f0f0' : '#000000');
                const spanText = node.textContent;
                const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (rgbaMatch) {
                    const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`;
                } else {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = color;
                }
                for (const char of spanText) {
                    ctx.fillText(char, x, y);
                    x += charWidth;
                }
            }
        }
        ctx.globalAlpha = 1;
    } else {
        const textColor = isMono ? monoFg.value : (isDarkMode() ? '#f0f0f0' : '#000000');
        const baseOpacity = parseInt(globalOpacity.value) / 100;
        ctx.globalAlpha = baseOpacity;
        ctx.fillStyle = textColor;

        lines.forEach((line, i) => {
            ctx.fillText(line, padding, padding + i * charHeight);
        });
        ctx.globalAlpha = 1;
    }

    // Convert canvas to blob and share
    canvas.toBlob(async (blob) => {
        if (!blob) {
            showToast('Failed to generate image');
            return;
        }

        const file = new File([blob], 'ascii-art.png', { type: 'image/png' });

        try {
            await navigator.share({
                files: [file],
                title: 'ASCII Art',
            });
            showToast('Shared successfully!');
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('Failed to share');
            }
        }
    }, 'image/png');
}

// Toast notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Start
init();
