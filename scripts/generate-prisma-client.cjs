const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { assertDatabaseEnvironment } = require('./env/database-guard.cjs');
const { resolveCommand } = require('./env/command-resolver.cjs');

const projectRoot = process.cwd();
const hasHostDatabaseEnvironment =
  process.env.DATABASE_URL && process.env.DIRECT_URL;
const hasLocalEnvironmentFile = fs.existsSync(path.join(projectRoot, '.env'));

let command;
let args;

if (hasLocalEnvironmentFile) {
  command = process.execPath;
  args = [
    path.join(projectRoot, 'scripts', 'run-with-env.cjs'),
    '.env',
    'prisma',
    'generate',
  ];
} else if (hasHostDatabaseEnvironment) {
  try {
    const result = assertDatabaseEnvironment(process.env, [
      'prisma',
      'generate',
    ]);
    console.log(
      `Database guard approved ${result.operation} for APP_ENV=${result.appEnvironment}.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const resolved = resolveCommand('prisma', ['generate'], projectRoot);
  command = resolved.command;
  args = resolved.args;
} else {
  console.error(
    'Cannot generate Prisma Client: provide hosting database environment variables or create a local .env file.',
  );
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
