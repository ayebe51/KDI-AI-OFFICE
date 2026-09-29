import { Injectable, UnauthorizedException } from '@nestjs/common';
import { loadAppConfig } from '@kdi/config';

@Injectable()
export class AuthService {
  login(username: string, password?: string) {
    const config = loadAppConfig();
    // Development authentication gate foundation
    if (!username) {
      throw new UnauthorizedException('Username is required');
    }

    // Return structured token object
    return {
      accessToken: `kdi_jwt_${Buffer.from(username).toString('base64')}_${Date.now()}`,
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
      user: {
        id: 'usr_01J9X8K2M4',
        username,
        role: username === 'admin' ? 'ADMIN' : 'OPERATOR',
      },
    };
  }
}
