// SIMMACI Data Export Service (CSV / JSON)
export class ExportService {
  /**
   * Convert an array of objects into a properly escaped UTF-8 CSV string
   */
  static toCSV(records, columns) {
    if (!Array.isArray(records) || records.length === 0) {
      if (Array.isArray(columns) && columns.length > 0) {
        return columns.join(',') + '\n';
      }
      return '';
    }

    const headers = columns || Object.keys(records[0]);
    const escapeField = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeField).join(',');
    const rows = records.map((record) =>
      headers.map((h) => escapeField(record[h])).join(',')
    );

    return [headerLine, ...rows].join('\n') + '\n';
  }

  /**
   * Generate downloadable metadata bundle
   */
  static createExportPayload(filename, csvData) {
    return {
      filename: filename.endsWith('.csv') ? filename : `${filename}.csv`,
      contentType: 'text/csv; charset=utf-8',
      byteLength: Buffer.byteLength(csvData, 'utf-8'),
      data: csvData,
      generatedAt: new Date().toISOString(),
    };
  }
}
