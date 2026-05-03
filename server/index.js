"use strict";

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const db = require("./db");
const payRouter = require("./routes/pay");
const jobsAnalysisRouter = require("./routes/jobsAnalysis");
const jobsRouter = require("./routes/jobs");
const creatorRouter = require("./routes/creator");
const adminApiRouter = require("./routes/admin");
const authRouter = require("./routes/auth");
const distributionRouter = require("./routes/distribution");
const contactRouter = require("./routes/contact");
const userRouter = require("./routes/user");
const shareRouter = require("./routes/share");
const { publicRouter: couponPublicRouter } = require("./routes/coupon");
const { router: seckillRouter } = require("./routes/seckill");
const { router: reviewsRouter } = require("./routes/reviews");
const { startMetricsPushCron } = require("./lib/metricsPushCron");
const { startSeckillExpireCron } = require("./lib/seckillExpireCron");

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

/** 短链跳转（须走 API 域名；统计后 302 到目标页） */
app.get("/s/:shortCode", (req, res) => {
  const code = String(req.params.shortCode || "").trim();
  if (!/^[a-z0-9]{4,32}$/i.test(code)) {
    return res.status(404).type("text/plain; charset=utf-8").send("链接不存在");
  }
  try {
    const row = db.prepare("SELECT id, target_url FROM share_links WHERE short_code = ?").get(code);
    if (!row?.target_url) {
      return res.status(404).type("text/plain; charset=utf-8").send("链接不存在");
    }
    db.prepare("UPDATE share_links SET click_count = click_count + 1 WHERE short_code = ?").run(code);
    return res.redirect(302, String(row.target_url));
  } catch (e) {
    console.error("[short-link]", e);
    return res.status(500).type("text/plain; charset=utf-8").send("服务器错误");
  }
});

app.use("/api/pay", payRouter);
app.set("registerPayOrder", payRouter.registerPayOrder);
app.use("/api/coupons", couponPublicRouter);
app.use("/api/seckill", seckillRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/jobs-analysis", jobsAnalysisRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/creator", creatorRouter);
app.use("/api/admin", adminApiRouter);
app.use("/api/distribution", distributionRouter);
app.use("/api/contact", contactRouter);
app.use("/api/share", shareRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "server error" });
});

app.listen(PORT, () => {
  console.log(`[pay-server] listening on http://127.0.0.1:${PORT}`);
  try {
    startMetricsPushCron();
  } catch (e) {
    console.error("[metrics-push] failed to start cron", e);
  }
  try {
    startSeckillExpireCron(db, { forgetPayOrder: payRouter.forgetPayOrder });
  } catch (e) {
    console.error("[seckill-expire] failed to start cron", e);
  }
});
