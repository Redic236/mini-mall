import fs from 'node:fs';
import { Op } from 'sequelize';
import { User } from '../models';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';
import { signToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { localPathFromAvatarUrl } from '../config/uploads';
import { logger } from '../utils/logger';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function toPublic(u: User): PublicUser {
  return {
    id: u.get('id') as number,
    username: u.get('username') as string,
    email: u.get('email') as string,
    avatar: (u.get('avatar') as string | null) ?? null,
    role: ((u.get('role') as 'user' | 'admin' | undefined) ?? 'user'),
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const conflict = await User.findOne({
    where: {
      [Op.or]: [{ email: input.email }, { username: input.username }],
    },
  });
  if (conflict) {
    const plain = conflict.get({ plain: true }) as { email: string; username: string };
    const field = plain.email === input.email ? '邮箱' : '用户名';
    throw new HttpError(409, `${field}已被注册`);
  }

  const passwordHash = await hashPassword(input.password);
  const created = await User.create({
    username: input.username,
    email: input.email,
    passwordHash,
    avatar: null,
  });
  const fresh = await User.findByPk(created.get('id') as number);
  if (!fresh) throw new HttpError(500, '注册失败');

  const publicUser = toPublic(fresh);
  audit({ event: 'auth.register', entity: 'user', entityId: publicUser.id, details: { email: publicUser.email } });
  return { user: publicUser, token: signToken({ userId: publicUser.id }) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.scope('withPassword').findOne({ where: { email: input.email } });
  if (!user) throw new HttpError(401, '邮箱或密码错误');

  const hash = user.get('passwordHash') as string;
  const ok = await verifyPassword(input.password, hash);
  if (!ok) throw new HttpError(401, '邮箱或密码错误');

  const fresh = await User.findByPk(user.get('id') as number);
  if (!fresh) throw new HttpError(500, '登录失败');
  const publicUser = toPublic(fresh);
  audit({ event: 'auth.login', entity: 'user', entityId: publicUser.id });
  return { user: publicUser, token: signToken({ userId: publicUser.id }) };
}

export async function getCurrentUser(userId: number): Promise<PublicUser> {
  const user = await User.findByPk(userId);
  if (!user) throw new HttpError(404, '用户不存在');
  return toPublic(user);
}

/**
 * Swap the user's stored avatar URL. The new file has already been written
 * to disk by multer at this point; we just persist the URL and try to
 * delete the previous local file (best-effort — a missing old file or an
 * externally-hosted URL shouldn't block the update).
 */
export async function updateAvatar(userId: number, avatarUrl: string): Promise<PublicUser> {
  const user = await User.findByPk(userId);
  if (!user) throw new HttpError(404, '用户不存在');

  const previous = user.get('avatar') as string | null;
  user.set('avatar', avatarUrl);
  await user.save();

  if (previous) {
    const oldPath = localPathFromAvatarUrl(previous);
    if (oldPath) {
      fs.promises.unlink(oldPath).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') {
          logger.warn('Failed to delete previous avatar', { path: oldPath, err: err.message });
        }
      });
    }
  }

  audit({ event: 'user.avatar.update', entity: 'user', entityId: userId, details: { avatar: avatarUrl } });
  return toPublic(user);
}
