import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'teacher' | 'coordinator' | 'admin';

export interface JwtPayload {
  sub: string;     // userId
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

function getSignOptions(): jwt.SignOptions & { algorithm: jwt.Algorithm } {
  return {
    expiresIn: env.jwt.accessTokenExpiry,
    algorithm: env.jwt.privateKey ? 'RS256' : 'HS256',
  };
}

function getSignKey(): jwt.Secret {
  return env.jwt.privateKey ?? env.jwt.secret;
}

function getVerifyKey(): jwt.Secret | jwt.GetPublicKeyOrSecret {
  return env.jwt.publicKey ?? env.jwt.secret;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSignKey(), getSignOptions());
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getVerifyKey()) as JwtPayload;
}
