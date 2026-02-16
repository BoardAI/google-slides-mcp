import { slides_v1 } from '@googleapis/slides';

// Re-export Google Slides types for convenience
export type Presentation = slides_v1.Schema$Presentation;
export type Slide = slides_v1.Schema$Page;
export type PageElement = slides_v1.Schema$PageElement;
export type Request = slides_v1.Schema$Request;
export type Response = slides_v1.Schema$Response;
export type BatchUpdateRequest = slides_v1.Schema$BatchUpdatePresentationRequest;
export type BatchUpdateResponse = slides_v1.Schema$BatchUpdatePresentationResponse;

// Custom error types
export class SlidesAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public details?: any,
    public retryable = false
  ) {
    super(message);
    this.name = 'SlidesAPIError';
  }
}
