const { spawn } = require('child_process');
const { assertDatabaseEnvironment } = require('./env/database-guard.cjs');
const { resolveCommand } = require('./env/command-resolver.cjs');
const { loadEnvFile } = require('./env/env-loader.cjs');

const [, , envFile, ...commandParts] = process.argv;

if (!envFile || commandParts.length === 0) {
  console.error(
    'Usage: node scripts/run-with-env.cjs <env-file> <command> [args...]',
  );
  process.exit(1);
}

try {
  loadEnvFile(envFile);
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
