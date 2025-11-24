/**
 * Get the base path for the application
 * This respects the Vite base config which is set to /inboxai/ for production
 * and / for development
 * 
 * DEBUG: On VPS, this should be "" (empty after removing trailing slash from "/inboxai/")
 * In dev, this should be "" (empty after removing trailing slash from "/")
 */
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// CRITICAL DEBUG: Log base path on initialization
if (typeof window !== 'undefined') {
  console.log(
    `[BASE-PATH DEBUG] Vite BASE_URL: "${import.meta.env.BASE_URL}" | Calculated basePath: "${basePath}" | MODE: "${import.meta.env.MODE}"`
  );
}

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
  
  const result = `${basePath}${normalizedUrl}`;
  // DEBUG: Log API calls to verify path transformation
  if (normalizedUrl.startsWith('/api/')) {
    console.log(`[API DEBUG] Original: "${normalizedUrl}" -> Final: "${result}"`);
  }
  return result;
}
