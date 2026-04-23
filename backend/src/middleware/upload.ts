import multer from 'multer';
import {
  ACCEPTED_AVATAR_EXTENSIONS,
  AVATARS_DIR,
  AVATAR_MAX_BYTES,
  randomAvatarFilename,
} from '../config/uploads';
import { HttpError } from '../utils/apiResponse';

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => {
    try {
      cb(null, randomAvatarFilename(file.mimetype));
    } catch (err) {
      cb(err as Error, '');
    }
  },
});

/**
 * Single-file multipart upload for the `avatar` form field. Rejects early on
 * MIME mismatch so we don't write unwanted bytes to disk first.
 */
export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_AVATAR_EXTENSIONS[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new HttpError(400, '仅支持 JPG / PNG / WEBP 图片'));
    }
  },
});
