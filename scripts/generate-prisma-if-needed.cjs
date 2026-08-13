const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { assertDatabaseEnvironment } = require('./env/database-guard.cjs');
const { resolveCommand } = require('./env/command-resolver.cjs');
const { loadEnvFile } = require('./env/env-loader.cjs');

const [, , envFile] = process.argv;
const projectRoot = process.cwd();
const commandParts = ['prisma', 'generate'];

if (!envFile) {
  console.error('Usage: node scripts/generate-prisma-if-needed.cjs <env-file>');
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isPrismaClientCurrent() {
  const schemaPath = path.resolve(projectRoot, 'prisma', 'schema.prisma');
  const generatedClientPath = path.resolve(projectRoot, 'node_modules', '.prisma', 'client');
  const generatedSchemaPath = path.join(generatedClientPath, 'schema.prisma');
  const generatedPackagePath = path.join(generatedClientPath, 'package.json');
  const installedClientPackagePath = path.resolve(projectRoot, 'node_modules', '@prisma', 'client', 'package.json');
  const generatedEntryPath = path.join(generatedClientPath, 'index.js');

  if (
    !fs.existsSync(generatedEntryPath) ||
    !fs.existsSync(generatedPackagePath) ||
    !fs.existsSync(installedClientPackagePath) ||
    !fs.existsSync(generatedSchemaPath)
  ) {
    return false;
  }

  const schemaUpdatedAt = fs.statSync(schemaPath).mtimeMs;
  const generatedSchemaUpdatedAt = fs.statSync(generatedSchemaPath).mtimeMs;
  const generatedPackage = readJson(generatedPackagePath);
  const installedClientPackage = readJson(installedClientPackagePath);

  return (
    generatedPackage.version === installedClientPackage.version &&
    generatedSchemaUpdatedAt >= schemaUpdatedAt
  );
}

function addWindowsPrismaEnginePaths(environment) {
  if (process.platform !== 'win32') {
    return;
  }

  const enginesPath = path.resolve(projectRoot, 'node_modules', '@prisma', 'engines');
  const schemaEnginePath = path.join(enginesPath, 'schema-engine-windows.exe');
  const queryEnginePath = path.join(enginesPath, 'query_engine-windows.dll.node');

  if (fs.existsSync(schemaEnginePath)) {
    environment.PRISMA_SCHEMA_ENGINE_BINARY ??= schemaEnginePath;
  }

  if (fs.existsSync(queryEnginePath)) {
    environment.PRISMA_QUERY_ENGINE_LIBRARY ??= queryEnginePath;
  }

  environment.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING ??= '1';
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

if (isPrismaClientCurrent()) {
  console.log('Prisma Client is up to date; skipping generate.');
  process.exit(0);
}

addWindowsPrismaEnginePaths(process.env);

const resolved = resolveCommand('prisma', ['generate'], projectRoot);
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
