import { test } from 'node:test';
import assert from 'node:assert';
import { AttendanceService } from '../src/attendance.service.js';
import { AttendanceExportUI } from '../src/attendance.ui.js';

test('AttendanceExportUI: Manages export lifecycle and state', async () => {
  const service = new AttendanceService();
  const ui = new AttendanceExportUI(service);

  const initial = ui.renderState();
  assert.strictEqual(initial.isExporting, false);
  assert.strictEqual(initial.hasDownload, false);

  ui.setMonth('2026-09');
  const result = await ui.triggerExport();
  assert.strictEqual(result.success, true);
  assert.ok(result.payload.filename.includes('2026-09.csv'));

  const finalState = ui.renderState();
  assert.strictEqual(finalState.hasDownload, true);
  assert.strictEqual(finalState.filename, 'rekap-absensi-2026-09.csv');
});
