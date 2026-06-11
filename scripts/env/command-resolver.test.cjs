const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveCommand } = require('./command-resolver.cjs');

test('resolves local Node CLIs without a shell or platform-specific cmd shim', () => {
  const projectRoot = path.resolve('example-project');

  assert.deepEqual(resolveCommand('prisma', ['generate'], projectRoot), {
    command: process.execPath,
    args: [
      path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js'),
      'generate',
    ],
  });
});

test('preserves node and unknown commands', () => {
  assert.deepEqual(resolveCommand('node', ['script.js']), {
    command: process.execPath,
    args: ['script.js'],
  });
  assert.deepEqual(resolveCommand('custom-command', ['argument']), {
    command: 'custom-command',
    args: ['argument'],
  });
});
