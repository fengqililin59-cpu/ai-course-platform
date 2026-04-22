"use strict";

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const payRouter = require("./routes/pay");

const PORT = Number(process.env.PORT) || 8787;

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.type("text").send("ok");
});

app.use("/api/pay", payRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "server error" });
});

app.listen(PORT, () => {
  console.log(`[pay-server] listening on http://127.0.0.1:${PORT}`);
});
