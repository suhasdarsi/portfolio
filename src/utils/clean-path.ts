// With build.format 'file', Astro.url.pathname is '/index.html' or '/notes.html' at build time.
// Turn that into the clean URL Cloudflare serves and the sitemap lists ('/', '/notes').
export function cleanPath(pathname: string): string {
  const path = pathname.replace(/(\/index)?\.html$/, '').replace(/\/$/, '');
  return path || '/';
}
