import { Request, Response, NextFunction } from 'express';

// Define controller handler types that match our existing controllers
export type ControllerFunction = (
  req: Request,
  res: Response
) => Promise<Response | void | undefined> | Response | void | undefined;

// Define common controller response types
export interface SuccessResponse {
  success: true;
  data: any;
  message?: string;
}

export interface ErrorResponse {
  message: string;
  stack?: string;
}

// Type for Express request handler
export type ExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// Helper function to wrap async controllers with error handling
export const asyncHandler = (fn: ControllerFunction): ExpressHandler => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.resolve(fn(req, res));
    } catch (err) {
      next(err);
    }
  };
