// Auth token is stored in localStorage for simplicity. This is safe only as
// long as the app never renders untrusted HTML (no dangerouslySetInnerHTML,
// no raw product-description rendering). The AntD components we use today
// escape text content by default, so there is no DOM-XSS surface. If the
// project ever adds rich-text / HTML rendering of user or admin input:
//   1. Move the JWT to an httpOnly cookie set by the backend.
//   2. Add CSRF protection (double-submit cookie or SameSite=strict).
//   3. Ship a Content-Security-Policy header on the HTML document.
// Until then, localStorage is the pragmatic choice.
const TOKEN_KEY = 'mini-mall.token';
const USER_KEY = 'mini-mall.user';

export interface StoredUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  setStoredToken(null);
  setStoredUser(null);
}

// Callback that top-level app code can register to be notified when a 401
// is observed so it can navigate to /login without http.ts depending on the
// router or redux store directly.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
