import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TokenStore } from '../../../src/auth/token-store.js';

describe('TokenStore', () => {
  const testTokenDir = path.join(process.cwd(), '.test-tokens');
  const testTokenPath = path.join(testTokenDir, 'tokens.json');
  let tokenStore: TokenStore;

  beforeEach(async () => {
    tokenStore = new TokenStore(testTokenPath);
    await fs.mkdir(testTokenDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testTokenDir, { recursive: true, force: true });
  });

  it('should store tokens with correct permissions', async () => {
    const tokens = {
      access_token: 'test-access',
      refresh_token: 'test-refresh',
      expiry_date: Date.now() + 3600000,
    };

    await tokenStore.save(tokens);

    const stats = await fs.stat(testTokenPath);
    // 0600 = owner read/write only
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it('should load stored tokens', async () => {
    const tokens = {
      access_token: 'test-access',
      refresh_token: 'test-refresh',
      expiry_date: Date.now() + 3600000,
    };

    await tokenStore.save(tokens);
    const loaded = await tokenStore.load();

    expect(loaded).toEqual(tokens);
  });

  it('should return null when no tokens exist', async () => {
    const loaded = await tokenStore.load();
    expect(loaded).toBeNull();
  });

  it('should return null for corrupted token file', async () => {
    await fs.writeFile(testTokenPath, 'invalid json', { mode: 0o600 });
    const loaded = await tokenStore.load();
    expect(loaded).toBeNull();
  });

  it('should delete tokens', async () => {
    const tokens = {
      access_token: 'test-access',
      refresh_token: 'test-refresh',
      expiry_date: Date.now() + 3600000,
    };

    await tokenStore.save(tokens);
    await tokenStore.delete();

    const loaded = await tokenStore.load();
    expect(loaded).toBeNull();
  });
});
