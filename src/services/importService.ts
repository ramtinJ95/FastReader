/**
 * Import Service
 *
 * Handles importing documents from various sources (URL, file, paste)
 * and creating documents/sessions in PocketBase.
 */

import { createDocument, createSession } from './pocketbase';
import type { CreateDocumentInput } from '../types/comprehension';

export interface ExtractResult {
  title: string;
  content: string;
  word_count: number;
  source_type: 'url' | 'file' | 'paste';
  source_path: string;
  file_type?: 'txt' | 'md' | 'pdf';
}

export interface ImportResult {
  documentId: string;
  sessionId: string;
  title: string;
  content: string;
  wordCount: number;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Clean text by collapsing whitespace and trimming lines
 */
function cleanText(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/**
 * Import a document from extracted content into PocketBase
 */
export async function importDocument(extraction: ExtractResult): Promise<ImportResult> {
  const input: CreateDocumentInput = {
    title: extraction.title,
    content: extraction.content,
    source_type: extraction.source_type,
    source_path: extraction.source_path,
    file_type: extraction.file_type,
    word_count: extraction.word_count,
  };

  // Create document in PocketBase
  const document = await createDocument(input);

  // Create session for the document
  const session = await createSession({
    document: document.id,
    total_words: extraction.word_count,
  });

  return {
    documentId: document.id,
    sessionId: session.id,
    title: extraction.title,
    content: extraction.content,
    wordCount: extraction.word_count,
  };
}

/**
 * Extract text from a URL using browser-based HTML parsing
 *
 * Note: This is a simple browser-based extraction. Due to CORS,
 * it may not work for all URLs. For better extraction, use the
 * fastreader-extract CLI tool.
 */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract title
  const title =
    doc.querySelector('title')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    'Untitled';

  // Remove non-content elements
  const elementsToRemove = doc.querySelectorAll(
    'script, style, nav, header, footer, aside, noscript, [role="navigation"], [role="banner"], [role="contentinfo"]'
  );
  elementsToRemove.forEach((el) => el.remove());

  // Try to find main content areas first
  const mainContent =
    doc.querySelector('main') ||
    doc.querySelector('article') ||
    doc.querySelector('[role="main"]') ||
    doc.body;

  const rawContent = mainContent?.textContent || '';
  const content = cleanText(rawContent);
  const wordCount = countWords(content);

  if (wordCount === 0) {
    throw new Error('No readable content found at this URL');
  }

  return {
    title,
    content,
    word_count: wordCount,
    source_type: 'url',
    source_path: url,
  };
}

/**
 * Extract text from a text or markdown file
 */
export async function extractFromTextFile(file: File): Promise<ExtractResult> {
  const content = await file.text();
  const cleanedContent = cleanText(content);
  const wordCount = countWords(cleanedContent);

  // Determine file type
  const ext = file.name.split('.').pop()?.toLowerCase();
  let fileType: 'txt' | 'md' | undefined;
  if (ext === 'txt') fileType = 'txt';
  if (ext === 'md' || ext === 'markdown') fileType = 'md';

  // Remove extension from title
  const title = file.name.replace(/\.(txt|md|markdown)$/i, '');

  return {
    title,
    content: cleanedContent,
    word_count: wordCount,
    source_type: 'file',
    source_path: file.name,
    file_type: fileType,
  };
}

/**
 * Create an ExtractResult from pasted text
 */
export function createPasteExtract(content: string, title?: string): ExtractResult {
  const cleanedContent = cleanText(content);
  const wordCount = countWords(cleanedContent);

  return {
    title: title?.trim() || 'Untitled',
    content: cleanedContent,
    word_count: wordCount,
    source_type: 'paste',
    source_path: '',
  };
}
