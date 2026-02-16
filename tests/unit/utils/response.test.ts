import { describe, it, expect } from '@jest/globals';
import { formatResponse, formatError } from '../../../src/utils/response.js';

describe('Response Formatter', () => {
  describe('formatResponse', () => {
    it('should format simple success message', () => {
      const result = formatResponse('simple', 'Created slide');
      expect(result).toBe('Created slide');
    });

    it('should format complex response with data', () => {
      const result = formatResponse('complex', 'Created presentation', {
        id: '123',
        title: 'My Presentation',
        slideCount: 5,
      });

      expect(result).toContain('Created presentation');
      expect(result).toContain('ID: 123');
      expect(result).toContain('Title: My Presentation');
      expect(result).toContain('Slides: 5');
    });

    it('should format array results', () => {
      const result = formatResponse('list', 'Found presentations', [
        { id: '1', title: 'Pres 1' },
        { id: '2', title: 'Pres 2' },
      ]);

      expect(result).toContain('Found presentations (2)');
      expect(result).toContain('1. Pres 1 (ID: 1)');
      expect(result).toContain('2. Pres 2 (ID: 2)');
    });
  });

  describe('formatError', () => {
    it('should format authentication error', () => {
      const result = formatError('authentication', 'Not authenticated');

      expect(result).toContain('Authentication Error');
      expect(result).toContain('Not authenticated');
    });

    it('should format API error with details', () => {
      const result = formatError('api', 'Invalid request', {
        field: 'presentationId',
        issue: 'required',
      });

      expect(result).toContain('API Error');
      expect(result).toContain('Invalid request');
      expect(result).toContain('field');
    });

    it('should include remediation for common errors', () => {
      const result = formatError('authentication', 'Token expired');
      expect(result).toContain('Re-authenticate');
    });
  });
});
