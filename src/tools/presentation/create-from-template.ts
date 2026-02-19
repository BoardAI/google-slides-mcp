import { SlidesClient } from '../../google/client.js';
import { SlidesAPIError } from '../../google/types.js';
import {
  ToolResponse,
  createSuccessResponse,
  createErrorResponse,
  formatResponse,
} from '../../utils/response.js';

export interface CreateFromTemplateParams {
  templateId: string;
  title: string;
  replacements?: Record<string, string>;
}

export async function createFromTemplateTool(
  client: SlidesClient,
  params: CreateFromTemplateParams
): Promise<ToolResponse> {
  const { templateId, title, replacements } = params;

  if (!title.trim()) {
    return createErrorResponse('validation', 'title must not be empty');
  }

  try {
    const presentationId = await client.copyPresentation(templateId, title);

    const tokens = replacements ? Object.entries(replacements) : [];

    if (tokens.length > 0) {
      const requests = tokens.map(([token, replaceText]) => ({
        replaceAllText: {
          containsText: { text: token, matchCase: true },
          replaceText,
        },
      }));
      await client.batchUpdate(presentationId, requests);
    }

    const url = `https://docs.google.com/presentation/d/${presentationId}`;
    const replacementCount = tokens.length;
    const replaceDesc = replacementCount > 0
      ? ` with ${replacementCount} replacement${replacementCount !== 1 ? 's' : ''}`
      : '';

    return createSuccessResponse(
      formatResponse('simple', `Created "${title}" from template${replaceDesc}: ${url}`),
      { presentationId, title, url, replacementCount }
    );
  } catch (error: any) {
    if (error instanceof SlidesAPIError) {
      return createErrorResponse('api', error.message, error.details, error.retryable);
    }
    return createErrorResponse('api', error.message);
  }
}
