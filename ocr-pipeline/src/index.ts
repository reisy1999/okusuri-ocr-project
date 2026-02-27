import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fuzzyMatchAll } from "./fuzzy-match";
import { pipeline } from "./pipeline";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/pipeline", pipeline);

app.post("/fuzzy-match", async (c) => {
  const body = await c.req.json<{ drugs?: string[] }>();

  if (!body.drugs || !Array.isArray(body.drugs)) {
    return c.json({ error: "drugs must be a string array" }, 400);
  }

  const results = fuzzyMatchAll(body.drugs);
  return c.json({ results });
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const status = err.message.includes("ocr-api returned") ? 502 : 500;
  return c.json({ error: err.message }, status);
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`ocr-pipeline running on http://localhost:${port}`);
});
