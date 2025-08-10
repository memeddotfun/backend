import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    // Extend the RequestHandler type to accept our controller return types
    interface RequestHandler {
      (req: Request, res: Response, next: NextFunction): any;
    }
  }
}

// Extend the Router interface to accept our controller functions
declare module 'express-serve-static-core' {
  interface IRouterMatcher<T> {
    <P extends string, ResBody = any, ReqBody = any>(path: P, ...handlers: Array<(req: Request<import('express-serve-static-core').ParamsDictionary, ResBody, ReqBody>, res: Response<ResBody>, next: NextFunction) => any>): T;
  }
}

export {};
