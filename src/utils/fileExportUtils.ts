/**
 * Shared helpers for triggering browser file downloads.
 */

/** Triggers a browser download. Adds UTF-8 BOM for CSV so Excel renders Hebrew correctly. */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const BOM = '﻿';
  const contentWithBOM = mimeType.includes('csv') ? BOM + content : content;

  const blob = new Blob([contentWithBOM], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Returns today's date as `YYYY-MM-DD` for use in export filenames. */
export function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]!;
}
