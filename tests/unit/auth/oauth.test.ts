import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OAuthManager } from '../../../src/auth/oauth.js';
import { TokenStore } from '../../../src/auth/token-store.js';

describe('OAuthManager', () => {
  let tokenStore: jest.Mocked<TokenStore>;
  let oauthManager: OAuthManager;

  beforeEach(() => {
    tokenStore = {
      load: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as any;

    const credentials = {
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      redirect_uris: ['http://localhost:3000/callback'],
    };

    oauthManager = new OAuthManager(credentials, tokenStore);
  });

  it('should generate auth URL with correct scopes', () => {
    const authUrl = oauthManager.getAuthUrl();

    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain('client_id=test-client-id');
    expect(authUrl).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fpresentations');
    expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain('access_type=offline');
  });

  it('should check if authenticated with valid tokens', async () => {
    tokenStore.load.mockResolvedValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() + 3600000, // 1 hour in future
    });

    const isAuth = await oauthManager.isAuthenticated();
    expect(isAuth).toBe(true);
  });

  it('should return false if no tokens exist', async () => {
    tokenStore.load.mockResolvedValue(null);

    const isAuth = await oauthManager.isAuthenticated();
    expect(isAuth).toBe(false);
  });

  it('should return false if tokens are expired and no refresh token', async () => {
    tokenStore.load.mockResolvedValue({
      access_token: 'expired-token',
      refresh_token: '',
      expiry_date: Date.now() - 1000, // Expired
    });

    const isAuth = await oauthManager.isAuthenticated();
    expect(isAuth).toBe(false);
  });
});
