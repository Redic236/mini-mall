/**
 * Promote an existing user to admin by email. Used for one-off local dev or
 * on a fresh deployment where no admin exists yet.
 *
 *   npm run admin:promote -- user@example.com
 */
import 'dotenv/config';
import { sequelize } from '../src/config/database';
import { User, USER_ROLE } from '../src/models';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    process.stderr.write('Usage: npm run admin:promote -- <email>\n');
    process.exit(2);
  }

  await sequelize.authenticate();
  const user = await User.findOne({ where: { email } });
  if (!user) {
    process.stderr.write(`No user with email ${email}\n`);
    await sequelize.close();
    process.exit(1);
  }

  const wasRole = user.get('role') as string;
  if (wasRole === USER_ROLE.ADMIN) {
    process.stdout.write(`${email} is already an admin — no change\n`);
  } else {
    user.set('role', USER_ROLE.ADMIN);
    await user.save();
    process.stdout.write(`Promoted ${email} (was '${wasRole}') → admin\n`);
  }
  await sequelize.close();
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
