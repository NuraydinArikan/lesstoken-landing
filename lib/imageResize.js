// lib/imageResize.js
// Same rule as the desktop app's ImageService._resize_image: fit within
// max dimensions, preserve aspect ratio, never upscale.
export function computeTargetDimensions(width, height, maxWidth = 1024, maxHeight = 768) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    scale,
  };
}
