// A relative URL works on localhost, LAN devices, and behind a reverse proxy.
export const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
