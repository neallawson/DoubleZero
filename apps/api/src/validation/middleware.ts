import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { labelForField } from './errors.js';

/**
 * Formats a single Zod error into a user-friendly message.
 * Examples:
 *   { path: ["gameTypeId"], message: "Required" }       → "Game type is required"
 *   { path: ["email"], message: "Invalid email" }       → "Email: invalid email"
 *   { path: ["name"], message: "String must contain at least 1 character(s)" }
 *                                                        → "Name: must contain at least 1 character(s)"
 */
function formatZodError(e: z.ZodIssue): { field: string; message: string } {
  const path = e.path.join('.');
  const label = path ? labelForField(path) : '';

  if (!path) {
    return { field: '', message: e.message };
  }

  const msg = e.message;

  // "Required" → "Label is required"
  if (msg === 'Required') {
    return { field: path, message: `${label} is required` };
  }

  // Strip "String must" / "Number must" prefixes for cleaner messages
  const cleaned = msg
    .replace(/^String must/, 'Must')
    .replace(/^Number must/, 'Must')
    .replace(/^Expected /, 'expected ')
    .replace(/^Invalid /, 'invalid ');

  // Lowercase first character of cleaned message for natural reading
  const lowerMsg = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);

  return { field: path, message: `${label}: ${lowerMsg}` };
}

/**
 * Middleware factory that validates request body against a Zod schema.
 * On success, replaces req.body with the parsed/transformed data.
 * On failure, returns a 400 response with validation errors.
 */
export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map(formatZodError);

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatted.map(f => f.message).join('; '),
            details: formatted,
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
        },
      });
    }
  };
}

/**
 * Validates query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map(formatZodError);

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatted.map(f => f.message).join('; '),
          },
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
        },
      });
    }
  };
}
