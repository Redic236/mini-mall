import { User, USER_ROLE } from '../../src/models';
import type { UserRole } from '../../src/models';
import { signToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';

export interface AuthedUser {
  user: User;
  token: string;
  authHeader: [string, string];
}

export async function authTokenFor(user: User): Promise<string> {
  return signToken({ userId: user.get('id') as number });
}

export async function makeAuthed(user: User): Promise<AuthedUser> {
  const token = await authTokenFor(user);
  return { user, token, authHeader: ['Authorization', `Bearer ${token}`] };
}

export async function createUser(
  overrides: Partial<{ username: string; email: string; password: string; role: UserRole }> = {},
): Promise<AuthedUser> {
  const username = overrides.username ?? `u${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = overrides.email ?? `${username}@example.com`;
  const password = overrides.password ?? 'password123';
  const user = await User.create({
    username,
    email,
    passwordHash: await hashPassword(password),
    avatar: null,
    role: overrides.role ?? USER_ROLE.USER,
  });
  return makeAuthed(user);
}

export async function createAdmin(): Promise<AuthedUser> {
  return createUser({ role: USER_ROLE.ADMIN });
}
