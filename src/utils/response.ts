type ResponseType = 'simple' | 'complex' | 'list' | 'error';
type ErrorType = 'authentication' | 'api' | 'validation' | 'network';

export function formatResponse(
  type: Exclude<ResponseType, 'error'>,
  message: string,
  data?: any
): string {
  switch (type) {
    case 'simple':
      return message;

    case 'complex':
      if (!data) return message;

      let result = message + '\n\n';
      for (const [key, value] of Object.entries(data)) {
        const label = formatLabel(key);
        const formatted = (typeof value === 'object' && value !== null) ? JSON.stringify(value, null, 2) : value;
        result += `${label}: ${formatted}\n`;
      }
      return result.trim();

    case 'list':
      if (!Array.isArray(data) || data.length === 0) {
        return `${message} (0 items)`;
      }

      let listResult = `${message} (${data.length})\n\n`;
      data.forEach((item, index) => {
        if (typeof item === 'object' && item.title) {
          listResult += `${index + 1}. ${item.title}${item.id ? ` (ID: ${item.id})` : ''}\n`;
        } else {
          listResult += `${index + 1}. ${JSON.stringify(item)}\n`;
        }
      });
      return listResult.trim();

    default:
      return message;
  }
}

export function formatError(
  type: ErrorType,
  message: string,
  details?: any,
  remediation?: string
): string {
  const typeLabels: Record<ErrorType, string> = {
    authentication: 'Authentication Error',
    api: 'API Error',
    validation: 'Validation Error',
    network: 'Network Error',
  };

  let result = `❌ ${typeLabels[type]}\n\n${message}\n`;

  if (details) {
    result += '\nDetails:\n';
    if (typeof details === 'object') {
      for (const [key, value] of Object.entries(details)) {
        result += `  ${key}: ${value}\n`;
      }
    } else {
      result += `  ${details}\n`;
    }
  }

  // Auto-remediation based on error type
  const autoRemediation = getRemediation(type, message);
  if (autoRemediation || remediation) {
    result += `\n💡 How to fix:\n${remediation || autoRemediation}\n`;
  }

  return result.trim();
}

function formatLabel(key: string): string {
  // Special cases for common abbreviations
  if (key.toLowerCase() === 'id') return 'ID';

  // Handle camelCase and map to friendly names
  const labelMap: Record<string, string> = {
    slideCount: 'Slides',
    pageCount: 'Pages',
    userId: 'User ID',
    presentationId: 'Presentation ID',
  };

  if (labelMap[key]) return labelMap[key];

  // Default: capitalize first letter and add spaces before capitals
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

function getRemediation(type: ErrorType, message: string): string | null {
  if (type === 'authentication') {
    if (message.includes('expired') || message.includes('invalid')) {
      return 'Re-authenticate by running the authentication flow again to get fresh tokens.';
    }
    return 'Re-authenticate using the OAuth flow.';
  }

  if (type === 'network') {
    return 'Check your internet connection and try again.';
  }

  if (type === 'validation') {
    return 'Review the parameter requirements and try again.';
  }

  return null;
}

export interface SuccessResponse {
  success: true;
  message: string;
  data?: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: any;
    retryable: boolean;
  };
}

export type ToolResponse = SuccessResponse | ErrorResponse;

export function createSuccessResponse(
  message: string,
  data?: any
): SuccessResponse {
  return {
    success: true,
    message,
    data,
  };
}

export function createErrorResponse(
  type: ErrorType,
  message: string,
  details?: any,
  retryable = false
): ErrorResponse {
  return {
    success: false,
    error: {
      type,
      message,
      details,
      retryable,
    },
  };
}
