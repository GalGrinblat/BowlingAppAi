/**
 * Import/Export Utility Functions
 * Reusable functions for importing and exporting data in CSV and JSON formats
 */

import { downloadFile, getTimestamp } from './fileExportUtils';

export interface ParseResult<T> {
  validData: T[];
  errors: string[];
}

/**
 * Export data to CSV format
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 */
export const exportToCSV = <T extends object>(
  data: T[],
  filename: string
): void => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get all unique keys from data (for future-proofing)
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  const headers = allKeys.join(',');

  const csvContent = [
    headers,
    ...data.map(item =>
      allKeys.map(key => {
        const value = (item as Record<string, unknown>)[key];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export data to JSON format
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 */
export const exportToJSON = <T>(data: T[], filename: string): void => {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}_${getTimestamp()}.json`, 'application/json');
};

/**
 * Parse JSON import data
 * @param content - JSON string content
 * @param validateFn - Function to validate each item
 * @param fieldsToRemove - Fields to remove before validation (e.g., ['id', 'createdAt'])
 * @returns ParseResult with valid data and errors
 */
export const parseJSONImport = <T>(
  content: string,
  validateFn: (item: Record<string, unknown>) => { valid: boolean; error?: string },
  fieldsToRemove: string[] = ['id', 'createdAt']
): ParseResult<T> => {
  try {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];
    
    const errors: string[] = [];
    const validData: T[] = [];

    items.forEach((item, index) => {
      // Remove specified fields
      const cleanedItem = { ...item };
      fieldsToRemove.forEach(field => delete cleanedItem[field]);
      
      const validation = validateFn(cleanedItem);
      if (!validation.valid) {
        errors.push(`Row ${index + 1}: ${validation.error}`);
        return;
      }

      validData.push(cleanedItem as T);
    });

    return { validData, errors };
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error}`, { cause: error });
  }
};

/**
 * Parse CSV import data
 * @param content - CSV string content
 * @param validateFn - Function to validate each item
 * @param fieldsToRemove - Fields to remove before validation (e.g., ['id', 'createdAt'])
 * @param fieldConverters - Optional field type converters (e.g., { active: (v) => v === 'true' })
 * @returns ParseResult with valid data and errors
 */
export const parseCSVImport = <T>(
  content: string,
  validateFn: (item: Record<string, unknown>) => { valid: boolean; error?: string },
  fieldsToRemove: string[] = ['id', 'createdAt'],
  fieldConverters: Record<string, (value: string) => unknown> = {}
): ParseResult<T> => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0]!.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const errors: string[] = [];
    const validData: T[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = parseCSVLine(line);

      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const itemData: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        // Skip fields to remove
        if (fieldsToRemove.includes(header)) return;

        const value = values[index];
        
        // Apply custom converter if available
        if (fieldConverters[header]) {
          itemData[header] = fieldConverters[header](value ?? '');
        } else if (value !== '') {
          // Skip empty values for other fields
          itemData[header] = value;
        }
      });

      const validation = validateFn(itemData);
      if (!validation.valid) {
        errors.push(`Row ${i + 1}: ${validation.error}`);
        continue;
      }

      validData.push(itemData as T);
    }

    return { validData, errors };
  } catch (error) {
    throw new Error(`Error parsing CSV: ${error}`, { cause: error });
  }
};

/**
 * Parse a single CSV line, handling quoted values
 * @param line - CSV line to parse
 * @returns Array of values
 */
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

/**
 * Boolean converter for CSV imports
 */
export const booleanConverter = (value: string): boolean => {
  const lowerValue = value.toLowerCase().trim();
  return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
};
