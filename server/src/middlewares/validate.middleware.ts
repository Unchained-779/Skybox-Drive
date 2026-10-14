import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodTypeAny } from "zod";

export interface ValidationTargets {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schemas: ValidationTargets | AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ("parseAsync" in schemas) {
        const parsed = (await schemas.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        })) as { body?: unknown; query?: unknown; params?: unknown };

        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query as Request["query"];
        if (parsed.params !== undefined) req.params = parsed.params as Request["params"];
      } else {
        if (schemas.body) {
          req.body = await schemas.body.parseAsync(req.body);
        }
        if (schemas.query) {
          req.query = (await schemas.query.parseAsync(req.query)) as Request["query"];
        }
        if (schemas.params) {
          req.params = (await schemas.params.parseAsync(req.params)) as Request["params"];
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
