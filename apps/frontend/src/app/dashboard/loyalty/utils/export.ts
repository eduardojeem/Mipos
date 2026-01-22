/**
 * Utilidades para exportación de datos
 */

export class DataExporter {
  /**
   * Convierte datos a formato CSV
   */
  static toCSV(data: any[], columns?: string[]): string {
    if (!data || data.length === 0) return '';

    const headers = columns || Array.from(new Set(data.flatMap((r) => Object.keys(r))));
    
    const escape = (value: any): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const lines = [headers.join(',')];
    
    for (const row of data) {
      lines.push(headers.map((h) => escape((row as any)[h])).join(','));
    }

    return lines.join('\n');
  }

  /**
   * Convierte datos a formato JSON
   */
  static toJSON(data: any[]): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Descarga un archivo
   */
  static download(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta datos en el formato especificado
   */
  static export(
    data: any[],
    filename: string,
    format: 'csv' | 'json',
    columns?: string[]
  ): void {
    const content = format === 'csv' 
      ? this.toCSV(data, columns)
      : this.toJSON(data);
    
    const mimeType = format === 'csv' 
      ? 'text/csv;charset=utf-8;'
      : 'application/json';
    
    this.download(filename, content, mimeType);
  }
}

/**
 * Filtra un objeto por las claves especificadas
 */
export function filterByColumns<T extends Record<string, any>>(
  data: T[],
  columns: Record<string, boolean>
): Partial<T>[] {
  return data.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => columns[key])
    ) as Partial<T>
  );
}

/**
 * Genera un nombre de archivo con timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}.${extension}`;
}
