// Decides what the image tool should do with a file handed to it by the file
// picker or a drag-drop. Kept separate from the page so the rule is testable.

/**
 * @param {{type?: string}|null|undefined} file
 * @returns {'ignore'|'not-image'|'process'}
 *   'ignore'    - nothing was supplied (cancelled picker, empty drop)
 *   'not-image' - a file, but not an image; the caller should say so
 *   'process'   - hand it to the shrinker
 */
export function classifyFile(file) {
  if (!file) return 'ignore';
  if (!file.type || !file.type.startsWith('image/')) return 'not-image';
  return 'process';
}
