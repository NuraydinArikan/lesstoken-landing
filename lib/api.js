// Backend API base URL.
// Static export inlines NEXT_PUBLIC_* at build time.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.lesstoken.app';

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
