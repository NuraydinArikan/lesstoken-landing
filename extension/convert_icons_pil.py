#!/usr/bin/env python3
"""Convert SVG icons to PNG using PIL - creates the LessToken mark icon."""

from PIL import Image, ImageDraw
from pathlib import Path

ICONS_DIR = Path(__file__).parent / 'icons'

def create_icon(size):
    """Create LessToken mark icon at given size."""
    # Colors
    bg_color = (11, 43, 69)  # #0B2B45 - dark blue background
    border_color = (6, 182, 212)  # #06B6D4 - cyan border
    text_color = (255, 255, 255)  # white text

    # Create image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Calculate dimensions
    border_width = max(1, size // 20)  # Proportional border
    rounded = size // 5  # Rounded corners

    # Draw background with rounded corners
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=rounded,
        fill=bg_color
    )

    # Draw cyan border
    draw.rounded_rectangle(
        [(border_width, border_width), (size - border_width - 1, size - border_width - 1)],
        radius=rounded - border_width,
        outline=border_color,
        width=max(1, border_width)
    )

    # Add "LT" text (simplified for small icons)
    if size >= 32:  # Only add text for larger icons
        # Rough font size - PIL doesn't have built-in fonts at arbitrary sizes in basic mode
        # For now, we'll use basic drawing
        text_size = size // 3
        # Draw two rectangles as a simple "LT" shape
        padding = size // 6

        # L shape (vertical + horizontal)
        draw.rectangle(
            [(padding, padding), (padding + text_size // 3, size - padding)],
            fill=text_color
        )
        draw.rectangle(
            [(padding, size - padding - text_size // 3), (size - padding, size - padding)],
            fill=text_color
        )

        # T shape (horizontal + vertical)
        draw.rectangle(
            [(size // 2, padding), (size - padding, padding + text_size // 3)],
            fill=text_color
        )
        draw.rectangle(
            [(size // 2 + text_size // 4, padding + text_size // 3), (size // 2 + text_size // 2, size - padding)],
            fill=text_color
        )

    return img

def main():
    """Convert all icon sizes."""
    ICONS_DIR.mkdir(exist_ok=True)

    sizes = {
        'icon-16.png': 16,
        'icon-48.png': 48,
        'icon-128.png': 128,
    }

    print("Creating PNG icons...")
    for filename, size in sizes.items():
        print(f"  {filename} ({size}x{size})...", end=' ')
        try:
            img = create_icon(size)
            output_path = ICONS_DIR / filename
            img.save(output_path, 'PNG')
            print(f"✓ ({output_path.stat().st_size} bytes)")
        except Exception as e:
            print(f"✗ Error: {e}")
            return False

    print("\n✅ All PNG icons created successfully!")
    return True

if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)
