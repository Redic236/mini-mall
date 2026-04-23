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
