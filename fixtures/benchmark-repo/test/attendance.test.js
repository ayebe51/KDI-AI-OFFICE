import { test } from 'node:test';
import assert from 'node:assert';
import { AttendanceService } from '../src/attendance.service.js';

test('AttendanceService: Retrieves monthly attendance records', () => {
  const service = new AttendanceService();
  const records = service.getMonthlyAttendance('2026-09');
  assert.strictEqual(records.length, 3);
  assert.strictEqual(records[0].teacherName, 'Siti Walidah');
});

test('AttendanceService: Exports monthly attendance to CSV format', () => {
  const service = new AttendanceService();
  const exportPayload = service.exportMonthlyAttendanceCSV('2026-09');
  assert.strictEqual(exportPayload.filename, 'rekap-absensi-2026-09.csv');
  assert.ok(exportPayload.data.includes('teacherId,teacherName,month,presentDays,absentDays,lateDays,attendanceRate'));
  assert.ok(exportPayload.data.includes('Siti Walidah'));
  assert.ok(exportPayload.data.includes('Budi Utomo'));
});
