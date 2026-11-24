import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { router } from "./routes.ts";
import { bump } from "./services.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    res.on("finish", () => {
      bump("requests");
      bump("latency_sum", (performance.now() - start) / 1000);
      if (res.statusCode >= 500) {
        bump("errors");
      }
    });
    next();
  });

  app.use(router);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}
