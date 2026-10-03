// SIMMACI User Management & Directory Service
export class UserService {
  constructor() {
    this.users = [
      { id: 'usr_001', name: 'Ahmad Dahlan', schoolId: 'SCH-01', role: 'HEADMASTER', status: 'ACTIVE' },
      { id: 'usr_002', name: 'Siti Walidah', schoolId: 'SCH-01', role: 'TEACHER', status: 'ACTIVE' },
      { id: 'usr_003', name: 'Budi Utomo', schoolId: 'SCH-02', role: 'TEACHER', status: 'ACTIVE' },
      { id: 'usr_004', name: 'Dewi Sartika', schoolId: 'SCH-03', role: 'TEACHER', status: 'INACTIVE' },
    ];
  }

  listUsers(filters = {}) {
    let result = [...this.users];

    if (filters.schoolId !== undefined && filters.schoolId !== null) {
      if (Array.isArray(filters.schoolId)) {
        if (filters.schoolId.length > 0) {
          result = result.filter((u) => filters.schoolId.includes(u.schoolId));
        }
      } else if (filters.schoolId !== '') {
        result = result.filter((u) => u.schoolId === filters.schoolId);
      }
    }

    if (filters.role) {
      result = result.filter((u) => u.role === filters.role);
    }

    if (filters.status) {
      result = result.filter((u) => u.status === filters.status);
    }

    return result;
  }

  getUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }
}
