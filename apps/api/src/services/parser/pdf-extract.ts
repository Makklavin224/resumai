import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { LIMITS } from '@resumai/shared';
import { logger } from '../../lib/logger.js';

export interface ExtractedDocument {
  text: string;
  pages: number;
  format: 'pdf' | 'docx';
}

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK zip header

export function detectFormat(buf: Buffer): 'pdf' | 'docx' | 'unknown' {
  if (buf.length < 4) return 'unknown';
  if (buf.subarray(0, 4).equals(PDF_MAGIC)) return 'pdf';
  if (buf.subarray(0, 4).equals(DOCX_MAGIC)) return 'docx';
  return 'unknown';
}

/**
 * Extract plain text from a PDF or DOCX buffer with safety limits.
 * Throws on unsupported format or oversized input.
 */
export async function extractResumeDocument(buf: Buffer): Promise<ExtractedDocument> {
  if (buf.length > LIMITS.pdfMaxBytes) {
    throw Object.assign(new Error('Файл больше 10 МБ'), { code: 'PARSE_PDF_FAILED' });
  }

  const fmt = detectFormat(buf);
  if (fmt === 'unknown') {
    throw Object.assign(new Error('Неизвестный формат файла. Нужен PDF или DOCX.'), {
      code: 'PARSE_PDF_FAILED',
    });
  }

  if (fmt === 'docx') {
    try {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return { text: value.trim(), pages: 1, format: 'docx' };
    } catch (err) {
      logger.warn({ err }, 'docx extraction failed');
      throw Object.assign(new Error('Не получилось прочитать DOCX'), {
        code: 'PARSE_PDF_FAILED',
      });
    }
  }

  // PDF
  try {
    const doc = await getDocumentProxy(new Uint8Array(buf));
    if (doc.numPages > LIMITS.pdfMaxPages) {
      throw Object.assign(new Error(`PDF длиннее ${LIMITS.pdfMaxPages} страниц`), {
        code: 'PARSE_PDF_FAILED',
      });
    }
    const { text } = await extractText(doc, { mergePages: true });
    const joined = Array.isArray(text) ? text.join('\n\n') : String(text);
    return { text: joined.trim(), pages: doc.numPages, format: 'pdf' };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) throw err;
    logger.warn({ err }, 'pdf extraction failed');
    throw Object.assign(new Error('Не получилось прочитать PDF'), {
      code: 'PARSE_PDF_FAILED',
    });
  }
}
