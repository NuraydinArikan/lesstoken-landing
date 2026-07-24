#!/usr/bin/env python3
"""Convert SVG icons to PNG format for Chrome Web Store."""

import subprocess
import sys
from pathlib import Path

# Icon sizes to generate
SIZES = {
    'icon-16.svg': (16, 16),
    'icon-48.svg': (48, 48),
    'icon-128.svg': (128, 128),
}

ICONS_DIR = Path(__file__).parent / 'icons'

def convert_svg_to_png():
    """Convert SVG files to PNG using ImageMagick."""
    try:
        for svg_file, (width, height) in SIZES.items():
            svg_path = ICONS_DIR / svg_file
            png_path = ICONS_DIR / svg_file.replace('.svg', '.png')

            print(f"Converting {svg_file} ({width}x{height})...", end=' ')

            # Use ImageMagick convert command
            cmd = [
                'magick', 'convert',
                '-background', 'none',
                '-density', '300',
                '-resize', f'{width}x{height}',
                str(svg_path),
                str(png_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                print(f"✓ ({png_path.stat().st_size} bytes)")
            else:
                print(f"✗ Error: {result.stderr}")
                return False

        print("\n✅ All icons converted successfully!")
        return True

    except FileNotFoundError:
        print("❌ ImageMagick not found. Install it with:")
        print("   Windows: choco install imagemagick")
        print("   Or download from: https://imagemagick.org/script/download.php#windows")
        return False

if __name__ == '__main__':
    success = convert_svg_to_png()
    sys.exit(0 if success else 1)
