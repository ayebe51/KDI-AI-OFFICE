// SIMMACI Attendance Reporting UI Component Logic
export class AttendanceExportUI {
  constructor(attendanceService) {
    this.attendanceService = attendanceService;
    this.selectedMonth = '2026-09';
    this.isExporting = false;
    this.lastExportPayload = null;
  }

  setMonth(month) {
    this.selectedMonth = month;
  }

  async triggerExport() {
    this.isExporting = true;
    try {
      const payload = this.attendanceService.exportMonthlyAttendanceCSV(this.selectedMonth);
      this.lastExportPayload = payload;
      return { success: true, payload };
    } finally {
      this.isExporting = false;
    }
  }

  renderState() {
    return {
      selectedMonth: this.selectedMonth,
      isExporting: this.isExporting,
      hasDownload: Boolean(this.lastExportPayload),
      filename: this.lastExportPayload?.filename || null,
    };
  }
}
