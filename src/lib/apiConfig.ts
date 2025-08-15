export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://backend-2-8j9g.onrender.com";

// Optional: typed helper for fetch
export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let body: any = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    throw new Error(
      (body && (body.detail || body.error || body.message)) ||
        `Request failed: ${res.status}`
    );
  }
  return body;
}