import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    admin?: {
      username: string;
      authenticated: boolean;
    };
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.admin?.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required" });
}
