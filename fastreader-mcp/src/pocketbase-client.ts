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
