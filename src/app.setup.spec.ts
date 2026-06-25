import { shouldServeLocalStorage } from './app.setup';

describe('shouldServeLocalStorage', () => {
  it('enables local static storage for localhost /storage URLs', () => {
    expect(shouldServeLocalStorage('http://localhost:3000/storage')).toBe(true);
    expect(shouldServeLocalStorage('http://127.0.0.1:3000/storage')).toBe(true);
  });

  it('does not enable local static storage for non-localhost public URLs', () => {
    expect(
      shouldServeLocalStorage('http://gr8booksneo-storage.integr8.com.ph'),
    ).toBe(false);
    expect(
      shouldServeLocalStorage(
        'http://gr8booksneo-storage.integr8.com.ph/storage',
      ),
    ).toBe(false);
  });

  it('does not enable local static storage for other localhost paths', () => {
    expect(shouldServeLocalStorage('http://localhost:3000/api/storage')).toBe(
      false,
    );
    expect(shouldServeLocalStorage('http://localhost:3000')).toBe(false);
  });
});
