/**
 * PocketBase API Client for MCP Server
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.FASTREADER_API_URL || "http://127.0.0.1:8090";

export const pb = new PocketBase(POCKETBASE_URL);

/**
 * Convert camelCase keys to snake_case for PocketBase
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Check if PocketBase is reachable
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encode filter for PocketBase URL query string.
 * Only encodes characters that are unsafe in query strings, but preserves
 * filter syntax characters like = and && that PocketBase needs unencoded.
 */
function encodeFilter(filter: string): string {
  // Encode only: space, double quote, single quote, and special chars
  // Don't encode: = & < > (PocketBase filter operators)
  return filter
    .replace(/ /g, '%20')
    .replace(/"/g, '%22')
    .replace(/'/g, '%27');
}

/**
 * Fetch records using direct HTTP request (workaround for PocketBase SDK filter issues)
 * Note: Filter strings should use compact syntax without spaces around operators (e.g., 'field="value"')
 */
export async function fetchRecordsDirect<T>(
  collection: string,
  options: {
    page?: number;
    perPage?: number;
    filter?: string;
    sort?: string;
    fields?: string;
  } = {}
): Promise<{ items: T[]; totalItems: number; page: number; perPage: number }> {
  // Build query string manually to avoid URLSearchParams encoding issues
  const params: string[] = [];
  if (options.page) params.push(`page=${options.page}`);
  if (options.perPage) params.push(`perPage=${options.perPage}`);
  if (options.filter) params.push(`filter=${encodeFilter(options.filter)}`);
  if (options.sort) params.push(`sort=${encodeURIComponent(options.sort)}`);
  if (options.fields) params.push(`fields=${encodeURIComponent(options.fields)}`);

  const url = `${POCKETBASE_URL}/api/collections/${collection}/records?${params.join('&')}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
