const fs = require('fs');
const path = require('path');

function parseEnvFile(content) {
  const environment = {};

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

    environment[key] = value;
  }

  return environment;
}

function loadEnvFile(fileName, targetEnvironment = process.env) {
  const fullPath = path.resolve(process.cwd(), fileName);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Environment file not found: ${fullPath}`);
  }

  const parsed = parseEnvFile(fs.readFileSync(fullPath, 'utf8'));
  Object.assign(targetEnvironment, parsed);

  return targetEnvironment;
}

module.exports = {
  loadEnvFile,
  parseEnvFile,
};
