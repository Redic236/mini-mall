import { migrator } from '../src/config/migrator';
import { sequelize } from '../src/config/database';

type Command = 'up' | 'down' | 'status';

function parseCommand(raw: string | undefined): Command {
  if (raw === 'up' || raw === 'down' || raw === 'status') return raw;
  if (!raw) return 'up';
  throw new Error(`Unknown command "${raw}". Use: up | down | status`);
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv[2]);

  try {
    if (command === 'status') {
      const pending = await migrator.pending();
      const executed = await migrator.executed();
      const fmt = (m: { name: string }): string => `  - ${m.name}`;
      console.log(`Applied (${executed.length}):`);
      console.log(executed.length === 0 ? '  (none)' : executed.map(fmt).join('\n'));
      console.log(`Pending (${pending.length}):`);
      console.log(pending.length === 0 ? '  (none)' : pending.map(fmt).join('\n'));
      return;
    }

    if (command === 'up') {
      const applied = await migrator.up();
      if (applied.length === 0) {
        console.log('No pending migrations. Nothing to do.');
      } else {
        console.log(`Applied ${applied.length} migration(s):`);
        for (const m of applied) console.log(`  - ${m.name}`);
      }
      return;
    }

    if (command === 'down') {
      // Roll back exactly one step at a time. Require explicit intent.
      const rolled = await migrator.down();
      if (rolled.length === 0) {
        console.log('No migrations to roll back.');
      } else {
        console.log(`Rolled back ${rolled.length} migration(s):`);
        for (const m of rolled) console.log(`  - ${m.name}`);
      }
      return;
    }
  } finally {
    await sequelize.close();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Migration failed: ${message}`);
  process.exit(1);
});
