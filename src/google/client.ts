import { slides, slides_v1 } from '@googleapis/slides';
import { OAuthManager } from '../auth/oauth.js';
import {
  Presentation,
  Slide,
  BatchUpdateRequest,
  BatchUpdateResponse,
  SlidesAPIError,
} from './types.js';

export class SlidesClient {
  private oauthManager: OAuthManager;
  private slidesAPI: slides_v1.Slides | null = null;

  constructor(oauthManager: OAuthManager) {
    this.oauthManager = oauthManager;
  }

  private async getAPI(): Promise<slides_v1.Slides> {
    // Ensure we have fresh access token
    await this.oauthManager.getAccessToken();

    const auth = this.oauthManager.getOAuth2Client();
    return slides({ version: 'v1', auth });
  }

  async createPresentation(title: string): Promise<Presentation> {
    try {
      const api = await this.getAPI();
      const response = await api.presentations.create({
        requestBody: {
          title,
        },
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getPresentation(presentationId: string): Promise<Presentation> {
    try {
      const api = await this.getAPI();
      const response = await api.presentations.get({
        presentationId,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async batchUpdate(
    presentationId: string,
    requests: BatchUpdateRequest['requests']
  ): Promise<BatchUpdateResponse> {
    try {
      const api = await this.getAPI();
      const response = await api.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests,
        },
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): SlidesAPIError {
    const code = error.code || error.response?.status || 500;
    const message = error.message || 'Unknown error occurred';

    // Map common errors to user-friendly messages
    switch (code) {
      case 400:
        return new SlidesAPIError(
          `Invalid request: ${message}`,
          400,
          error.response?.data,
          false
        );
      case 401:
        return new SlidesAPIError(
          'Authentication failed. Please re-authenticate.',
          401,
          error.response?.data,
          false
        );
      case 403:
        return new SlidesAPIError(
          'Permission denied. Check presentation sharing settings.',
          403,
          error.response?.data,
          false
        );
      case 404:
        return new SlidesAPIError(
          'Presentation not found. It may have been deleted.',
          404,
          error.response?.data,
          false
        );
      case 429:
        return new SlidesAPIError(
          'Rate limit exceeded. Please try again in a moment.',
          429,
          error.response?.data,
          true // Retryable
        );
      case 500:
      case 503:
        return new SlidesAPIError(
          'Google Slides API is temporarily unavailable.',
          code,
          error.response?.data,
          true // Retryable
        );
      default:
        return new SlidesAPIError(message, code, error.response?.data, false);
    }
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (error instanceof SlidesAPIError && error.retryable) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }
}
