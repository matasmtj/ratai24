/**
 * Unit tests for src/errors.js
 *
 * Covers the HttpError class, helper factories and the errorHandler
 * Express middleware. The middleware is invoked directly with plain JS
 * objects playing the role of `req`, `res` and `next` — no real HTTP
 * server is started.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  HttpError,
  notFound,
  badRequest,
  unprocessable,
  errorHandler,
} from '../../src/errors.js';

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('HttpError', () => {
  it('exposes status, message and details', () => {
    const err = new HttpError(418, "I'm a teapot", { tea: 'earl grey' });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.details).toEqual({ tea: 'earl grey' });
  });
});

describe('HttpError factory helpers', () => {
  it('notFound defaults to 404 "Not Found"', () => {
    const err = notFound();
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not Found');
  });

  it('notFound accepts a custom message', () => {
    const err = notFound('Car not found');
    expect(err.message).toBe('Car not found');
  });

  it('badRequest defaults to 400 with optional details', () => {
    const err = badRequest('Bad input', { field: 'email' });
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('unprocessable defaults to 422', () => {
    const err = unprocessable();
    expect(err.status).toBe(422);
    expect(err.message).toBe('Unprocessable Entity');
  });
});

describe('errorHandler middleware', () => {
  let res;
  const next = jest.fn();

  beforeEach(() => {
    res = makeRes();
    // Quiet the console during the Prisma / unexpected error branches.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('handles HttpError instances and forwards details', () => {
    const err = badRequest('Invalid data', { field: 'pricePerDay' });
    errorHandler(err, {}, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid data',
      details: { field: 'pricePerDay' },
    });
  });

  it('handles HttpError without details', () => {
    errorHandler(notFound('Car not found'), {}, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Car not found' });
  });

  describe('Prisma error translation', () => {
    const cases = [
      // Connection errors
      ['P1000', 503, 'Database authentication failed'],
      ['P1001', 503, 'Cannot reach database server'],
      ['P1002', 503, 'Database connection timeout'],
      ['P1003', 503, 'Database does not exist'],
      ['P1008', 503, 'Database operation timeout'],
      ['P1009', 503, 'Database already exists'],
      ['P1010', 403, 'Access denied'],
      ['P1011', 503, 'TLS connection error'],
      ['P1012', 400, 'Schema validation error'],
      ['P1013', 400, 'Invalid database string'],
      ['P1014', 400, 'Model does not exist'],
      ['P1015', 503, 'Unsupported Prisma schema'],
      ['P1016', 400, 'Incorrect number of parameters'],
      ['P1017', 503, 'Server has closed the connection'],
      // Query errors
      ['P2000', 400, 'Value too long for column'],
      ['P2001', 404, 'Record not found'],
      ['P2004', 400, 'Constraint violation'],
      ['P2005', 400, 'Invalid value for field type'],
      ['P2006', 400, 'Invalid value provided'],
      ['P2007', 400, 'Data validation error'],
      ['P2008', 400, 'Failed to parse query'],
      ['P2009', 400, 'Failed to validate query'],
      ['P2010', 500, 'Raw query failed'],
      ['P2011', 400, 'Null constraint violation'],
      ['P2012', 400, 'Missing required value'],
      ['P2013', 400, 'Missing required argument'],
      ['P2014', 400, 'Relation violation'],
      ['P2015', 404, 'Related record not found'],
      ['P2016', 400, 'Query interpretation error'],
      ['P2017', 400, 'Records not connected'],
      ['P2018', 400, 'Required connected records not found'],
      ['P2019', 400, 'Input error'],
      ['P2020', 400, 'Value out of range'],
      ['P2021', 404, 'Table does not exist'],
      ['P2022', 404, 'Column does not exist'],
      ['P2023', 400, 'Inconsistent column data'],
      ['P2024', 503, 'Connection pool timeout'],
      ['P2025', 404, 'Record not found'],
      ['P2026', 400, 'Unsupported database feature'],
      ['P2027', 500, 'Multiple database errors occurred'],
      ['P2028', 500, 'Transaction API error'],
      ['P2030', 400, 'Cannot find fulltext index'],
      ['P2033', 400, 'Number out of range'],
      ['P2034', 409, 'Transaction conflict'],
      // Migration / introspection families
      ['P3000', 500, 'Database migration issue detected'],
      ['P3001', 500, 'Database migration issue detected'],
      ['P3002', 500, 'Database migration issue detected'],
      ['P3003', 500, 'Database migration issue detected'],
      ['P3004', 500, 'Database migration issue detected'],
      ['P3005', 500, 'Database migration issue detected'],
      ['P4000', 500, 'Database introspection error'],
      ['P4001', 500, 'Database introspection error'],
      ['P4002', 500, 'Database introspection error'],
    ];

    it.each(cases)(
      '%s → HTTP %i with body.error "%s"',
      (code, status, message) => {
        errorHandler({ code, message: 'from prisma' }, {}, res, next);
        expect(res.status).toHaveBeenCalledWith(status);
        expect(res.json).toHaveBeenCalledWith({ error: message });
      }
    );

    it('P2002 (unique constraint) includes target fields in message', () => {
      errorHandler(
        { code: 'P2002', meta: { target: ['email', 'username'] } },
        {},
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unique constraint failed on email, username',
      });
    });

    it('P2002 falls back to "field" when meta is missing', () => {
      errorHandler({ code: 'P2002' }, {}, res, next);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unique constraint failed on field',
      });
    });

    it('P2003 (foreign key) names the affected field', () => {
      errorHandler(
        { code: 'P2003', meta: { field_name: 'userId' } },
        {},
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Foreign key constraint failed on userId',
      });
    });

    it('unknown P-code defaults to 500', () => {
      errorHandler({ code: 'P9999', message: 'new error' }, {}, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'A database error occurred',
      });
    });
  });

  describe('JWT error translation', () => {
    it('JsonWebTokenError → 401 Invalid token', () => {
      errorHandler({ name: 'JsonWebTokenError' }, {}, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('TokenExpiredError → 401 Token expired', () => {
      errorHandler({ name: 'TokenExpiredError' }, {}, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });
  });

  describe('Unexpected errors', () => {
    it('in production returns sanitized 500 without leaking the message', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        errorHandler(new Error('internal detail'), {}, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Internal Server Error',
        });
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('in development surfaces the error message', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        errorHandler(new Error('debug detail'), {}, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'debug detail' });
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('honours a status already attached to the error object', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const err = Object.assign(new Error('teapot'), { status: 418 });
        errorHandler(err, {}, res, next);
        expect(res.status).toHaveBeenCalledWith(418);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });
  });
});
