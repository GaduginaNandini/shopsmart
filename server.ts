import express, { type NextFunction, type Request, type Response } from "express";
import { seedProducts } from "./src/models.ts";
import { router } from "./src/routes.ts";
import { bump } from "./src/services.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

seedProducts();

app.use(express.json());

// Request timing and metrics middleware
app.use((req: Request, res: Response, next: NextFunction) => {
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
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`ShopSmart server listening on http://${HOST}:${PORT}`);
});
