# ASCII Art Studio

A web-based tool that converts images and videos into ASCII art in real-time. Upload an image, load a video, or use your webcam to create text-based art with extensive customization options.

**[Try it live](https://jgresula.github.io/ascii-art-studio/)**

## Features

- **Multiple input sources** - Upload images, load videos, or stream from your webcam
- **Drag & drop and paste support** - Quickly load media by dragging files or pasting from clipboard (Ctrl+V)
- **Real-time preview** - See changes instantly as you adjust settings
- **Custom character sets** - Use your own characters or choose from built-in sets (standard, detailed, blocks)
- **Color customization** - Monochrome, true color, or adaptive palettes with adjustable contrast, saturation, and brightness
- **Built-in presets** - Choose from presets like Retro Terminal, Classic ASCII, High Detail, and more
- **Custom presets** - Save your favorite configurations for later use
- **Flexible export options** - Copy as text, HTML, or Markdown; download as PNG; record animated GIFs or videos
- **Mobile-friendly** - Responsive design with touch-optimized controls

![ascii art example](https://raw.githubusercontent.com/jgresula/ascii-art-studio/refs/heads/main/ascii-art-example.png)

## Settings Guide

### Media Source

This is where you load your content. You can:
- **Drop or paste** an image or video file into the drop zone
- **Enter a URL** to load an image from the web
- **Use your webcam** for live ASCII art - select your camera and optionally mirror the image
- **Control video playback** with play, pause, stop, and seek controls

### Presets

Presets let you quickly switch between different ASCII art styles without adjusting individual settings. The built-in presets include:
- **Default** - Balanced settings for general use
- **High Detail** - More characters per row for finer detail
- **Retro Terminal** - Classic green-on-black terminal look
- **Classic ASCII** - White characters on black background
- **Print Friendly** - Optimized for printing on paper
- **Colorful** - Full color output
- **Blocks** - Uses block characters (█▓▒░) instead of text
- **Opacity variants** - Uses transparency to blend with backgrounds

You can also save your own custom presets and delete them when no longer needed.

### Display

Control how the ASCII output appears on screen:
- **Characters per row** - Higher values mean more detail but smaller characters. Start around 80-120 for a good balance.
- **Font size** - Adjust the size of characters, or enable auto-fit to fill the available space automatically.
- **Font** - Choose from available monospace fonts on your system.
- **Character ratio** - Fine-tune the width-to-height proportion. Auto mode detects the best ratio for your chosen font.

### Characters

Define which characters are used to represent different brightness levels:
- **Preset character sets** - Choose from Standard, Detailed, Blocks, or Simple
- **Custom characters** - Type your own character palette for unique styles
- **Sort** - Automatically sorts characters by their visual brightness
- **Reduce** - Simplify your character set to a specific number of characters

Characters are ordered from darkest to lightest. The first character represents the darkest tones, and the last represents the brightest.

### Output

Fine-tune the visual output:
- **Color mode** - Choose between monochrome (single color), true color (full RGB), or adaptive palettes (4 to 256 colors) to balance between visual richness and file size
- **Background** - Switch between dark and light backgrounds
- **Monochrome colors** - Pick custom foreground and background colors when using monochrome mode
- **Invert brightness** - Swap light and dark mapping, useful when switching between dark and light backgrounds
- **Histogram equalization** - Enhance contrast by redistributing brightness levels, helpful for low-contrast images
- **Contrast** - Increase or decrease the difference between light and dark areas
- **Brightness blend** - Mix brightness information with color; higher values make colors closer to their actual brightness
- **Saturation** - Boost or reduce color intensity
- **Opacity** - Overall transparency of the output
- **Brightness as opacity** - Makes brighter areas more transparent, useful for overlaying ASCII art on other content

### Export

Save and share your creations:
- **Copy as Text** - Plain text for pasting into documents or terminals
- **Copy as HTML** - Self-contained HTML with styling, perfect for web pages
- **Copy as Markdown** - Formatted for README files and documentation
- **Download PNG** - Save as an image file
- **Record GIF** - Capture animated ASCII art from videos or webcam
- **Record Video** - Export as MP4 or WebM with customizable quality settings

## License

MIT
