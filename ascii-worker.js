// ASCII Conversion Web Worker
// Handles heavy pixel processing off the main thread

// HTML escape map (can't use DOM in worker)
const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
};

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, c => escapeMap[c] || c);
}

function getBrightness(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

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

function applyContrast(brightness, contrast, useHistogram) {
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

function quantizeColors(pixels, numColors, saturation = 1) {
    // Collect unique colors (sample for performance)
    const colorMap = new Map();
    const step = Math.max(1, Math.floor(pixels.length / 4 / 10000));
    for (let i = 0; i < pixels.length; i += 4 * step) {
        let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];

        if (saturation < 1) {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            r = Math.round(gray + saturation * (r - gray));
            g = Math.round(gray + saturation * (g - gray));
            b = Math.round(gray + saturation * (b - gray));
        }

        const key = (r << 16) | (g << 8) | b;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

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
            let tr = 0, tg = 0, tb = 0, total = 0;
            for (const c of colors) {
                tr += c[0] * c[3];
                tg += c[1] * c[3];
                tb += c[2] * c[3];
                total += c[3];
            }
            if (total === 0) return [[128, 128, 128]];
            return [[Math.round(tr / total), Math.round(tg / total), Math.round(tb / total)]];
        }

        const rRange = getRange(colors, 0);
        const gRange = getRange(colors, 1);
        const bRange = getRange(colors, 2);

        let channel = 0;
        if (gRange >= rRange && gRange >= bRange) channel = 1;
        else if (bRange >= rRange && bRange >= gRange) channel = 2;

        colors.sort((a, b) => a[channel] - b[channel]);
        const mid = Math.floor(colors.length / 2);

        return [
            ...medianCut(colors.slice(0, mid), depth - 1),
            ...medianCut(colors.slice(mid), depth - 1)
        ];
    }

    const depth = Math.ceil(Math.log2(numColors));
    return medianCut(colorList, depth).slice(0, numColors);
}

// Brightness mapping algorithm
function brightnessMapping(pixels, width, height, settings) {
    let chars = settings.chars;
    if (settings.invert) {
        chars = chars.split('').reverse().join('');
    }

    const brightnessValues = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const pi = i * 4;
        brightnessValues[i] = getBrightness(pixels[pi], pixels[pi + 1], pixels[pi + 2]);
    }

    applyContrast(brightnessValues, settings.contrast, settings.histogram);

    let ascii = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const brightness = brightnessValues[y * width + x];
            const charIndex = Math.min(chars.length - 1, Math.floor(brightness * chars.length));
            ascii += chars[charIndex];
        }
        ascii += '\n';
    }

    return { ascii, brightnessValues };
}

// Apply color to ASCII
function applyColorToAscii(ascii, pixels, width, height, brightnessData, settings, palette) {
    if (settings.colorMode === 'monochrome') {
        return null;
    }

    const lines = ascii.split('\n');
    const parts = [];

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
            if (settings.saturation !== 1) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = Math.round(gray + settings.saturation * (r - gray));
                g = Math.round(gray + settings.saturation * (g - gray));
                b = Math.round(gray + settings.saturation * (b - gray));
            }

            // Apply brightness blend
            if (settings.blend !== 0.5 && brightnessData) {
                const charBrightness = brightnessData[y * width + x];
                const adjustedBlend = (settings.blend - 0.5) * 2;
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
            let opacity = settings.baseOpacity;
            if (settings.brightnessOpacity && brightnessData) {
                let charBrightness = brightnessData[y * width + x];
                if (settings.invert) {
                    charBrightness = 1 - charBrightness;
                }
                opacity *= (1 - charBrightness);
            }

            const colorStr = getColorString(r, g, b, opacity);

            // Combine adjacent same-color characters
            if (colorStr === currentColor) {
                currentChars += escapeHtml(char);
            } else {
                if (currentColor !== null) {
                    parts.push(`<span style="color:${currentColor}">${currentChars}</span>`);
                }
                currentColor = colorStr;
                currentChars = escapeHtml(char);
            }
        }

        if (currentColor !== null) {
            parts.push(`<span style="color:${currentColor}">${currentChars}</span>`);
        }
        parts.push('\n');
    }

    return parts.join('');
}

// Process monochrome with brightness opacity
function processMonoBrightnessOpacity(ascii, pixels, width, height, settings) {
    const lines = ascii.split('\n');
    const parts = [];
    const { fgR, fgG, fgB } = settings;

    for (let y = 0; y < height; y++) {
        let currentOpacity = null;
        let currentChars = '';

        for (let x = 0; x < width; x++) {
            const char = lines[y] ? lines[y][x] : ' ';
            if (!char) continue;

            const pi = (y * width + x) * 4;
            let brightness = getBrightness(pixels[pi], pixels[pi + 1], pixels[pi + 2]);
            if (settings.invert) brightness = 1 - brightness;
            const opacity = (settings.baseOpacity * (1 - brightness)).toFixed(2);

            if (opacity === currentOpacity) {
                currentChars += escapeHtml(char);
            } else {
                if (currentOpacity !== null) {
                    parts.push(`<span style="color:rgba(${fgR},${fgG},${fgB},${currentOpacity})">${currentChars}</span>`);
                }
                currentOpacity = opacity;
                currentChars = escapeHtml(char);
            }
        }
        if (currentOpacity !== null) {
            parts.push(`<span style="color:rgba(${fgR},${fgG},${fgB},${currentOpacity})">${currentChars}</span>`);
        }
        parts.push('\n');
    }

    return parts.join('');
}

// Cached palette
let cachedPalette = null;

// Message handler
self.onmessage = function(e) {
    const { type, pixels, width, height, settings, ansi256Palette } = e.data;

    if (type === 'convert') {
        const startTime = performance.now();

        // Run brightness mapping
        const { ascii, brightnessValues } = brightnessMapping(pixels, width, height, settings);

        let html = null;
        const colorMode = settings.colorMode;

        if (colorMode !== 'monochrome') {
            // Determine palette
            let palette = null;
            if (colorMode === 'ansi256') {
                palette = ansi256Palette;
            } else if (colorMode.startsWith('adaptive')) {
                const numColors = parseInt(colorMode.replace('adaptive', ''));
                if (!cachedPalette || cachedPalette.numColors !== numColors || cachedPalette.saturation !== settings.saturation) {
                    cachedPalette = {
                        numColors,
                        saturation: settings.saturation,
                        colors: quantizeColors(pixels, numColors, settings.saturation)
                    };
                }
                palette = cachedPalette.colors;
            }

            html = applyColorToAscii(ascii, pixels, width, height, brightnessValues, settings, palette);
        } else if (settings.brightnessOpacity) {
            // Monochrome with brightness-based opacity
            html = processMonoBrightnessOpacity(ascii, pixels, width, height, settings);
        }

        const duration = performance.now() - startTime;

        self.postMessage({
            type: 'result',
            ascii,
            html,
            width,
            height,
            duration
        });
    } else if (type === 'clearCache') {
        cachedPalette = null;
    }
};
