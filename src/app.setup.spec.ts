import { shouldServeLocalStorage, shouldServeVpsStaticStorage } from './app.setup';

describe('shouldServeLocalStorage', () => {
  it('enables static storage for /storage URLs', () => {
    expect(shouldServeLocalStorage('http://localhost:3000/storage')).toBe(true);
    expect(shouldServeLocalStorage('http://127.0.0.1:3000/storage')).toBe(true);
    expect(shouldServeLocalStorage('https://gr8booksneo-storage.integr8.com.ph/storage')).toBe(true);
  });

  it('does not enable static storage for non-storage public URL paths', () => {
    expect(shouldServeLocalStorage('http://gr8booksneo-storage.integr8.com.ph')).toBe(false);
    expect(shouldServeLocalStorage('http://localhost:3000/api/storage')).toBe(false);
    expect(shouldServeLocalStorage('http://localhost:3000')).toBe(false);
  });
});

describe('shouldServeVpsStaticStorage', () => {
  it('enables VPS static storage when vps provider has root and /storage public URL', () => {
    expect(
      shouldServeVpsStaticStorage({
        provider: 'vps',
        publicUrl: 'https://gr8booksneo-storage.integr8.com.ph/storage',
        storageRoot: 'I:\\Gr8BooksNeo\\storage',
      }),
    ).toBe(true);
  });

  it('enables localhost static storage when vps provider has root and /storage public URL', () => {
    expect(
      shouldServeVpsStaticStorage({
        provider: 'vps',
        publicUrl: 'http://localhost:3003/storage',
        storageRoot: './storage',
      }),
    ).toBe(true);
  });

  it('does not enable static storage for non-vps providers', () => {
    expect(
      shouldServeVpsStaticStorage({
        provider: 'supabase',
        publicUrl: 'https://gr8booksneo-storage.integr8.com.ph/storage',
        storageRoot: 'I:\\Gr8BooksNeo\\storage',
      }),
    ).toBe(false);
  });

  it('does not enable static storage without a root or /storage public URL', () => {
    expect(
      shouldServeVpsStaticStorage({
        provider: 'vps',
        publicUrl: 'https://gr8booksneo-storage.integr8.com.ph/storage',
        storageRoot: '',
      }),
    ).toBe(false);
    expect(
      shouldServeVpsStaticStorage({
        provider: 'vps',
        publicUrl: 'https://gr8booksneo-storage.integr8.com.ph',
        storageRoot: 'I:\\Gr8BooksNeo\\storage',
      }),
    ).toBe(false);
  });
});
