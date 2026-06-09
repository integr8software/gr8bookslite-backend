import type { Request } from 'express';

export function getWorkspaceAuditLogRequestIpAddress(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return request.ip ?? request.socket.remoteAddress ?? null;
}
