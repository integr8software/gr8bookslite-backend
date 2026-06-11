const path = require('path');

const LOCAL_NODE_ENTRY_POINTS = {
  nest: ['@nestjs', 'cli', 'bin', 'nest.js'],
  prisma: ['prisma', 'build', 'index.js'],
  'ts-node': ['ts-node', 'dist', 'bin.js'],
};

function resolveCommand(command, args, projectRoot = process.cwd()) {
  if (command === 'node') {
    return {
      command: process.execPath,
      args,
    };
  }

  const entryPoint = LOCAL_NODE_ENTRY_POINTS[command];
  if (entryPoint) {
    return {
      command: process.execPath,
      args: [path.resolve(projectRoot, 'node_modules', ...entryPoint), ...args],
    };
  }

  return {
    command,
    args,
  };
}

module.exports = {
  resolveCommand,
};
