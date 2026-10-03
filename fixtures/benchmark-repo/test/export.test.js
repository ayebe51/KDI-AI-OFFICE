import { test } from 'node:test';
import assert from 'node:assert';
import { ExportService } from '../src/export.service.js';

test('ExportService: Generates valid CSV with header and escaping', () => {
  const records = [
    { id: 1, name: 'Budi, S.Pd', subject: 'Matematika' },
    { id: 2, name: 'Siti "Dewi"', subject: 'IPA' },
  ];
  const csv = ExportService.toCSV(records);
  assert.ok(csv.includes('id,name,subject'));
  assert.ok(csv.includes('"Budi, S.Pd"'));
  assert.ok(csv.includes('"Siti ""Dewi"""'));
});

test('ExportService: Creates downloadable payload with UTF-8 encoding', () => {
  const payload = ExportService.createExportPayload('daftar-guru', 'id,name\n1,Budi\n');
  assert.strictEqual(payload.filename, 'daftar-guru.csv');
  assert.strictEqual(payload.contentType, 'text/csv; charset=utf-8');
  assert.ok(payload.byteLength > 0);
});
