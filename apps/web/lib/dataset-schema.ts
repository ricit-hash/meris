export type DatasetColumnSchema = {
  name: string;
  type: 'number' | 'boolean' | 'date' | 'text';
  nonEmpty: number;
  missing: number;
};

function valueType(value: string): DatasetColumnSchema['type'] {
  const trimmed = value.trim();
  if (/^(true|false)$/i.test(trimmed)) return 'boolean';
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return 'number';
  if (trimmed !== '' && !Number.isNaN(Date.parse(trimmed)) && /[-/:]/.test(trimmed)) return 'date';
  return 'text';
}

export function inferColumnSchema(columns: string[], rows: string[][]): DatasetColumnSchema[] {
  return columns.map((name, index) => {
    const values = rows.map((row) => row[index] ?? '');
    const nonEmptyValues = values.filter((value) => value.trim() !== '');
    const types = new Set(nonEmptyValues.map(valueType));
    const type = types.size === 1 ? [...types][0] : 'text';
    return { name, type, nonEmpty: nonEmptyValues.length, missing: values.length - nonEmptyValues.length };
  });
}
