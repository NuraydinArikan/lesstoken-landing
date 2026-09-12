// Decides what the image tool should do with a file handed to it by the file
// picker or a drag-drop. Kept separate from the page so the rule is testable.

const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;

/**
 * @param {{type?: string, name?: string}|null|undefined} file
 * @returns {'ignore'|'not-image'|'heic'|'process'}
 *   'ignore'    - nothing was supplied (cancelled picker, empty drop)
 *   'not-image' - a file, but not an image; the caller should say so
 *   'heic'      - an HEIC/HEIF photo; most browsers' createImageBitmap
 *                 cannot decode these, so the caller should say so instead
 *                 of letting the decode fail deep inside the resizer
 *   'process'   - hand it to the shrinker
 */
export function classifyFile(file) {
  if (!file) return 'ignore';
  const type = (file.type || '').toLowerCase();
  // Chrome/Firefox often report an empty or generic type for HEIC/HEIF
  // files (unlike Safari, which reports image/heic correctly), so the
  // extension is checked too.
  const looksLikeHeic = type === 'image/heic' || type === 'image/heif' || HEIC_EXTENSION_RE.test(file.name || '');
  if (looksLikeHeic) return 'heic';
  if (!type.startsWith('image/')) return 'not-image';
  return 'process';
}
