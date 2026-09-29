import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getCurrentUser() {
    return {
      id: 'usr_01J9X8K2M4',
      username: 'admin',
      role: 'ADMIN',
      email: 'admin@kdi.internal',
      createdAt: new Date().toISOString(),
    };
  }
}
