import { resolveLoginClientIp } from './client-ip';

const request = (remoteAddress: string | undefined, headers: Record<string, string | string[]> = {}) => ({
  headers,
  socket: { remoteAddress },
}) as any;

describe('resolveLoginClientIp', () => {
  it('uses the direct socket address without a proxy', () => {
    expect(resolveLoginClientIp(request('203.0.113.10'), false)).toBe('203.0.113.10');
  });

  it('normalizes an IPv4-mapped socket address locally', () => {
    expect(resolveLoginClientIp(request('::ffff:127.0.0.1'), false)).toBe('127.0.0.1');
  });

  it('uses the Cloudflare-provided client address on Render', () => {
    expect(resolveLoginClientIp(request('10.0.0.5', { 'cf-connecting-ip': '203.0.113.10' }), true)).toBe('203.0.113.10');
  });

  it('does not trust X-Forwarded-For with multiple values on Render', () => {
    expect(resolveLoginClientIp(request('10.0.0.5', {
      'x-forwarded-for': '198.51.100.99, 203.0.113.10, 192.0.2.20',
    }), true)).toBe('10.0.0.5');
  });

  it('does not trust a client-supplied forwarding header locally', () => {
    expect(resolveLoginClientIp(request('203.0.113.10', {
      'x-forwarded-for': '198.51.100.99',
      'cf-connecting-ip': '198.51.100.99',
    }), false)).toBe('203.0.113.10');
  });

  it('rejects a malformed or chained Cloudflare address and falls back to the socket', () => {
    expect(resolveLoginClientIp(request('10.0.0.5', {
      'cf-connecting-ip': '198.51.100.99, 203.0.113.10',
    }), true)).toBe('10.0.0.5');
  });

  it('returns a stable fallback when no valid address exists', () => {
    expect(resolveLoginClientIp(request(undefined, { 'cf-connecting-ip': 'not-an-ip' }), true)).toBe('unknown');
  });
});
