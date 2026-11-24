import "dotenv/config";
import { createApp } from "./src/app.ts";

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`ShopSmart server listening on http://${HOST}:${PORT}`);
});
