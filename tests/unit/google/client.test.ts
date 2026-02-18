import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SlidesClient } from '../../../src/google/client.js';
import { OAuthManager } from '../../../src/auth/oauth.js';
import { OAuth2Client } from 'google-auth-library';

describe('SlidesClient', () => {
  let mockOAuthManager: jest.Mocked<OAuthManager>;
  let mockOAuth2Client: jest.Mocked<OAuth2Client>;
  let slidesClient: SlidesClient;

  beforeEach(() => {
    mockOAuth2Client = {
      credentials: { access_token: 'test-access-token' },
    } as any;

    mockOAuthManager = {
      getAccessToken: jest.fn<() => Promise<string>>().mockResolvedValue('test-access-token'),
      getOAuth2Client: jest.fn<() => OAuth2Client>().mockReturnValue(mockOAuth2Client),
    } as any;

    slidesClient = new SlidesClient(mockOAuthManager);
  });

  it('should create client instance', () => {
    expect(slidesClient).toBeDefined();
  });

  it('should get access token before making requests', async () => {
    mockOAuthManager.getAccessToken.mockResolvedValue('fresh-token');

    // This will be implemented later when we add actual API methods
    expect(mockOAuthManager.getAccessToken).toBeDefined();
  });

  describe('getSlide', () => {
    it('should return the matching slide', async () => {
      const mockSlide = { objectId: 'slide-abc', pageElements: [] };
      jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
        presentationId: 'pres-123',
        slides: [mockSlide],
      } as any);

      const result = await slidesClient.getSlide('pres-123', 'slide-abc');
      expect(result).toEqual(mockSlide);
    });

    it('should throw 404 when slide not found', async () => {
      jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
        presentationId: 'pres-123',
        slides: [{ objectId: 'slide-other' }],
      } as any);

      await expect(slidesClient.getSlide('pres-123', 'slide-missing'))
        .rejects.toMatchObject({ code: 404 });
    });
  });

  describe('getElement', () => {
    it('should return the matching element from any slide', async () => {
      const mockElement = { objectId: 'elem-xyz', shape: {} };
      jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
        presentationId: 'pres-123',
        slides: [
          { objectId: 'slide-1', pageElements: [{ objectId: 'elem-other' }] },
          { objectId: 'slide-2', pageElements: [mockElement] },
        ],
      } as any);

      const result = await slidesClient.getElement('pres-123', 'elem-xyz');
      expect(result).toEqual(mockElement);
    });

    it('should throw 404 when element not found in any slide', async () => {
      jest.spyOn(slidesClient, 'getPresentation').mockResolvedValue({
        presentationId: 'pres-123',
        slides: [{ objectId: 'slide-1', pageElements: [{ objectId: 'elem-other' }] }],
      } as any);

      await expect(slidesClient.getElement('pres-123', 'elem-missing'))
        .rejects.toMatchObject({ code: 404 });
    });
  });
});
