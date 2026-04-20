import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, ROUNDS);
}

export function verifyPassword(raw: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(raw, hashed);
}
