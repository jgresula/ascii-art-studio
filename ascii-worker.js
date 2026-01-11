// ASCII Conversion Web Worker
// Handles heavy pixel processing off the main thread
// Uses WebAssembly for performance-critical operations

// WASM module state
let wasm = null;
let wasmMemory = null;
let wasmBuffer = null;
let wasmFloatBuffer = null;

// Load WASM module
async function initWasm() {
    try {
        const response = await fetch('ascii-wasm.wasm');
        const bytes = await response.arrayBuffer();
        const module = await WebAssembly.instantiate(bytes, {});
        wasm = module.instance.exports;

        // Get pointers to WASM memory buffers
        wasmMemory = wasm.memory;
        const bufferPtr = wasm.get_buffer_ptr();
        const floatBufferPtr = wasm.get_float_buffer_ptr();

        // Create views into WASM memory
        wasmBuffer = new Uint8Array(wasmMemory.buffer, bufferPtr, 4 * 1024 * 1024);
        wasmFloatBuffer = new Float32Array(wasmMemory.buffer, floatBufferPtr, 1024 * 1024);

        console.log('WASM module loaded successfully');
        return true;
    } catch (e) {
        console.warn('WASM load failed, using JS fallback:', e);
        wasm = null;
        return false;
    }
}

// Initialize WASM on worker start
initWasm();

// Pre-built escape lookup table for all ASCII chars (0-127)
// Most chars return themselves, only &<>"' need escaping
const escapeTable = new Array(128);
for (let i = 0; i < 128; i++) {
    escapeTable[i] = String.fromCharCode(i);
}
escapeTable[38] = '&amp;';   // &
escapeTable[60] = '&lt;';    // <
escapeTable[62] = '&gt;';    // >
escapeTable[34] = '&quot;';  // "
escapeTable[39] = '&#039;';  // '

// Fast single-char escape using lookup table
function escapeChar(char) {
    const code = char.charCodeAt(0);
    return code < 128 ? escapeTable[code] : char;
}

// Color string cache - avoids creating new strings for same colors
const colorCache = new Map();
const COLOR_CACHE_MAX = 50000;

function getColorString(r, g, b, opacity) {
    // Create cache key: pack RGBA into single number
    // opacity is 0-100 (2 decimal precision)
    const opacityInt = Math.round(opacity * 100);
    const key = (opacityInt << 24) | (r << 16) | (g << 8) | b;

    let cached = colorCache.get(key);
    if (cached !== undefined) {
        return cached;
    }

    // Generate color string
    let colorStr;
    if (opacityInt < 100) {
        colorStr = `rgba(${r},${g},${b},${(opacityInt / 100).toFixed(2)})`;
    } else {
        colorStr = `rgb(${r},${g},${b})`;
    }

    // Cache with size limit
    if (colorCache.size >= COLOR_CACHE_MAX) {
        colorCache.clear();
    }
    colorCache.set(key, colorStr);

    return colorStr;
}

// JS fallback functions
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

function applyContrastJS(brightness, contrast, useHistogram) {
    if (contrast === 1 && !useHistogram) {
        return brightness;
    }

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

// WASM-accelerated brightness mapping
function brightnessMapping(pixels, width, height, settings) {
    const pixelCount = width * height;
    let brightnessValues;

    if (wasm && pixelCount <= 1024 * 1024) {
        // Use WASM
        // Copy pixels to WASM buffer
        wasmBuffer.set(pixels.subarray(0, pixelCount * 4));

        // Calculate brightness using WASM
        wasm.calc_brightness_batch(pixelCount);

        // Apply histogram equalization if needed
        if (settings.histogram) {
            wasm.apply_histogram_eq(pixelCount);
        }

        // Apply contrast if needed
        if (settings.contrast !== 1) {
            wasm.apply_contrast(pixelCount, settings.contrast);
        }

        // Copy brightness values from WASM
        brightnessValues = new Float32Array(pixelCount);
        brightnessValues.set(wasmFloatBuffer.subarray(0, pixelCount));
    } else {
        // JS fallback
        brightnessValues = new Float32Array(pixelCount);
        for (let i = 0; i < pixelCount; i++) {
            const pi = i * 4;
            brightnessValues[i] = getBrightness(pixels[pi], pixels[pi + 1], pixels[pi + 2]);
        }
        applyContrastJS(brightnessValues, settings.contrast, settings.histogram);
    }

    // Generate ASCII string
    let chars = settings.chars;
    if (settings.invert) {
        chars = chars.split('').reverse().join('');
    }

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

// WASM-accelerated color application
function applyColorToAscii(ascii, pixels, width, height, brightnessData, settings, palette) {
    if (settings.colorMode === 'monochrome') {
        return null;
    }

    const pixelCount = width * height;
    const useWasm = wasm && pixelCount <= 1024 * 1024;

    // Use WASM for palette mapping and saturation if available
    let processedPixels = pixels;

    if (useWasm && (palette || settings.saturation !== 1)) {
        // Copy pixels to WASM buffer
        wasmBuffer.set(pixels.subarray(0, pixelCount * 4));

        // Apply palette mapping using WASM if needed
        if (palette) {
            // Copy palette to WASM buffer after pixel data
            const paletteOffset = pixelCount * 4;
            for (let i = 0; i < palette.length; i++) {
                wasmBuffer[paletteOffset + i * 3] = palette[i][0];
                wasmBuffer[paletteOffset + i * 3 + 1] = palette[i][1];
                wasmBuffer[paletteOffset + i * 3 + 2] = palette[i][2];
            }
            wasm.nearest_color_batch(pixelCount, paletteOffset, palette.length);
        }

        // Apply saturation using WASM if needed
        if (settings.saturation !== 1) {
            wasm.apply_saturation(pixelCount, settings.saturation);
        }

        // Create new array with processed pixels
        processedPixels = new Uint8Array(pixelCount * 4);
        processedPixels.set(wasmBuffer.subarray(0, pixelCount * 4));
    }

    // Pre-compute all colors into typed arrays to avoid per-pixel allocations
    const colorR = new Uint8Array(pixelCount);
    const colorG = new Uint8Array(pixelCount);
    const colorB = new Uint8Array(pixelCount);
    const opacities = new Float32Array(pixelCount);

    const doBlend = settings.blend !== 0.5 && brightnessData;
    const doBrightnessOpacity = settings.brightnessOpacity && brightnessData;
    const baseOpacity = settings.baseOpacity;
    const invert = settings.invert;
    const adjustedBlend = (settings.blend - 0.5) * 2;

    for (let idx = 0; idx < pixelCount; idx++) {
        const i = idx * 4;
        let r = processedPixels[i];
        let g = processedPixels[i + 1];
        let b = processedPixels[i + 2];

        // If we didn't use WASM for palette/saturation, do it in JS
        if (!useWasm) {
            if (palette) {
                const nearest = nearestColor(r, g, b, palette);
                r = nearest[0];
                g = nearest[1];
                b = nearest[2];
            }

            if (settings.saturation !== 1) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = Math.round(gray + settings.saturation * (r - gray));
                g = Math.round(gray + settings.saturation * (g - gray));
                b = Math.round(gray + settings.saturation * (b - gray));
            }
        }

        // Apply brightness blend
        if (doBlend) {
            const charBrightness = brightnessData[idx];
            let factor;
            if (adjustedBlend >= 0) {
                factor = 1 - adjustedBlend * (1 - charBrightness);
            } else {
                factor = 1 + (-adjustedBlend) * (1 - charBrightness);
            }
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
        }

        // Clamp and store
        colorR[idx] = r < 0 ? 0 : (r > 255 ? 255 : r);
        colorG[idx] = g < 0 ? 0 : (g > 255 ? 255 : g);
        colorB[idx] = b < 0 ? 0 : (b > 255 ? 255 : b);

        // Calculate opacity
        let opacity = baseOpacity;
        if (doBrightnessOpacity) {
            let charBrightness = brightnessData[idx];
            if (invert) {
                charBrightness = 1 - charBrightness;
            }
            opacity *= (1 - charBrightness);
        }
        opacities[idx] = opacity;
    }

    // Build HTML with span combining
    const parts = [];
    let lineStart = 0;

    for (let y = 0; y < height; y++) {
        let currentColor = null;
        let currentChars = '';

        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const charCode = ascii.charCodeAt(lineStart + x);

            // Skip if no character (shouldn't happen but safety check)
            if (charCode === 10 || isNaN(charCode)) continue;

            const colorStr = getColorString(colorR[idx], colorG[idx], colorB[idx], opacities[idx]);

            if (colorStr === currentColor) {
                currentChars += escapeChar(String.fromCharCode(charCode));
            } else {
                if (currentColor !== null) {
                    parts.push('<span style="color:');
                    parts.push(currentColor);
                    parts.push('">');
                    parts.push(currentChars);
                    parts.push('</span>');
                }
                currentColor = colorStr;
                currentChars = escapeChar(String.fromCharCode(charCode));
            }
        }

        if (currentColor !== null) {
            parts.push('<span style="color:');
            parts.push(currentColor);
            parts.push('">');
            parts.push(currentChars);
            parts.push('</span>');
        }
        parts.push('\n');
        lineStart += width + 1; // +1 for newline
    }

    return parts.join('');
}

// Process monochrome with brightness opacity
function processMonoBrightnessOpacity(ascii, pixels, width, height, settings) {
    const parts = [];
    const { fgR, fgG, fgB, baseOpacity, invert } = settings;
    const pixelCount = width * height;

    // Calculate brightness using WASM if available
    let brightnessValues;
    if (wasm && pixelCount <= 1024 * 1024) {
        wasmBuffer.set(pixels.subarray(0, pixelCount * 4));
        wasm.calc_brightness_batch(pixelCount);
        brightnessValues = wasmFloatBuffer;
    } else {
        brightnessValues = new Float32Array(pixelCount);
        for (let i = 0; i < pixelCount; i++) {
            const pi = i * 4;
            brightnessValues[i] = getBrightness(pixels[pi], pixels[pi + 1], pixels[pi + 2]);
        }
    }

    // Pre-compute opacities
    const opacities = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
        let brightness = brightnessValues[i];
        if (invert) brightness = 1 - brightness;
        opacities[i] = baseOpacity * (1 - brightness);
    }

    let lineStart = 0;
    for (let y = 0; y < height; y++) {
        let currentOpacity = -1;
        let currentChars = '';

        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const charCode = ascii.charCodeAt(lineStart + x);
            if (charCode === 10 || isNaN(charCode)) continue;

            // Quantize opacity to 2 decimal places for better span combining
            const opacity = Math.round(opacities[idx] * 100) / 100;

            if (opacity === currentOpacity) {
                currentChars += escapeChar(String.fromCharCode(charCode));
            } else {
                if (currentOpacity >= 0) {
                    parts.push('<span style="color:rgba(');
                    parts.push(fgR);
                    parts.push(',');
                    parts.push(fgG);
                    parts.push(',');
                    parts.push(fgB);
                    parts.push(',');
                    parts.push(currentOpacity.toFixed(2));
                    parts.push(')">');
                    parts.push(currentChars);
                    parts.push('</span>');
                }
                currentOpacity = opacity;
                currentChars = escapeChar(String.fromCharCode(charCode));
            }
        }
        if (currentOpacity >= 0) {
            parts.push('<span style="color:rgba(');
            parts.push(fgR);
            parts.push(',');
            parts.push(fgG);
            parts.push(',');
            parts.push(fgB);
            parts.push(',');
            parts.push(currentOpacity.toFixed(2));
            parts.push(')">');
            parts.push(currentChars);
            parts.push('</span>');
        }
        parts.push('\n');
        lineStart += width + 1;
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

        // Run brightness mapping (WASM-accelerated)
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
        colorCache.clear();
    }
};
