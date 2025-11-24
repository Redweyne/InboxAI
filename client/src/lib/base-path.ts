/**
 * Get the base path for the application
 * This respects the Vite base config which is set to /inboxai/ for production
 * and / for development
 */
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * Prepend base path to a URL
 * @param url - The URL to prepend the base path to
 * @returns The URL with the base path prepended
 */
export function withBasePath(url: string): string {
  // If URL already starts with base path, return as is
  if (url.startsWith(basePath)) {
    return url;
  }
  // Otherwise, prepend base path
  return `${basePath}${url}`;
}
