/**
 * Clean and normalize extracted text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces/newlines to single space
    .replace(/([.!?])\1+/g, '$1') // Remove excessive punctuation
    .trim();
}

/**
 * Parse a PDF file and extract its text content
 */
export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set up the worker - use unpkg CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is { str: string } => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    fullText += pageText + ' ';
  }

  return cleanText(fullText);
}

/**
 * Parse a file based on its extension
 */
export async function parseFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    return parsePDF(file);
  } else if (fileName.endsWith('.txt')) {
    const text = await file.text();
    return cleanText(text);
  } else {
    throw new Error(`Unsupported file type: ${fileName}. Supported: .pdf, .txt`);
  }
}

/**
 * Get supported file extensions for the file input
 */
export function getSupportedExtensions(): string {
  return '.pdf,.txt';
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (file.size > maxSize) {
    return { valid: false, error: 'File is too large. Maximum size is 10MB.' };
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf') && !fileName.endsWith('.txt')) {
    return { valid: false, error: 'Unsupported file type. Use PDF or TXT files.' };
  }

  return { valid: true };
}
