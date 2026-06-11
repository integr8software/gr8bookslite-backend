const path = require('path');
const { spawn } = require('child_process');
const { assertDatabaseEnvironment } = require('./env/database-guard.cjs');

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
const isWindows = process.platform === 'win32';
const resolvedCommand =
  command === 'nest'
    ? path.resolve(
        process.cwd(),
        'node_modules',
        '.bin',
        isWindows ? 'nest.cmd' : 'nest',
      )
    : command === 'prisma'
      ? path.resolve(
          process.cwd(),
          'node_modules',
          '.bin',
          isWindows ? 'prisma.cmd' : 'prisma',
        )
      : command === 'ts-node'
        ? path.resolve(
            process.cwd(),
            'node_modules',
            '.bin',
            isWindows ? 'ts-node.cmd' : 'ts-node',
          )
        : command === 'node'
          ? process.execPath
          : command;

const useCmdShim = isWindows && resolvedCommand.toLowerCase().endsWith('.cmd');

const child = spawn(resolvedCommand, args, {
  stdio: 'inherit',
  env: process.env,
  shell: useCmdShim,
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
