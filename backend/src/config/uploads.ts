import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Filesystem root for user-uploaded files. Lives under the backend working
 * directory so dev / CI / Docker can use a single predictable location; in
 * the Docker image this is mounted as a named volume for persistence.
 */
export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
export const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * MIME → extension whitelist. Blacklisting is brittle (svg with inline JS,
 * HEIC quirks, legacy bmp, etc.) — stick to three formats the browser
 * renders safely in an <img> tag.
 */
export const ACCEPTED_AVATAR_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function ensureUploadsDir(): void {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

/**
 * Never trust the client-supplied filename — use a random slug so we can't
 * be tricked into traversal, shell metacharacters, or collision overwrites.
 */
export function randomAvatarFilename(mimeType: string): string {
  const ext = ACCEPTED_AVATAR_EXTENSIONS[mimeType];
  if (!ext) throw new Error(`Unsupported mime: ${mimeType}`);
  const slug = crypto.randomUUID().replace(/-/g, '');
  return `${slug}${ext}`;
}

export function avatarUrl(filename: string): string {
  return `/uploads/avatars/${filename}`;
}

/**
 * Resolve a stored avatar URL back to a local path if it points at our own
 * uploads tree. Returns null for external URLs (picsum seed data, etc.) so
 * the caller knows not to attempt a filesystem delete.
 */
export function localPathFromAvatarUrl(url: string): string | null {
  const prefix = '/uploads/';
  if (!url.startsWith(prefix)) return null;
  const rel = url.slice(prefix.length);
  const resolved = path.resolve(UPLOADS_ROOT, rel);
  // Defense-in-depth: refuse anything that escaped the uploads root.
  if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return resolved;
}
