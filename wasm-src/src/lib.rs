// ASCII Conversion WASM Module
// Optimized pixel processing functions

#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

// Memory for passing data between JS and WASM
// We'll use a shared buffer approach
static mut BUFFER: [u8; 4 * 1024 * 1024] = [0; 4 * 1024 * 1024]; // 4MB buffer
static mut FLOAT_BUFFER: [f32; 1024 * 1024] = [0.0; 1024 * 1024]; // 1M floats

#[no_mangle]
pub extern "C" fn get_buffer_ptr() -> *mut u8 {
    unsafe { BUFFER.as_mut_ptr() }
}

#[no_mangle]
pub extern "C" fn get_float_buffer_ptr() -> *mut f32 {
    unsafe { FLOAT_BUFFER.as_mut_ptr() }
}

/// Calculate brightness for all pixels
/// Input: RGBA pixels in BUFFER
/// Output: brightness values (0-1) in FLOAT_BUFFER
#[no_mangle]
pub extern "C" fn calc_brightness_batch(pixel_count: usize) {
    unsafe {
        for i in 0..pixel_count {
            let pi = i * 4;
            let r = BUFFER[pi] as f32;
            let g = BUFFER[pi + 1] as f32;
            let b = BUFFER[pi + 2] as f32;
            // ITU-R BT.601 luma coefficients
            FLOAT_BUFFER[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        }
    }
}

/// Apply contrast adjustment to brightness values in FLOAT_BUFFER
#[no_mangle]
pub extern "C" fn apply_contrast(pixel_count: usize, contrast: f32) {
    if contrast == 1.0 {
        return;
    }
    unsafe {
        for i in 0..pixel_count {
            let mut b = FLOAT_BUFFER[i];
            b = (b - 0.5) * contrast + 0.5;
            // Clamp to 0-1
            if b < 0.0 { b = 0.0; }
            if b > 1.0 { b = 1.0; }
            FLOAT_BUFFER[i] = b;
        }
    }
}

/// Apply histogram equalization to brightness values in FLOAT_BUFFER
#[no_mangle]
pub extern "C" fn apply_histogram_eq(pixel_count: usize) {
    unsafe {
        // Build histogram (256 bins)
        let mut histogram = [0u32; 256];
        for i in 0..pixel_count {
            let bin = (FLOAT_BUFFER[i] * 255.0) as usize;
            let bin = if bin > 255 { 255 } else { bin };
            histogram[bin] += 1;
        }

        // Build CDF
        let mut cdf = [0u32; 256];
        cdf[0] = histogram[0];
        for i in 1..256 {
            cdf[i] = cdf[i - 1] + histogram[i];
        }

        // Find minimum non-zero CDF value
        let mut cdf_min = 0u32;
        for i in 0..256 {
            if cdf[i] > 0 {
                cdf_min = cdf[i];
                break;
            }
        }

        let total = pixel_count as f32;
        let cdf_min_f = cdf_min as f32;

        // Apply equalization
        for i in 0..pixel_count {
            let bin = (FLOAT_BUFFER[i] * 255.0) as usize;
            let bin = if bin > 255 { 255 } else { bin };
            FLOAT_BUFFER[i] = (cdf[bin] as f32 - cdf_min_f) / (total - cdf_min_f);
        }
    }
}

/// Find nearest color in palette for each pixel
/// Input: RGBA pixels in BUFFER, palette colors after pixels
/// Output: Overwrites RGB in BUFFER with nearest palette colors
/// palette_offset: where palette starts in BUFFER (after pixel data)
/// palette_size: number of colors in palette
#[no_mangle]
pub extern "C" fn nearest_color_batch(
    pixel_count: usize,
    palette_offset: usize,
    palette_size: usize
) {
    unsafe {
        for i in 0..pixel_count {
            let pi = i * 4;
            let r = BUFFER[pi] as i32;
            let g = BUFFER[pi + 1] as i32;
            let b = BUFFER[pi + 2] as i32;

            let mut min_dist = i32::MAX;
            let mut best_r = r as u8;
            let mut best_g = g as u8;
            let mut best_b = b as u8;

            for j in 0..palette_size {
                let pj = palette_offset + j * 3;
                let pr = BUFFER[pj] as i32;
                let pg = BUFFER[pj + 1] as i32;
                let pb = BUFFER[pj + 2] as i32;

                let dr = r - pr;
                let dg = g - pg;
                let db = b - pb;
                let dist = dr * dr + dg * dg + db * db;

                if dist < min_dist {
                    min_dist = dist;
                    best_r = pr as u8;
                    best_g = pg as u8;
                    best_b = pb as u8;
                }
            }

            BUFFER[pi] = best_r;
            BUFFER[pi + 1] = best_g;
            BUFFER[pi + 2] = best_b;
        }
    }
}

/// Apply saturation adjustment to pixels in BUFFER
#[no_mangle]
pub extern "C" fn apply_saturation(pixel_count: usize, saturation: f32) {
    if saturation == 1.0 {
        return;
    }
    unsafe {
        for i in 0..pixel_count {
            let pi = i * 4;
            let r = BUFFER[pi] as f32;
            let g = BUFFER[pi + 1] as f32;
            let b = BUFFER[pi + 2] as f32;

            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

            let new_r = gray + saturation * (r - gray);
            let new_g = gray + saturation * (g - gray);
            let new_b = gray + saturation * (b - gray);

            // Clamp to 0-255
            BUFFER[pi] = clamp_u8(new_r);
            BUFFER[pi + 1] = clamp_u8(new_g);
            BUFFER[pi + 2] = clamp_u8(new_b);
        }
    }
}

#[inline]
fn clamp_u8(v: f32) -> u8 {
    if v < 0.0 { 0 }
    else if v > 255.0 { 255 }
    else { v as u8 }
}

/// Generate ASCII string from brightness values
/// Input: brightness in FLOAT_BUFFER, chars in BUFFER starting at chars_offset
/// Output: ASCII string in BUFFER starting at output_offset
/// Returns: length of output string
#[no_mangle]
pub extern "C" fn generate_ascii(
    width: usize,
    height: usize,
    chars_offset: usize,
    chars_len: usize,
    output_offset: usize,
    invert: bool
) -> usize {
    unsafe {
        let mut out_idx = output_offset;

        for y in 0..height {
            for x in 0..width {
                let mut brightness = FLOAT_BUFFER[y * width + x];
                if invert {
                    brightness = 1.0 - brightness;
                }

                let char_idx = (brightness * chars_len as f32) as usize;
                let char_idx = if char_idx >= chars_len { chars_len - 1 } else { char_idx };

                BUFFER[out_idx] = BUFFER[chars_offset + char_idx];
                out_idx += 1;
            }
            // Add newline
            BUFFER[out_idx] = b'\n';
            out_idx += 1;
        }

        out_idx - output_offset
    }
}
