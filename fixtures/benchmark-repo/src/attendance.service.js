// SIMMACI Teacher Monthly Attendance Recording & Aggregation Service
import { ExportService } from './export.service.js';

export class AttendanceService {
  constructor() {
    this.records = [
      { id: 'att_001', teacherId: 'usr_002', teacherName: 'Siti Walidah', month: '2026-09', presentDays: 22, absentDays: 0, lateDays: 1, attendanceRate: 100 },
      { id: 'att_002', teacherId: 'usr_003', teacherName: 'Budi Utomo', month: '2026-09', presentDays: 20, absentDays: 2, lateDays: 3, attendanceRate: 90.9 },
      { id: 'att_003', teacherId: 'usr_004', teacherName: 'Dewi Sartika', month: '2026-09', presentDays: 18, absentDays: 4, lateDays: 0, attendanceRate: 81.8 },
    ];
  }

  getMonthlyAttendance(month) {
    if (!month) {
      throw new Error('Month parameter is required (YYYY-MM)');
    }
    return this.records.filter((r) => r.month === month);
  }

  exportMonthlyAttendanceCSV(month) {
    const data = this.getMonthlyAttendance(month);
    const columns = ['teacherId', 'teacherName', 'month', 'presentDays', 'absentDays', 'lateDays', 'attendanceRate'];
    const csvContent = ExportService.toCSV(data, columns);
    return ExportService.createExportPayload(`rekap-absensi-${month}.csv`, csvContent);
  }
}
