const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const pg = require("pg");
const connectPgSimple = require("connect-pg-simple");
const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const trackStatRoutes = require("./routes/trackStatRoutes");

const app = express();
const PgSessionStore = connectPgSimple(session);
const allowedOrigins = String(env.frontendOrigin || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const pgPool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
});
const sessionStore = new PgSessionStore({
  pool: pgPool,
  tableName: "user_sessions",
  createTableIfMissing: true,
});

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === "null") return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS blocked for this origin"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  session({
    name: "trackstat.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production" || env.cookieSecure,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
    store: sessionStore,
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/track-stats", trackStatRoutes);

app.use((err, _req, res, _next) => {
  const status = Number(err?.status || 500);
  const message = status >= 500 ? "Internal server error" : err.message || "Request failed";
  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
});

module.exports = app;
