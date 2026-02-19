import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { slideGetNotesTool, slideSetNotesTool } from '../../../src/tools/slide/notes.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

// ─── Shared mock slide with notes ────────────────────────────────────────────

const notesBodyId = 'notes-body-abc';

const mockSlideWithNotes = {
  objectId: 'slide-1',
  slideProperties: {
    notesPage: {
      pageElements: [
        {
          objectId: 'notes-title-xyz',
          shape: {
            placeholder: { type: 'SLIDE_IMAGE' },
          },
        },
        {
          objectId: notesBodyId,
          shape: {
            placeholder: { type: 'BODY' },
            text: {
              textElements: [
                { textRun: { content: 'These are the speaker ' } },
                { textRun: { content: 'notes.\n' } },
              ],
            },
          },
        },
      ],
    },
  },
};

const mockSlideNoNotes = {
  objectId: 'slide-2',
  slideProperties: {
    notesPage: {
      pageElements: [
        {
          objectId: 'notes-body-empty',
          shape: {
            placeholder: { type: 'BODY' },
            // no text property
          },
        },
      ],
    },
  },
};

// ─── slideGetNotesTool ───────────────────────────────────────────────────────

describe('slideGetNotesTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      getSlide: jest.fn(),
      getPresentation: jest.fn(),
    } as any;

    mockClient.getSlide.mockResolvedValue(mockSlideWithNotes as any);
  });

  it('slideId — returns concatenated notes text', async () => {
    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
    });

    expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.notes).toBe('These are the speaker notes.\n');
      expect(result.data?.slideId).toBe('slide-1');
    }
  });

  it('slideIndex — resolves slideId from presentation then returns notes', async () => {
    mockClient.getPresentation.mockResolvedValue({
      slides: [{ objectId: 'slide-0' }, { objectId: 'slide-1' }],
    } as any);
    mockClient.getSlide.mockResolvedValue(mockSlideWithNotes as any);

    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 1,
    });

    expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-1');
    expect(result.success).toBe(true);
  });

  it('slide with no notes text — returns empty string', async () => {
    mockClient.getSlide.mockResolvedValue(mockSlideNoNotes as any);

    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-2',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.notes).toBe('');
    }
  });

  it('neither slideId nor slideIndex — returns validation error', async () => {
    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
    });

    expect(mockClient.getSlide).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('slideIndex out of bounds — returns validation error', async () => {
    mockClient.getPresentation.mockResolvedValue({
      slides: [{ objectId: 'slide-0' }],
    } as any);

    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.getSlide.mockRejectedValue(new SlidesAPIError('Not found', 404));

    const result = await slideGetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-missing',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});

// ─── slideSetNotesTool ───────────────────────────────────────────────────────

describe('slideSetNotesTool', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      getSlide: jest.fn(),
      getPresentation: jest.fn(),
      batchUpdate: jest.fn(),
    } as any;

    mockClient.getSlide.mockResolvedValue(mockSlideWithNotes as any);
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });
  });

  it('sets notes — sends deleteText + insertText with notes body objectId', async () => {
    const result = await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
      text: 'New speaker notes',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(2);
    expect(requests[0].deleteText.objectId).toBe(notesBodyId);
    expect(requests[0].deleteText.textRange).toEqual({ type: 'ALL' });
    expect(requests[1].insertText.objectId).toBe(notesBodyId);
    expect(requests[1].insertText.text).toBe('New speaker notes');
    expect(requests[1].insertText.insertionIndex).toBe(0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.slideId).toBe('slide-1');
    }
  });

  it('empty text — sends only deleteText (clears notes)', async () => {
    mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

    await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
      text: '',
    });

    const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
    expect(requests).toHaveLength(1);
    expect(requests[0].deleteText).toBeDefined();
  });

  it('slideIndex — resolves slideId then sets notes', async () => {
    mockClient.getPresentation.mockResolvedValue({
      slides: [{ objectId: 'slide-0' }, { objectId: 'slide-1' }],
    } as any);

    await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideIndex: 1,
      text: 'Notes for slide 2',
    });

    expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-1');
    expect(mockClient.batchUpdate).toHaveBeenCalled();
  });

  it('batchUpdate called with new presentationId', async () => {
    await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
      text: 'Notes',
    });

    expect(mockClient.batchUpdate.mock.calls[0][0]).toBe('pres-123');
  });

  it('neither slideId nor slideIndex — returns validation error', async () => {
    const result = await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      text: 'Notes',
    });

    expect(mockClient.batchUpdate).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('validation');
  });

  it('handles API errors', async () => {
    mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

    const result = await slideSetNotesTool(mockClient, {
      presentationId: 'pres-123',
      slideId: 'slide-1',
      text: 'Notes',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe('api');
  });
});
