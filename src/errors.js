// src/errors.js
export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const notFound = (msg='Not Found') => new HttpError(404, msg);
export const badRequest = (msg='Bad Request', details) => new HttpError(400, msg, details);
export const unprocessable = (msg='Unprocessable Entity', details) => new HttpError(422, msg, details);

export function errorHandler(err, req, res, next) {
  // Prisma -> friendly HTTP
  if (err && err.code) {
    // Known Prisma errors
    if (err.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Not found' });
    }
    if (err.code === 'P2002') { // Unique constraint
      return res.status(400).json({ error: 'Unique constraint failed', details: err.meta });
    }
  }
  const status = err.status || 500;
  const payload = { error: err.message || 'Internal Server Error' };
  if (err.details) payload.details = err.details;
  res.status(status).json(payload);
}
