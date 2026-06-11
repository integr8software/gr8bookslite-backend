const assert = require('node:assert/strict');
const test = require('node:test');
const { parseEnvFile } = require('./env-loader.cjs');

test('parses quoted and unquoted environment values', () => {
  assert.deepEqual(
    parseEnvFile(`
      # comment
      APP_ENV=local
      DATABASE_GUARD_NAME="gr8booksneo_dev"
      EMPTY=''
    `),
    {
      APP_ENV: 'local',
      DATABASE_GUARD_NAME: 'gr8booksneo_dev',
      EMPTY: '',
    },
  );
});
