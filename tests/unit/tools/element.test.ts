import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { elementGetTool } from '../../../src/tools/element/index.js';
import { deleteElementTool } from '../../../src/tools/element/index.js';
import { elementUpdateTextTool } from '../../../src/tools/element/index.js';
import { elementMoveResizeTool } from '../../../src/tools/element/index.js';
import { elementAddShapeTool } from '../../../src/tools/element/index.js';
import { elementStyleTool } from '../../../src/tools/element/index.js';
import { elementFormatTextTool } from '../../../src/tools/element/index.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Element Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = {
      batchUpdate: jest.fn(),
      getElement: jest.fn(),
      getSlide: jest.fn(),
    } as any;
  });

  describe('deleteElementTool', () => {
    it('should delete an element by ID', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await deleteElementTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        { deleteObject: { objectId: 'elem-abc' } },
      ]);
      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await deleteElementTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('elementGetTool', () => {
    const mockElement = {
      objectId: 'elem-xyz',
      size: {
        width: { magnitude: 3810000, unit: 'EMU' },
        height: { magnitude: 1905000, unit: 'EMU' },
      },
      transform: { translateX: 1270000, translateY: 2540000 },
      shape: {
        text: {
          textElements: [
            { textRun: { content: 'Hello World' } },
          ],
        },
      },
    };

    it('should return summary of element by default', async () => {
      mockClient.getElement.mockResolvedValue(mockElement as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('elem-xyz');
        expect(result.message).toContain('SHAPE');
        expect(result.message).toContain('Hello World');
        expect(result.data?.element).toEqual(mockElement);
      }
    });

    it('should include raw JSON when detailed is true', async () => {
      mockClient.getElement.mockResolvedValue(mockElement as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
        detailed: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('"objectId"');
      }
    });

    it('should handle API errors (element not found)', async () => {
      mockClient.getElement.mockRejectedValue(new SlidesAPIError('Element not found', 404));

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });

    it('should handle element not found in presentation', async () => {
      mockClient.getElement.mockRejectedValue(
        new SlidesAPIError('Element stale-id not found in presentation pres-123', 404)
      );

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'stale-id',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
        expect(result.error.message).toContain('not found');
      }
    });

    it('should format TABLE, VIDEO, LINE, WORD ART, and SHEETS CHART elements', async () => {
      const elements = [
        { objectId: 'tbl-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, table: { rows: 2, columns: 3 } },
        { objectId: 'vid-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, video: { id: 'yt-abc123' } },
        { objectId: 'line-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, line: {} },
        { objectId: 'art-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, wordArt: { renderedText: 'Fancy' } },
        { objectId: 'chart-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, sheetsChart: { spreadsheetId: 'sheet-xyz' } },
        { objectId: 'img-1', size: { width: { magnitude: 0, unit: 'EMU' }, height: { magnitude: 0, unit: 'EMU' } }, transform: { translateX: 0, translateY: 0 }, image: { contentUrl: 'https://example.com/img.png' } },
      ];

      for (const el of elements) {
        mockClient.getElement.mockResolvedValue(el as any);
        const result = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: el.objectId });
        expect(result.success).toBe(true);
      }

      // Verify table specifically
      mockClient.getElement.mockResolvedValue(elements[0] as any);
      const tableResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'tbl-1' });
      expect(tableResult.success).toBe(true);
      if (tableResult.success) {
        expect(tableResult.message).toContain('TABLE');
        expect(tableResult.message).toContain('2 rows × 3 columns');
      }

      // Verify image specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'img-1') as any);
      const imgResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'img-1' });
      expect(imgResult.success).toBe(true);
      if (imgResult.success) {
        expect(imgResult.message).toContain('IMAGE');
        expect(imgResult.message).toContain('https://example.com/img.png');
      }

      // Verify video specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'vid-1') as any);
      const vidResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'vid-1' });
      expect(vidResult.success).toBe(true);
      if (vidResult.success) {
        expect(vidResult.message).toContain('VIDEO');
        expect(vidResult.message).toContain('Video ID: yt-abc123');
      }

      // Verify word art specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'art-1') as any);
      const artResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'art-1' });
      expect(artResult.success).toBe(true);
      if (artResult.success) {
        expect(artResult.message).toContain('WORD ART');
        expect(artResult.message).toContain('Fancy');
      }

      // Verify sheets chart specifically
      mockClient.getElement.mockResolvedValue(elements.find(e => e.objectId === 'chart-1') as any);
      const chartResult = await elementGetTool(mockClient, { presentationId: 'pres-123', elementId: 'chart-1' });
      expect(chartResult.success).toBe(true);
      if (chartResult.success) {
        expect(chartResult.message).toContain('SHEETS CHART');
        expect(chartResult.message).toContain('sheet-xyz');
      }
    });

    it('slideId provided — element found on slide', async () => {
      mockClient.getSlide.mockResolvedValue({
        objectId: 'slide-abc',
        pageElements: [mockElement],
      } as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
        slideId: 'slide-abc',
      });

      expect(mockClient.getSlide).toHaveBeenCalledWith('pres-123', 'slide-abc');
      expect(mockClient.getElement).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain('elem-xyz');
      }
    });

    it('slideId provided — element not found on slide', async () => {
      mockClient.getSlide.mockResolvedValue({
        objectId: 'slide-abc',
        pageElements: [],
      } as any);

      const result = await elementGetTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-xyz',
        slideId: 'slide-abc',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found on slide');
        expect(result.error.message).toContain('slide-abc');
      }
    });
  });

  describe('elementUpdateTextTool', () => {
    it('should replace text with deleteText + insertText batch', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });
      mockClient.getElement.mockResolvedValue({
        shape: { text: { textElements: [{}, { textRun: { content: 'Old text' } }] } },
      } as any);

      const result = await elementUpdateTextTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        text: 'New content',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        { deleteText: { objectId: 'elem-abc', textRange: { type: 'ALL' } } },
        { insertText: { objectId: 'elem-abc', text: 'New content', insertionIndex: 0 } },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBe('elem-abc');
        expect(result.data?.text).toBe('New content');
      }
    });

    it('should handle API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Element not found', 404));

      const result = await elementUpdateTextTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
        text: 'New content',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('elementMoveResizeTool', () => {
    // Mock element: intrinsic size 300pt × 100pt, currently at position 100pt, 200pt, scale 1×1
    const mockPositionElement = {
      objectId: 'elem-abc',
      size: {
        width: { magnitude: 3810000, unit: 'EMU' },   // 300pt intrinsic
        height: { magnitude: 1270000, unit: 'EMU' },  // 100pt intrinsic
      },
      transform: {
        scaleX: 1,
        scaleY: 1,
        shearX: 0,
        shearY: 0,
        translateX: 1270000,  // 100pt
        translateY: 2540000,  // 200pt
      },
    };

    it('move only — updates translateX/Y, preserves scaleX/Y', async () => {
      mockClient.getElement.mockResolvedValue(mockPositionElement as any);
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        x: 50,
        y: 75,
      });

      expect(mockClient.getElement).toHaveBeenCalledWith('pres-123', 'elem-abc');
      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updatePageElementTransform: {
            objectId: 'elem-abc',
            applyMode: 'ABSOLUTE',
            transform: {
              scaleX: 1,
              scaleY: 1,
              shearX: 0,
              shearY: 0,
              translateX: 635000, // 50 * 12700
              translateY: 952500, // 75 * 12700
              unit: 'EMU',
            },
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBe('elem-abc');
        expect(result.data?.x).toBe(50);
        expect(result.data?.y).toBe(75);
      }
    });

    it('resize only — computes scaleX/Y from intrinsic size, preserves translateX/Y', async () => {
      mockClient.getElement.mockResolvedValue(mockPositionElement as any);
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        width: 600,   // 600pt / 300pt intrinsic = scaleX 2
        height: 200,  // 200pt / 100pt intrinsic = scaleY 2
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updatePageElementTransform: {
            objectId: 'elem-abc',
            applyMode: 'ABSOLUTE',
            transform: {
              scaleX: 2,
              scaleY: 2,
              shearX: 0,
              shearY: 0,
              translateX: 1270000,  // preserved (100pt)
              translateY: 2540000,  // preserved (200pt)
              unit: 'EMU',
            },
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.width).toBe(600);
        expect(result.data?.height).toBe(200);
      }
    });

    it('move + resize — all four params computed correctly', async () => {
      mockClient.getElement.mockResolvedValue(mockPositionElement as any);
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        x: 50,
        y: 75,
        width: 600,
        height: 200,
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledWith('pres-123', [
        {
          updatePageElementTransform: {
            objectId: 'elem-abc',
            applyMode: 'ABSOLUTE',
            transform: {
              scaleX: 2,
              scaleY: 2,
              shearX: 0,
              shearY: 0,
              translateX: 635000,
              translateY: 952500,
              unit: 'EMU',
            },
          },
        },
      ]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.x).toBe(50);
        expect(result.data?.y).toBe(75);
        expect(result.data?.width).toBe(600);
        expect(result.data?.height).toBe(200);
      }
    });

    it('no params — returns validation error without calling API', async () => {
      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
      });

      expect(mockClient.getElement).not.toHaveBeenCalled();
      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('resize requested on zero-intrinsic-width element — returns validation error', async () => {
      mockClient.getElement.mockResolvedValue({
        objectId: 'elem-abc',
        size: {
          width: { magnitude: 0, unit: 'EMU' },
          height: { magnitude: 0, unit: 'EMU' },
        },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 0, translateY: 0 },
      } as any);

      const result = await elementMoveResizeTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        width: 300,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('zero intrinsic width');
      }
    });
  });

  describe('elementAddShapeTool', () => {
    it('creates a RECTANGLE with default position and size', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{ createShape: { objectId: 'shape_123' } }] });

      const result = await elementAddShapeTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        shapeType: 'RECTANGLE',
      });

      const call = mockClient.batchUpdate.mock.calls[0];
      const request = (call[1] as any[])[0];
      expect(request.createShape.shapeType).toBe('RECTANGLE');
      expect(request.createShape.elementProperties.pageObjectId).toBe('slide-abc');
      expect(request.createShape.elementProperties.size.width.unit).toBe('EMU');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.shapeType).toBe('RECTANGLE');
        expect(result.data?.elementId).toBeDefined();
      }
    });

    it('creates an ELLIPSE with explicit position and size in points', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{ createShape: { objectId: 'shape_456' } }] });

      const result = await elementAddShapeTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        shapeType: 'ELLIPSE',
        x: 50,
        y: 100,
        width: 200,
        height: 150,
      });

      const call = mockClient.batchUpdate.mock.calls[0];
      const request = (call[1] as any[])[0];
      const EMU = 12700;
      expect(request.createShape.shapeType).toBe('ELLIPSE');
      expect(request.createShape.elementProperties.transform.translateX).toBe(50 * EMU);
      expect(request.createShape.elementProperties.transform.translateY).toBe(100 * EMU);
      expect(request.createShape.elementProperties.size.width.magnitude).toBe(200 * EMU);
      expect(request.createShape.elementProperties.size.height.magnitude).toBe(150 * EMU);
      expect(result.success).toBe(true);
    });

    it('rejects an unknown shape type', async () => {
      const result = await elementAddShapeTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-abc',
        shapeType: 'BANANA' as any,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('BANANA');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Slide not found', 404));

      const result = await elementAddShapeTool(mockClient, {
        presentationId: 'pres-123',
        slideId: 'slide-missing',
        shapeType: 'RECTANGLE',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('elementStyleTool', () => {
    it('sets fill color — sends updateShapeProperties with correct rgbColor and fields mask', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        fillColor: '#FF0000',
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateShapeProperties.objectId).toBe('elem-abc');
      expect(request.updateShapeProperties.shapeProperties.shapeBackgroundFill.solidFill.color.rgbColor).toEqual({
        red: 1, green: 0, blue: 0,
      });
      expect(request.updateShapeProperties.fields).toContain('shapeBackgroundFill.solidFill');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.elementId).toBe('elem-abc');
      }
    });

    it('sets border color — sends outline.outlineFill.solidFill in request and fields mask', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        borderColor: '#0000FF',
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateShapeProperties.shapeProperties.outline.outlineFill.solidFill.color.rgbColor).toEqual({
        red: 0, green: 0, blue: 1,
      });
      expect(request.updateShapeProperties.fields).toContain('outline.outlineFill.solidFill');
      expect(result.success).toBe(true);
    });

    it('sets border width in points — sends outline.weight in EMU', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        borderWidth: 2,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateShapeProperties.shapeProperties.outline.weight).toEqual({
        magnitude: 2 * 12700,
        unit: 'EMU',
      });
      expect(request.updateShapeProperties.fields).toContain('outline.weight');
      expect(result.success).toBe(true);
    });

    it('combines all three — merged fields mask includes all three paths', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        fillColor: '#00FF00',
        borderColor: '#FF0000',
        borderWidth: 3,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      const fields: string = request.updateShapeProperties.fields;
      expect(fields).toContain('shapeBackgroundFill.solidFill');
      expect(fields).toContain('outline.outlineFill.solidFill');
      expect(fields).toContain('outline.weight');
    });

    it('rejects non-hex color string without calling API', async () => {
      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
        fillColor: 'red',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('red');
      }
    });

    it('rejects when no style params are provided', async () => {
      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-abc',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
      }
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Element not found', 404));

      const result = await elementStyleTool(mockClient, {
        presentationId: 'pres-123',
        elementId: 'elem-missing',
        fillColor: '#FF0000',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('api');
      }
    });
  });

  describe('elementFormatTextTool', () => {
    describe('text range', () => {
      it('no startIndex or endIndex — uses type ALL', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.textRange).toEqual({ type: 'ALL' });
      });

      it('both startIndex and endIndex — uses FIXED_RANGE', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
          startIndex: 5,
          endIndex: 10,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.textRange).toEqual({
          type: 'FIXED_RANGE',
          startIndex: 5,
          endIndex: 10,
        });
      });

      it('startIndex only — uses FROM_START_INDEX', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
          startIndex: 3,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.textRange).toEqual({
          type: 'FROM_START_INDEX',
          startIndex: 3,
        });
      });

      it('endIndex only — uses FIXED_RANGE with startIndex 0', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
          endIndex: 8,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.textRange).toEqual({
          type: 'FIXED_RANGE',
          startIndex: 0,
          endIndex: 8,
        });
      });
    });

    describe('text style', () => {
      it('bold — sends updateTextStyle with bold:true, fields:bold', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(1);
        expect(requests[0].updateTextStyle.objectId).toBe('elem-abc');
        expect(requests[0].updateTextStyle.style.bold).toBe(true);
        expect(requests[0].updateTextStyle.fields).toBe('bold');
        expect(result.success).toBe(true);
      });

      it('italic + underline — field mask contains both', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          italic: true,
          underline: true,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        const fields: string = requests[0].updateTextStyle.fields;
        expect(fields).toContain('italic');
        expect(fields).toContain('underline');
      });

      it('fontSize — sends magnitude in PT', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          fontSize: 24,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.style.fontSize).toEqual({ magnitude: 24, unit: 'PT' });
        expect(requests[0].updateTextStyle.fields).toContain('fontSize');
      });

      it('fontFamily — sends weightedFontFamily, field mask weightedFontFamily', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          fontFamily: 'Arial',
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.style.weightedFontFamily).toEqual({ fontFamily: 'Arial' });
        expect(requests[0].updateTextStyle.fields).toContain('weightedFontFamily');
      });

      it('foregroundColor hex — sends opaqueColor rgbColor, field mask foregroundColor', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          foregroundColor: '#FF0000',
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.style.foregroundColor).toEqual({
          opaqueColor: { rgbColor: { red: 1, green: 0, blue: 0 } },
        });
        expect(requests[0].updateTextStyle.fields).toContain('foregroundColor');
      });

      it('backgroundColor hex — sends opaqueColor rgbColor, field mask backgroundColor', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          backgroundColor: '#FFFF00',
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateTextStyle.style.backgroundColor).toEqual({
          opaqueColor: { rgbColor: { red: 1, green: 1, blue: 0 } },
        });
        expect(requests[0].updateTextStyle.fields).toContain('backgroundColor');
      });
    });

    describe('paragraph style', () => {
      it('alignment CENTER — sends updateParagraphStyle, field mask alignment', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          alignment: 'CENTER',
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(1);
        expect(requests[0].updateParagraphStyle.objectId).toBe('elem-abc');
        expect(requests[0].updateParagraphStyle.style.alignment).toBe('CENTER');
        expect(requests[0].updateParagraphStyle.fields).toContain('alignment');
        expect(result.success).toBe(true);
      });

      it('lineSpacing 150 — sends lineSpacing: 150', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          lineSpacing: 150,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateParagraphStyle.style.lineSpacing).toBe(150);
        expect(requests[0].updateParagraphStyle.fields).toContain('lineSpacing');
      });

      it('spaceAbove and spaceBelow — sends PT magnitudes', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          spaceAbove: 10,
          spaceBelow: 5,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests[0].updateParagraphStyle.style.spaceAbove).toEqual({ magnitude: 10, unit: 'PT' });
        expect(requests[0].updateParagraphStyle.style.spaceBelow).toEqual({ magnitude: 5, unit: 'PT' });
        const fields: string = requests[0].updateParagraphStyle.fields;
        expect(fields).toContain('spaceAbove');
        expect(fields).toContain('spaceBelow');
      });
    });

    describe('bullets', () => {
      it('bulletPreset string — sends createParagraphBullets with preset', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(1);
        expect(requests[0].createParagraphBullets.objectId).toBe('elem-abc');
        expect(requests[0].createParagraphBullets.bulletPreset).toBe('BULLET_DISC_CIRCLE_SQUARE');
        expect(result.success).toBe(true);
      });

      it('bulletPreset null — sends deleteParagraphBullets', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bulletPreset: null,
        });

        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(1);
        expect(requests[0].deleteParagraphBullets.objectId).toBe('elem-abc');
        expect(result.success).toBe(true);
      });
    });

    describe('combined requests', () => {
      it('text style + paragraph style — sends both in one batchUpdate call', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
          alignment: 'CENTER',
        });

        expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(2);
        expect(requests.some((r: any) => r.updateTextStyle)).toBe(true);
        expect(requests.some((r: any) => r.updateParagraphStyle)).toBe(true);
        expect(result.success).toBe(true);
      });

      it('text style + bulletPreset — sends both in one batchUpdate call', async () => {
        mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

        await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          bold: true,
          bulletPreset: 'NUMBERED_DIGIT_ALPHA_ROMAN',
        });

        expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
        const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
        expect(requests).toHaveLength(2);
        expect(requests.some((r: any) => r.updateTextStyle)).toBe(true);
        expect(requests.some((r: any) => r.createParagraphBullets)).toBe(true);
      });
    });

    describe('validation', () => {
      it('no style params — returns validation error without calling API', async () => {
        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
        });

        expect(mockClient.batchUpdate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('validation');
        }
      });

      it('invalid hex foregroundColor — returns validation error without calling API', async () => {
        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          foregroundColor: 'red',
        });

        expect(mockClient.batchUpdate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('validation');
          expect(result.error.message).toContain('red');
        }
      });

      it('invalid alignment value — returns validation error without calling API', async () => {
        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          alignment: 'DIAGONAL' as any,
        });

        expect(mockClient.batchUpdate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('validation');
        }
      });

      it('fontSize 0 — returns validation error without calling API', async () => {
        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-abc',
          fontSize: 0,
        });

        expect(mockClient.batchUpdate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('validation');
        }
      });
    });

    describe('error handling', () => {
      it('API error — returns api error response', async () => {
        mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Element not found', 404));

        const result = await elementFormatTextTool(mockClient, {
          presentationId: 'pres-123',
          elementId: 'elem-missing',
          bold: true,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('api');
        }
      });
    });
  });
});
