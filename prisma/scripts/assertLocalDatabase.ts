const localDatabaseHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Run this through an npm script ending in :local.',
    );
  }

  let hostname: string;

  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  if (!localDatabaseHosts.has(hostname)) {
    throw new Error(
      `Refusing to modify non-local database host "${hostname}". Run this command against local PostgreSQL only.`,
    );
  }
}
