// Keyless "Düzelt / temizle": whitespace cleanup adapted from the desktop
// app's normalize_whitespace, but paragraph-aware (the desktop flattens to
// one line; on the web we keep paragraph structure).
export function localClean(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) =>
      p
        .split('\n')
        .map((line) => line.split(/\s+/).filter(Boolean).join(' '))
        .filter((line) => line.length > 0)
        .join('\n')
    )
    .filter((p) => p.length > 0);
  return paragraphs.join('\n\n');
}
