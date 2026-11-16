/* empty = same origin (Vite proxy in dev, a reverse proxy in prod).
   for another domain set VITE_API_URL and add this site to the backend's FRONTEND_URL / CORS_ORIGINS */
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
export const apiUrl = (path: string) => API_BASE + path;
/* uploads come from the API; stock photos (/photos/…) from the website */
export const assetUrl = (src: string) => (src.startsWith('/uploads/') ? API_BASE + src : src);
