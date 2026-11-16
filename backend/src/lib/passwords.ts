import bcrypt from 'bcryptjs';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const passwordProblem = (pw: unknown) =>
  typeof pw !== 'string' || pw.length < 10 ? 'Password must be at least 10 characters.' : null;
