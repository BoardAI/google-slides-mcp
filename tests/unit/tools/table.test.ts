import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { tableSetCellTool, tableFormatCellTextTool, tableStyleCellTool } from '../../../src/tools/table/cell.js';
import { tableInsertRowsTool, tableDeleteRowsTool, tableSetRowHeightTool } from '../../../src/tools/table/rows.js';
import { tableInsertColumnsTool, tableDeleteColumnsTool, tableSetColumnWidthTool } from '../../../src/tools/table/columns.js';
import { tableMergeCellsTool } from '../../../src/tools/table/merge.js';
import { SlidesClient } from '../../../src/google/client.js';
import { SlidesAPIError } from '../../../src/google/types.js';

describe('Table Tools', () => {
  let mockClient: jest.Mocked<SlidesClient>;

  beforeEach(() => {
    mockClient = { batchUpdate: jest.fn() } as any;
  });

  // ─── tableSetCellTool ───────────────────────────────────────────────────────

  describe('tableSetCellTool', () => {
    it('sends deleteText + insertText with cellLocation', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

      const result = await tableSetCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 1,
        column: 2,
        text: 'Hello',
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(2);
      expect(requests[0].deleteText).toEqual({
        objectId: 'table-abc',
        cellLocation: { rowIndex: 1, columnIndex: 2 },
        textRange: { type: 'ALL' },
      });
      expect(requests[1].insertText).toEqual({
        objectId: 'table-abc',
        cellLocation: { rowIndex: 1, columnIndex: 2 },
        text: 'Hello',
        insertionIndex: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.tableId).toBe('table-abc');
        expect(result.data?.row).toBe(1);
        expect(result.data?.column).toBe(2);
      }
    });

    it('empty text — sends only deleteText, skips insertText', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableSetCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        text: '',
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(1);
      expect(requests[0].deleteText).toBeDefined();
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Table not found', 404));

      const result = await tableSetCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        row: 0,
        column: 0,
        text: 'x',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableFormatCellTextTool ────────────────────────────────────────────────

  describe('tableFormatCellTextTool', () => {
    it('bold on all cell text — updateTextStyle with cellLocation, type ALL, fields:bold', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 1,
        bold: true,
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(1);
      expect(requests[0].updateTextStyle.objectId).toBe('table-abc');
      expect(requests[0].updateTextStyle.cellLocation).toEqual({ rowIndex: 0, columnIndex: 1 });
      expect(requests[0].updateTextStyle.textRange).toEqual({ type: 'ALL' });
      expect(requests[0].updateTextStyle.style.bold).toBe(true);
      expect(requests[0].updateTextStyle.fields).toBe('bold');
      expect(result.success).toBe(true);
    });

    it('char range — uses FIXED_RANGE with startIndex and endIndex', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        bold: true,
        startIndex: 2,
        endIndex: 7,
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests[0].updateTextStyle.textRange).toEqual({
        type: 'FIXED_RANGE',
        startIndex: 2,
        endIndex: 7,
      });
    });

    it('fontSize 18 — sends fontSize magnitude in PT', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 1,
        column: 0,
        fontSize: 18,
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests[0].updateTextStyle.style.fontSize).toEqual({ magnitude: 18, unit: 'PT' });
      expect(requests[0].updateTextStyle.fields).toContain('fontSize');
    });

    it('foregroundColor hex — sends opaqueColor rgbColor', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        foregroundColor: '#0000FF',
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests[0].updateTextStyle.style.foregroundColor).toEqual({
        opaqueColor: { rgbColor: { red: 0, green: 0, blue: 1 } },
      });
    });

    it('alignment CENTER — sends updateParagraphStyle with cellLocation', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 2,
        column: 1,
        alignment: 'CENTER',
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(1);
      expect(requests[0].updateParagraphStyle.objectId).toBe('table-abc');
      expect(requests[0].updateParagraphStyle.cellLocation).toEqual({ rowIndex: 2, columnIndex: 1 });
      expect(requests[0].updateParagraphStyle.style.alignment).toBe('CENTER');
      expect(requests[0].updateParagraphStyle.fields).toContain('alignment');
      expect(result.success).toBe(true);
    });

    it('bold + alignment — sends both updateTextStyle and updateParagraphStyle in one call', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

      await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        bold: true,
        alignment: 'RIGHT',
      });

      expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(2);
      expect(requests.some((r: any) => r.updateTextStyle)).toBe(true);
      expect(requests.some((r: any) => r.updateParagraphStyle)).toBe(true);
    });

    it('no formatting props — returns validation error without calling API', async () => {
      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('invalid hex — returns validation error without calling API', async () => {
      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        foregroundColor: 'blue',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('validation');
        expect(result.error.message).toContain('blue');
      }
    });

    it('invalid alignment — returns validation error without calling API', async () => {
      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        alignment: 'DIAGONAL' as any,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableFormatCellTextTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        row: 0,
        column: 0,
        bold: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableStyleCellTool ─────────────────────────────────────────────────────

  describe('tableStyleCellTool', () => {
    it('backgroundColor — sends updateTableCellProperties with tableCellBackgroundFill', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 1,
        backgroundColor: '#FF0000',
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableCellProperties.objectId).toBe('table-abc');
      expect(request.updateTableCellProperties.tableRange.location).toEqual({
        rowIndex: 0,
        columnIndex: 1,
      });
      expect(request.updateTableCellProperties.tableRange.rowSpan).toBe(1);
      expect(request.updateTableCellProperties.tableRange.columnSpan).toBe(1);
      expect(
        request.updateTableCellProperties.tableCellProperties.tableCellBackgroundFill.solidFill.color.rgbColor
      ).toEqual({ red: 1, green: 0, blue: 0 });
      expect(request.updateTableCellProperties.fields).toContain('tableCellBackgroundFill.solidFill');
      expect(result.success).toBe(true);
    });

    it('padding — sends contentInsets with PT magnitudes', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      const insets = request.updateTableCellProperties.tableCellProperties.contentInsets;
      expect(insets.top).toEqual({ magnitude: 8, unit: 'PT' });
      expect(insets.bottom).toEqual({ magnitude: 8, unit: 'PT' });
      expect(insets.left).toEqual({ magnitude: 12, unit: 'PT' });
      expect(insets.right).toEqual({ magnitude: 12, unit: 'PT' });
      expect(request.updateTableCellProperties.fields).toContain('contentInsets');
    });

    it('rowSpan and columnSpan > 1 — tableRange reflects span', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 1,
        column: 2,
        rowSpan: 2,
        columnSpan: 3,
        backgroundColor: '#00FF00',
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableCellProperties.tableRange.rowSpan).toBe(2);
      expect(request.updateTableCellProperties.tableRange.columnSpan).toBe(3);
    });

    it('backgroundColor + padding — fields mask contains both paths', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 5,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      const fields: string = request.updateTableCellProperties.fields;
      expect(fields).toContain('tableCellBackgroundFill.solidFill');
      expect(fields).toContain('contentInsets');
    });

    it('no style props — returns validation error without calling API', async () => {
      const result = await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('invalid hex backgroundColor — returns validation error without calling API', async () => {
      const result = await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        backgroundColor: 'green',
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableStyleCellTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        row: 0,
        column: 0,
        backgroundColor: '#000000',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableInsertRowsTool ────────────────────────────────────────────────────

  describe('tableInsertRowsTool', () => {
    it('inserts 1 row below rowIndex 2 by default', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableInsertRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndex: 2,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.insertTableRows.tableObjectId).toBe('table-abc');
      expect(request.insertTableRows.cellLocation).toEqual({ rowIndex: 2 });
      expect(request.insertTableRows.insertBelow).toBe(true);
      expect(request.insertTableRows.number).toBe(1);
      expect(result.success).toBe(true);
    });

    it('inserts 3 rows above rowIndex 0 when insertBelow:false and count:3', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableInsertRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndex: 0,
        count: 3,
        insertBelow: false,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.insertTableRows.insertBelow).toBe(false);
      expect(request.insertTableRows.number).toBe(3);
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableInsertRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        rowIndex: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableDeleteRowsTool ────────────────────────────────────────────────────

  describe('tableDeleteRowsTool', () => {
    it('deletes a single row — sends one deleteTableRow request', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableDeleteRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [2],
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(1);
      expect(requests[0].deleteTableRow.tableObjectId).toBe('table-abc');
      expect(requests[0].deleteTableRow.cellLocation).toEqual({ rowIndex: 2 });
      expect(result.success).toBe(true);
    });

    it('deletes multiple rows — requests sorted highest index first', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}, {}] });

      await tableDeleteRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [1, 4, 2],
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(3);
      expect(requests[0].deleteTableRow.cellLocation.rowIndex).toBe(4);
      expect(requests[1].deleteTableRow.cellLocation.rowIndex).toBe(2);
      expect(requests[2].deleteTableRow.cellLocation.rowIndex).toBe(1);
    });

    it('empty rowIndices — returns validation error without calling API', async () => {
      const result = await tableDeleteRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [],
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableDeleteRowsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        rowIndices: [0],
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableSetRowHeightTool ──────────────────────────────────────────────────

  describe('tableSetRowHeightTool', () => {
    it('sets minRowHeight for a single row in PT', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableSetRowHeightTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [1],
        minHeight: 50,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableRowStyle.objectId).toBe('table-abc');
      expect(request.updateTableRowStyle.rowIndices).toEqual([1]);
      expect(request.updateTableRowStyle.tableRowStyle.minRowHeight).toEqual({
        magnitude: 50,
        unit: 'PT',
      });
      expect(request.updateTableRowStyle.fields).toBe('minRowHeight');
      expect(result.success).toBe(true);
    });

    it('sets minRowHeight for multiple rows in one request', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableSetRowHeightTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [0, 1, 2],
        minHeight: 40,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableRowStyle.rowIndices).toEqual([0, 1, 2]);
      expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it('minHeight <= 0 — returns validation error without calling API', async () => {
      const result = await tableSetRowHeightTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        rowIndices: [0],
        minHeight: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableSetRowHeightTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        rowIndices: [0],
        minHeight: 40,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableInsertColumnsTool ─────────────────────────────────────────────────

  describe('tableInsertColumnsTool', () => {
    it('inserts 1 column to the right of columnIndex 1 by default', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableInsertColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndex: 1,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.insertTableColumns.tableObjectId).toBe('table-abc');
      expect(request.insertTableColumns.cellLocation).toEqual({ columnIndex: 1 });
      expect(request.insertTableColumns.insertRight).toBe(true);
      expect(request.insertTableColumns.number).toBe(1);
      expect(result.success).toBe(true);
    });

    it('inserts 2 columns to the left when insertRight:false and count:2', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableInsertColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndex: 0,
        count: 2,
        insertRight: false,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.insertTableColumns.insertRight).toBe(false);
      expect(request.insertTableColumns.number).toBe(2);
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableInsertColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        columnIndex: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableDeleteColumnsTool ─────────────────────────────────────────────────

  describe('tableDeleteColumnsTool', () => {
    it('deletes a single column — sends one deleteTableColumn request', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableDeleteColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [3],
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(1);
      expect(requests[0].deleteTableColumn.tableObjectId).toBe('table-abc');
      expect(requests[0].deleteTableColumn.cellLocation).toEqual({ columnIndex: 3 });
      expect(result.success).toBe(true);
    });

    it('deletes multiple columns — requests sorted highest index first', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}, {}] });

      await tableDeleteColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [0, 3],
      });

      const requests = mockClient.batchUpdate.mock.calls[0][1] as any[];
      expect(requests).toHaveLength(2);
      expect(requests[0].deleteTableColumn.cellLocation.columnIndex).toBe(3);
      expect(requests[1].deleteTableColumn.cellLocation.columnIndex).toBe(0);
    });

    it('empty columnIndices — returns validation error without calling API', async () => {
      const result = await tableDeleteColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [],
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableDeleteColumnsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        columnIndices: [0],
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableSetColumnWidthTool ────────────────────────────────────────────────

  describe('tableSetColumnWidthTool', () => {
    it('sets columnWidth for a single column in PT', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableSetColumnWidthTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [2],
        width: 120,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableColumnProperties.objectId).toBe('table-abc');
      expect(request.updateTableColumnProperties.columnIndices).toEqual([2]);
      expect(request.updateTableColumnProperties.tableColumnProperties.columnWidth).toEqual({
        magnitude: 120,
        unit: 'PT',
      });
      expect(request.updateTableColumnProperties.fields).toBe('columnWidth');
      expect(result.success).toBe(true);
    });

    it('sets columnWidth for multiple columns in one request', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      await tableSetColumnWidthTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [0, 1, 2],
        width: 100,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.updateTableColumnProperties.columnIndices).toEqual([0, 1, 2]);
      expect(mockClient.batchUpdate).toHaveBeenCalledTimes(1);
    });

    it('width <= 0 — returns validation error without calling API', async () => {
      const result = await tableSetColumnWidthTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        columnIndices: [0],
        width: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableSetColumnWidthTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        columnIndices: [0],
        width: 100,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });

  // ─── tableMergeCellsTool ────────────────────────────────────────────────────

  describe('tableMergeCellsTool', () => {
    it('sends mergeTableCells with tableRange reflecting row/column span', async () => {
      mockClient.batchUpdate.mockResolvedValue({ replies: [{}] });

      const result = await tableMergeCellsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 1,
        rowSpan: 2,
        columnSpan: 3,
      });

      const request = (mockClient.batchUpdate.mock.calls[0][1] as any[])[0];
      expect(request.mergeTableCells.objectId).toBe('table-abc');
      expect(request.mergeTableCells.tableRange).toEqual({
        location: { rowIndex: 0, columnIndex: 1 },
        rowSpan: 2,
        columnSpan: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.tableId).toBe('table-abc');
      }
    });

    it('rowSpan < 1 — returns validation error without calling API', async () => {
      const result = await tableMergeCellsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        rowSpan: 0,
        columnSpan: 2,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('columnSpan < 1 — returns validation error without calling API', async () => {
      const result = await tableMergeCellsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-abc',
        row: 0,
        column: 0,
        rowSpan: 2,
        columnSpan: 0,
      });

      expect(mockClient.batchUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('validation');
    });

    it('handles API errors', async () => {
      mockClient.batchUpdate.mockRejectedValue(new SlidesAPIError('Not found', 404));

      const result = await tableMergeCellsTool(mockClient, {
        presentationId: 'pres-123',
        tableId: 'table-missing',
        row: 0,
        column: 0,
        rowSpan: 2,
        columnSpan: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe('api');
    });
  });
});
