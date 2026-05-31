import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret-key';

export const jwtService = {
  generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload as object, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as any,
      algorithm: 'HS256',
    });
  },

  generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload as object, REFRESH_SECRET, {
      expiresIn: '30d' as any,
      algorithm: 'HS256',
    });
  },

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  },

  verifyRefreshToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  },

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },
};
