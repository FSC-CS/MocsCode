/**
 * Converts a string from snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
}

/**
 * Converts a string from camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
export function convertKeysToCamelCase<T>(obj: any): T {
  if (obj === null || typeof obj !== 'object') {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item)) as unknown as T;
  }

  return Object.keys(obj).reduce((result, key) => {
    const camelKey = toCamelCase(key);
    const value = obj[key];
    
    result[camelKey] = value !== null && typeof value === 'object' 
      ? convertKeysToCamelCase(value)
      : value;
    
    return result;
  }, {} as any) as T;
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 */
export function convertKeysToSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  }

  return Object.keys(obj).reduce((result, key) => {
    const snakeKey = toSnakeCase(key);
    const value = obj[key];
    
    result[snakeKey] = value !== null && typeof value === 'object'
      ? convertKeysToSnakeCase(value)
      : value;
    
    return result;
  }, {} as any);
}

/**
 * Type guard to check if the value is an object (and not null/array)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for ApiResponse
 */
export function isApiResponse<T>(response: any): response is { data: T | null; error: Error | null } {
  return 'data' in response && 'error' in response;
}

/**
 * Type guard for PaginatedResponse
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return 'items' in response && 'total' in response && 'page' in response && 'perPage' in response;
}

// Re-export types for convenience
export * from './types';
