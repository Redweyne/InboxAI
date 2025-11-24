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
  // If URL has an absolute scheme (http:, https:, mailto:, tel:, blob:, data:, etc.), return as is
  // Regex matches scheme format: starts with letter, followed by letters/digits/+/-/., then colon
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) {
    return url;
  }
  
  // If URL is protocol-relative (//example.com), return as is
  if (url.startsWith('//')) {
    return url;
  }
  
  // Normalize URL to ensure it starts with /
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  
  // If URL already starts with base path, return as is
  // Check for: exact match, followed by /, followed by ?, or followed by #
  // This prevents double-prefixing while allowing URLs like /inboxai-something
  if (
    normalizedUrl === basePath ||
    normalizedUrl.startsWith(`${basePath}/`) ||
    normalizedUrl.startsWith(`${basePath}?`) ||
    normalizedUrl.startsWith(`${basePath}#`)
  ) {
    return normalizedUrl;
  }
  
  // Otherwise, prepend base path
  return `${basePath}${normalizedUrl}`;
}
