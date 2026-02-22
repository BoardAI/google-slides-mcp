import { slides, slides_v1 } from '@googleapis/slides';
import { drive } from '@googleapis/drive';
import { writeFile } from 'fs/promises';
import { OAuthManager } from '../auth/oauth.js';
import {
  Presentation,
  Slide,
  PageElement,
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
    const code = error.response?.status || (typeof error.code === 'number' ? error.code : 500);
    const message = error.message || 'Unknown error occurred';
    const details = error.response?.data;

    // Extract Google API error message when available
    const apiMessage: string | undefined =
      details?.error?.message ||
      details?.error?.errors?.[0]?.message ||
      (typeof details === 'string' ? details : undefined);

    switch (code) {
      case 400:
        return new SlidesAPIError(
          `Invalid request: ${apiMessage ?? message}`,
          400,
          details,
          false
        );
      case 401:
        return new SlidesAPIError(
          'Authentication failed. Please re-authenticate.',
          401,
          details,
          false
        );
      case 403:
        return new SlidesAPIError(
          apiMessage ?? 'Permission denied. Check that the Google Drive API is enabled and presentation sharing settings are correct.',
          403,
          details,
          false
        );
      case 404:
        return new SlidesAPIError(
          'Presentation not found. It may have been deleted.',
          404,
          details,
          false
        );
      case 429:
        return new SlidesAPIError(
          'Rate limit exceeded. Please try again in a moment.',
          429,
          details,
          true
        );
      case 500:
      case 503:
        return new SlidesAPIError(
          apiMessage ?? 'Google API is temporarily unavailable.',
          code,
          details,
          true
        );
      default:
        return new SlidesAPIError(apiMessage ?? message, code, details, false);
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

  async getSlide(presentationId: string, slideId: string): Promise<Slide> {
    const presentation = await this.getPresentation(presentationId);
    const slide = (presentation.slides ?? []).find(s => s.objectId === slideId);
    if (!slide) {
      throw new SlidesAPIError(
        `Slide ${slideId} not found in presentation ${presentationId}`,
        404,
        undefined,
        false
      );
    }
    return slide;
  }

  async getElement(presentationId: string, elementId: string): Promise<PageElement> {
    const presentation = await this.getPresentation(presentationId);
    for (const slide of presentation.slides ?? []) {
      const element = slide.pageElements?.find(e => e.objectId === elementId);
      if (element) return element;
    }
    throw new SlidesAPIError(
      `Element ${elementId} not found in presentation ${presentationId}`,
      404,
      undefined,
      false
    );
  }

  async getThumbnail(
    presentationId: string,
    slideId: string,
    size?: 'SMALL' | 'MEDIUM' | 'LARGE'
  ): Promise<{ contentUrl: string; width: number; height: number }> {
    try {
      const api = await this.getAPI();
      const response = await api.presentations.pages.getThumbnail({
        presentationId,
        pageObjectId: slideId,
        'thumbnailProperties.thumbnailSize': size ?? 'LARGE',
      });
      return {
        contentUrl: response.data.contentUrl!,
        width: response.data.width!,
        height: response.data.height!,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async listPresentations(
    query?: string,
    limit?: number
  ): Promise<Array<{ id: string; name: string; modifiedTime?: string; webViewLink?: string }>> {
    try {
      const auth = this.oauthManager.getOAuth2Client();
      const driveApi = drive({ version: 'v3', auth });

      let q = "mimeType = 'application/vnd.google-apps.presentation' and trashed = false";
      if (query) {
        const escaped = query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        q += ` and name contains '${escaped}'`;
      }

      const response = await driveApi.files.list({
        q,
        fields: 'files(id, name, modifiedTime, webViewLink)',
        pageSize: limit ?? 20,
        orderBy: 'modifiedTime desc',
      });

      return (response.data.files ?? []).map(f => ({
        id: f.id!,
        name: f.name ?? '(untitled)',
        modifiedTime: f.modifiedTime ?? undefined,
        webViewLink: f.webViewLink ?? undefined,
      }));
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async exportPresentation(
    presentationId: string,
    format: 'pdf' | 'pptx',
    outputPath: string
  ): Promise<{ sizeBytes: number }> {
    const mimeTypes = {
      pdf: 'application/pdf',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    try {
      const auth = this.oauthManager.getOAuth2Client();
      const driveApi = drive({ version: 'v3', auth });

      const response = await driveApi.files.export(
        { fileId: presentationId, mimeType: mimeTypes[format] },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      await writeFile(outputPath, buffer);
      return { sizeBytes: buffer.length };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deletePresentation(presentationId: string): Promise<never> {
    throw new SlidesAPIError(
      'deletePresentation requires Google Drive API access. ' +
        'This MVP only supports the Slides API. ' +
        'Please delete presentations through the Google Slides UI.',
      501,
      undefined,
      false
    );
  }

  async renamePresentation(presentationId: string, title: string): Promise<void> {
    try {
      const auth = this.oauthManager.getOAuth2Client();
      const driveApi = drive({ version: 'v3', auth });
      await driveApi.files.update({
        fileId: presentationId,
        requestBody: { name: title },
        fields: 'id',
      });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async copyPresentation(templateId: string, title: string): Promise<string> {
    try {
      const auth = this.oauthManager.getOAuth2Client();
      const driveApi = drive({ version: 'v3', auth });
      const response = await driveApi.files.copy({
        fileId: templateId,
        requestBody: { name: title },
        fields: 'id',
      });
      return response.data.id!;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}
