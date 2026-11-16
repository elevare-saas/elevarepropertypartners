/* in-memory fixed-window counters, per process */
import {env} from '../config/env.js';

function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, {n: number; until: number}>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, h] of hits) if (h.until < now) hits.delete(k);
  }, windowMs).unref();
  return {
    blocked: (key: string) => {
      const h = hits.get(key);
      return !!h && h.n >= max && h.until > Date.now();
    },
    hit: (key: string) => {
      const h = hits.get(key);
      hits.set(key, h && h.until > Date.now() ? {n: h.n + 1, until: h.until} : {n: 1, until: Date.now() + windowMs});
    },
    reset: (key: string) => {
      hits.delete(key);
    }
  };
}

/* per email + IP */
export const loginLimiter = createLimiter(env.limits.loginMaxAttempts, env.limits.loginWindowMinutes * 60_000);
/* per IP */
export const leadLimiter = createLimiter(env.limits.leadsPerHourPerIp, 3_600_000);
