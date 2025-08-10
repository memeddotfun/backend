import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper for async route handlers to catch errors and pass them to next()
 * This eliminates the need for try/catch blocks in every controller
 * 
 * @param handler - The async controller function to wrap
 * @returns An Express-compatible request handler
 */
export const asyncRoute = (handler: Function): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      next(error);
    }
  };
};
