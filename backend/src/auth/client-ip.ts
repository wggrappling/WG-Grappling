import { isIP } from 'net';
import type { Request } from 'express';

const normalizeIp = (value: string | undefined) => {
  const candidate = value?.trim().replace(/^::ffff:/, '');
  return candidate && isIP(candidate) ? candidate : undefined;
};

export function resolveLoginClientIp(
  request: Pick<Request, 'headers' | 'socket'>,
  isRender = process.env.RENDER === 'true',
) {
  const socketIp = normalizeIp(request.socket.remoteAddress);
  if (!isRender) return socketIp ?? 'unknown';

  const cloudflareIp = request.headers['cf-connecting-ip'];
  if (typeof cloudflareIp === 'string' && !cloudflareIp.includes(',')) {
    const trustedIp = normalizeIp(cloudflareIp);
    if (trustedIp) return trustedIp;
  }

  return socketIp ?? 'unknown';
}
