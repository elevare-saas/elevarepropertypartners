/* Minimal levelled logger: LOG_LEVEL=error | warn | info | debug */
import {env} from '../config/env.js';

const LEVELS = {error: 0, warn: 1, info: 2, debug: 3} as const;
type Level = keyof typeof LEVELS;
const threshold = LEVELS[env.logLevel];

function write(level: Level, msg: string, extra: unknown[]) {
  if (LEVELS[level] > threshold) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}`;
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line, ...extra);
}

export const log = {
  error: (msg: string, ...extra: unknown[]) => write('error', msg, extra),
  warn: (msg: string, ...extra: unknown[]) => write('warn', msg, extra),
  info: (msg: string, ...extra: unknown[]) => write('info', msg, extra),
  debug: (msg: string, ...extra: unknown[]) => write('debug', msg, extra)
};
