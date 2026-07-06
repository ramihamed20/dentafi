import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { migrate } from "./db/database.js";
import { seed } from "./db/seed.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { platformRouter } from "./routes/platform.js";

const app = express();
const port = Number(process.env.PORT || 4000);

migrate();
seed();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ data: { ok: true, name: "Dentify API" } });
});
app.use("/api/auth", authRouter);
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ data: req.user });
});
app.use("/api", platformRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Dentify API listening on http://localhost:${port}`);
});
