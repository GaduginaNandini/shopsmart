import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { verifySessionToken } from "../lib/session.ts";
import {
  getOrCreateFirebaseUser,
  getUserById,
  type PublicUser,
} from "../db/repository.ts";

export interface AuthRequest extends Request {
  authUser?: PublicUser;
}

async function resolveBearerUser(token: string): Promise<PublicUser | null> {
  const localPayload = verifySessionToken(token);
  if (localPayload) {
    return await getUserById(localPayload.userId);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    return await getOrCreateFirebaseUser(
      decoded.uid,
      decoded.email,
      decoded.name || decoded.email.split("@")[0]
    );
  } catch {
    return null;
  }
}

export async function authenticateOptional(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) {
      try {
        const user = await resolveBearerUser(token);
        if (user) {
          req.authUser = user;
        }
      } catch (err) {
        console.error("Auth resolution error:", err);
      }
    }
  }
  next();
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing token" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Empty token" });
    return;
  }

  try {
    const user = await resolveBearerUser(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Invalid token" });
      return;
    }
    req.authUser = user;
    next();
  } catch (err) {
    console.error("Error verifying authentication token:", err);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

export function ownerTokenMatches(req: Request): boolean {
  const expected = process.env.OWNER_TOKEN;
  if (!expected) return false;
  const provided = req.header("X-Owner-Token") ?? "";
  const a = Buffer.from(provided, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (ownerTokenMatches(req)) {
    next();
    return;
  }

  if (req.authUser?.role === "admin") {
    next();
    return;
  }

  if (req.headers.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.slice("Bearer ".length).trim();
    try {
      const user = await resolveBearerUser(token);
      if (user) {
        req.authUser = user;
        if (user.role === "admin") {
          next();
          return;
        }
      }
    } catch {
      // fall through to 403
    }
  }

  res.status(403).json({ error: "Admin access or valid owner token required" });
}
