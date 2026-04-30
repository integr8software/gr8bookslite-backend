const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseEnvFile(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnvFile(fileName) {
  const fullPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const parsed = parseEnvFile(fileContents);

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const [, , envFile, ...commandParts] = process.argv;

if (!envFile || commandParts.length === 0) {
  console.error(
    'Usage: node scripts/run-with-env.cjs <env-file> <command> [args...]',
  );
  process.exit(1);
}

loadEnvFile('.env');
if (envFile !== '.env') {
  loadEnvFile(envFile);
}

const [command, ...args] = commandParts;
const isWindows = process.platform === 'win32';
const resolvedCommand =
  command === 'nest'
    ? path.resolve(process.cwd(), 'node_modules', '.bin', isWindows ? 'nest.cmd' : 'nest')
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
