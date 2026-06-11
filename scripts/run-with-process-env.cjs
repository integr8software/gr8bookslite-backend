const { spawn } = require('child_process');
const { assertDatabaseEnvironment } = require('./env/database-guard.cjs');
const { resolveCommand } = require('./env/command-resolver.cjs');

const [, , expectedEnvironment, ...commandParts] = process.argv;

if (!expectedEnvironment || commandParts.length === 0) {
  console.error(
    'Usage: node scripts/run-with-process-env.cjs <expected-app-env> <command> [args...]',
  );
  process.exit(1);
}

if (process.env.APP_ENV !== expectedEnvironment) {
  console.error(
    `Refusing command: expected APP_ENV=${expectedEnvironment}, received APP_ENV=${process.env.APP_ENV ?? '(missing)'}.`,
  );
  process.exit(1);
}

try {
  const result = assertDatabaseEnvironment(process.env, commandParts);
  console.log(
    `Database guard approved ${result.operation} for APP_ENV=${result.appEnvironment}.`,
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const [command, ...args] = commandParts;
const resolved = resolveCommand(command, args);

const child = spawn(resolved.command, resolved.args, {
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
