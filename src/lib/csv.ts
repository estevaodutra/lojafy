// Parser/serializador CSV nativo compartilhado pelo portal fornecedor.
// Extraído de SupplierProductImport para reuso (rastreios, estoque, export).

/** Detecta o delimitador (vírgula ou ponto-e-vírgula) pela primeira linha. */
export function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

/** Parser de CSV com suporte a aspas, aspas escapadas ("") e \r\n. */
export function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  const delimiter = detectDelimiter(text);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if (char === '\r' || char === '\n') {
        row.push(currentValue.trim());
        currentValue = '';
        if (row.length > 0 && row.some((val) => val !== '')) {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentValue += char;
      }
    }
  }

  if (currentValue !== '' || row.length > 0) {
    row.push(currentValue.trim());
    if (row.length > 0 && row.some((val) => val !== '')) {
      lines.push(row);
    }
  }

  return lines;
}

/**
 * Converte linhas parseadas em objetos usando a primeira linha como cabeçalho
 * (normalizado para minúsculas, sem acentos e com _ no lugar de espaços).
 */
export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

/** Serializa em CSV (;) escapando aspas/delimitadores/quebras de linha. */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined): string => {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[";\n\r,]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))].join('\n');
}

/** Dispara download de um CSV com BOM (evita problema de acentuação no Excel). */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
