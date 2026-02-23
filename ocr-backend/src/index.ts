import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { fuzzyMatchAll } from "./fuzzy-match";

const app = new Hono();

app.post("/fuzzy-match", async (c) => {
  const body = await c.req.json<{ drugs?: string[] }>();

  if (!body.drugs || !Array.isArray(body.drugs)) {
    return c.json({ error: "drugs must be a string array" }, 400);
  }

  const results = fuzzyMatchAll(body.drugs);
  return c.json({ results });
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
