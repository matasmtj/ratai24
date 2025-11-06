// src/errors.js
export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const notFound = (msg='Not Found') => new HttpError(404, msg);
export const badRequest = (msg='Bad Request', details) => new HttpError(400, msg, details);
export const unprocessable = (msg='Unprocessable Entity', details) => new HttpError(422, msg, details);

export function errorHandler(err, req, res, next) {
  // Handle custom HttpError
  if (err instanceof HttpError) {
    const payload = { error: err.message };
    if (err.details) payload.details = err.details;
    return res.status(err.status).json(payload);
  }

  // Handle Prisma errors comprehensively
  if (err.code && err.code.startsWith('P')) {
    // Log full error for debugging
    console.error('[Prisma Error]', err.code, err.message, err.meta);
    
    // Map common Prisma error codes to appropriate HTTP status
    switch (err.code) {
      // Connection errors
      case 'P1000':
        return res.status(503).json({ error: 'Database authentication failed' });
      case 'P1001':
        return res.status(503).json({ error: 'Cannot reach database server' });
      case 'P1002':
        return res.status(503).json({ error: 'Database connection timeout' });
      case 'P1003':
        return res.status(503).json({ error: 'Database does not exist' });
      case 'P1008':
        return res.status(503).json({ error: 'Database operation timeout' });
      case 'P1009':
        return res.status(503).json({ error: 'Database already exists' });
      case 'P1010':
        return res.status(403).json({ error: 'Access denied' });
      case 'P1011':
        return res.status(503).json({ error: 'TLS connection error' });
      case 'P1012':
        return res.status(400).json({ error: 'Schema validation error' });
      case 'P1013':
        return res.status(400).json({ error: 'Invalid database string' });
      case 'P1014':
        return res.status(400).json({ error: 'Model does not exist' });
      case 'P1015':
        return res.status(503).json({ error: 'Unsupported Prisma schema' });
      case 'P1016':
        return res.status(400).json({ error: 'Incorrect number of parameters' });
      case 'P1017':
        return res.status(503).json({ error: 'Server has closed the connection' });
      
      // Query errors
      case 'P2000':
        return res.status(400).json({ error: 'Value too long for column' });
      case 'P2001':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2002': {
        // Unique constraint violation
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
        return res.status(409).json({ error: `Unique constraint failed on ${target}` });
      }
      case 'P2003': {
        // Foreign key constraint violation
        const field = err.meta?.field_name || 'foreign key';
        return res.status(400).json({ error: `Foreign key constraint failed on ${field}` });
      }
      case 'P2004':
        return res.status(400).json({ error: 'Constraint violation' });
      case 'P2005':
        return res.status(400).json({ error: 'Invalid value for field type' });
      case 'P2006':
        return res.status(400).json({ error: 'Invalid value provided' });
      case 'P2007':
        return res.status(400).json({ error: 'Data validation error' });
      case 'P2008':
        return res.status(400).json({ error: 'Failed to parse query' });
      case 'P2009':
        return res.status(400).json({ error: 'Failed to validate query' });
      case 'P2010':
        return res.status(500).json({ error: 'Raw query failed' });
      case 'P2011':
        return res.status(400).json({ error: 'Null constraint violation' });
      case 'P2012':
        return res.status(400).json({ error: 'Missing required value' });
      case 'P2013':
        return res.status(400).json({ error: 'Missing required argument' });
      case 'P2014':
        return res.status(400).json({ error: 'Relation violation' });
      case 'P2015':
        return res.status(404).json({ error: 'Related record not found' });
      case 'P2016':
        return res.status(400).json({ error: 'Query interpretation error' });
      case 'P2017':
        return res.status(400).json({ error: 'Records not connected' });
      case 'P2018':
        return res.status(400).json({ error: 'Required connected records not found' });
      case 'P2019':
        return res.status(400).json({ error: 'Input error' });
      case 'P2020':
        return res.status(400).json({ error: 'Value out of range' });
      case 'P2021':
        return res.status(404).json({ error: 'Table does not exist' });
      case 'P2022':
        return res.status(404).json({ error: 'Column does not exist' });
      case 'P2023':
        return res.status(400).json({ error: 'Inconsistent column data' });
      case 'P2024':
        return res.status(503).json({ error: 'Connection pool timeout' });
      case 'P2025':
        return res.status(404).json({ error: 'Record not found' });
      case 'P2026':
        return res.status(400).json({ error: 'Unsupported database feature' });
      case 'P2027':
        return res.status(500).json({ error: 'Multiple database errors occurred' });
      case 'P2028':
        return res.status(500).json({ error: 'Transaction API error' });
      case 'P2030':
        return res.status(400).json({ error: 'Cannot find fulltext index' });
      case 'P2033':
        return res.status(400).json({ error: 'Number out of range' });
      case 'P2034':
        return res.status(409).json({ error: 'Transaction conflict' });
      
      // Migration errors (shouldn't happen in production but handle gracefully)
      case 'P3000':
      case 'P3001':
      case 'P3002':
      case 'P3003':
      case 'P3004':
      case 'P3005':
        return res.status(500).json({ error: 'Database migration issue detected' });
      
      // Introspection errors
      case 'P4000':
      case 'P4001':
      case 'P4002':
        return res.status(500).json({ error: 'Database introspection error' });
      
      // Unknown Prisma error
      default:
        console.error('[Unknown Prisma Error]', err);
        return res.status(500).json({ error: 'A database error occurred' });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Log unexpected errors for debugging
  console.error('[Unexpected Error]', err);

  // For all other errors, return sanitized 500
  // Never leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const status = err.status || 500;
  const message = isDevelopment && err.message ? err.message : 'Internal Server Error';
  
  res.status(status).json({ error: message });
}
