import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { addTextBoxTool } from '../../../src/tools/helpers/text.js';
import { addImageTool } from '../../../src/tools/helpers/image.js';
import { addTableTool } from '../../../src/tools/helpers/table.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Helper Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
    } as any;
  });

  describe('addTextBoxTool', () => {
    it('creates a TEXT_BOX shape then inserts text in one batchUpdate', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

      const result = await addTextBoxTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        text: 'Hello world',
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(2);
      expect(requests[0].createShape.shapeType).toBe('TEXT_BOX');
      expect(requests[0].createShape.elementProperties.pageObjectId).toBe('slide-abc');
      expect(requests[1].insertText.text).toBe('Hello world');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBeDefined();
        expect(result.data?.text).toBe('Hello world');
      }
    });

    it('converts x, y, width, height from points to EMU', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

      await addTextBoxTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        text: 'Hello',
        x: 50,
        y: 75,
        width: 200,
        height: 100,
      });

      const EMU = 12700;
      const createShape = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0].createShape;
      expect(createShape.elementProperties.transform.translateX).toBe(50 * EMU);
      expect(createShape.elementProperties.transform.translateY).toBe(75 * EMU);
      expect(createShape.elementProperties.size.width.magnitude).toBe(200 * EMU);
      expect(createShape.elementProperties.size.height.magnitude).toBe(100 * EMU);
    });
  });

  describe('addImageTool', () => {
    it('creates image from HTTPS URL with correct pageObjectId', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{ createImage: { objectId: 'image_123' } }],
      });

      const result = await addImageTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        url: 'https://example.com/photo.png',
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.createImage.url).toBe('https://example.com/photo.png');
      expect(request.createImage.elementProperties.pageObjectId).toBe('slide-abc');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBeDefined();
        expect(result.data?.url).toBe('https://example.com/photo.png');
      }
    });

    it('converts x, y, width, height from points to EMU in elementProperties', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{ createImage: { objectId: 'image_456' } }],
      });

      await addImageTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        url: 'https://example.com/photo.png',
        x: 50,
        y: 100,
        width: 300,
        height: 200,
      });

      const EMU = 12700;
      const props = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0].createImage.elementProperties;
      expect(props.transform.translateX).toBe(50 * EMU);
      expect(props.transform.translateY).toBe(100 * EMU);
      expect(props.size.width.magnitude).toBe(300 * EMU);
      expect(props.size.height.magnitude).toBe(200 * EMU);
    });

    it('rejects non-HTTPS URL without calling the API', async () => {
      const result = await addImageTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        url: 'http://example.com/photo.png',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('https');
      }
    });

    it('rejects empty URL without calling the API', async () => {
      const result = await addImageTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        url: '',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('Invalid image URL or image could not be fetched', 400)
      );

      const result = await addImageTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        url: 'https://example.com/private.png',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('addTableTool', () => {
    it('sends createTable with correct rows, columns, and pageObjectId', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{ createTable: { objectId: 'table_123' } }],
      });

      const result = await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        rows: 3,
        columns: 4,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.createTable.rows).toBe(3);
      expect(request.createTable.columns).toBe(4);
      expect(request.createTable.elementProperties.pageObjectId).toBe('slide-abc');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBe('table_123');
        expect(result.data?.rows).toBe(3);
        expect(result.data?.columns).toBe(4);
      }
    });

    it('converts x, y, width, height from points to EMU', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{ createTable: { objectId: 'table_456' } }],
      });

      await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        rows: 2,
        columns: 2,
        x: 50,
        y: 75,
        width: 400,
        height: 200,
      });

      const EMU = 12700;
      const props = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0].createTable.elementProperties;
      expect(props.transform.translateX).toBe(50 * EMU);
      expect(props.transform.translateY).toBe(75 * EMU);
      expect(props.size.width.magnitude).toBe(400 * EMU);
      expect(props.size.height.magnitude).toBe(200 * EMU);
    });

    it('applies default position (100, 100) and size (400 × 200) when omitted', async () => {
      mockClient.batchUpdate.mockResolvedValue({
        replies: [{ createTable: { objectId: 'table_789' } }],
      });

      await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        rows: 2,
        columns: 3,
      });

      const EMU = 12700;
      const props = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0].createTable.elementProperties;
      expect(props.transform.translateX).toBe(100 * EMU);
      expect(props.transform.translateY).toBe(100 * EMU);
      expect(props.size.width.magnitude).toBe(400 * EMU);
      expect(props.size.height.magnitude).toBe(200 * EMU);
    });

    it('rejects rows < 1 without calling the API', async () => {
      const result = await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        rows: 0,
        columns: 3,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('rows');
      }
    });

    it('rejects columns < 1 without calling the API', async () => {
      const result = await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        rows: 3,
        columns: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('columns');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(
        new SlidesAPIError('Slide not found', 404)
      );

      const result = await addTableTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-missing',
        rows: 2,
        columns: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });
});
