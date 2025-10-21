import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { authMiddleware } from "./middleware";
import artistSearchRouter from "./routes/artist-search";
import trendingSetsRouter from "./routes/trending-sets";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import uploadRouter from "./routes/upload";
dotenv.config();

// Extend the Request type to include startTime
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

console.log("Starting environment variables loading...");

// Load environment variables
// Priority order:
// 1. .env file at project root
// 2. .env.local file at project root (overrides .env)
// 3. client/.env.local (overrides other files, useful for frontend env vars)

console.log(
  `SUPABASE_JWT_SECRET available: ${!!process.env.SUPABASE_JWT_SECRET}`
);

const dotenvFiles = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "client/.env.local"),
];

dotenvFiles.forEach((dotenvFile) => {
  if (fs.existsSync(dotenvFile)) {
    console.log(`Loading environment variables from ${dotenvFile}`);
    dotenv.config({ path: dotenvFile });
  }
});

// Log API key presence for debugging
const apiKeys = {
  setlistFm: process.env.SETLIST_FM_API_KEY ? true : false,
  setlistFmAlt: process.env.SETLISTFM_API_KEY ? true : false,
  soundcloud: process.env.SOUNDCLOUD_CLIENT_ID ? true : false,
  youtube: process.env.YOUTUBE_API_KEY ? true : false,
  mixcloud: process.env.MIXCLOUD_API_KEY ? true : false,
};

console.log("API Keys loaded:");
console.log(`- SETLIST_FM_API_KEY present: ${apiKeys.setlistFm}`);
console.log(`- SETLISTFM_API_KEY present: ${apiKeys.setlistFmAlt}`);
console.log(`- SOUNDCLOUD_CLIENT_ID present: ${apiKeys.soundcloud}`);
console.log(`- YOUTUBE_API_KEY present: ${apiKeys.youtube}`);
console.log(`- MIXCLOUD_API_KEY present: ${apiKeys.mixcloud}`);

// Log the environment variables with sensitive values hidden
console.log("All environment variables related to API keys:");
Object.keys(process.env)
  .filter(
    (key) =>
      key.includes("SECRET") ||
      key.includes("API_KEY") ||
      key.includes("CLIENT_ID") ||
      key.includes("SUPABASE")
  )
  .forEach((key) => {
    console.log(
      `- ${key}: ${
        key.includes("SECRET") ? "[HIDDEN]" : process.env[key] ? true : false
      }`
    );
  });

// Middlewares
const app = express();

// Add CORS middleware to handle cross-origin requests and Authorization header
app.use((req, res, next) => {
  // const allowedOrigin =
  //   process.env.NODE_ENV === "production"
  //     ? "https://your-frontend-domain.com"
  //     : "*";

  const allowedOrigin = "*"; // Allow all origins for development/testing
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Log all headers for debugging
  console.log("[CORS] Request headers:", req.headers);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log("[CORS] Handling OPTIONS preflight request");
    return res.status(200).end();
  }

  next();
});

app.use(express.json());

// Auth middleware
app.use(authMiddleware);

// Add timestamp to logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const time = new Date().toLocaleTimeString();
  const originalSend = res.send;

  // Add timing to HTTP responses
  res.send = function (body) {
    const end = Date.now();

    if (req.url.startsWith("/api")) {
      const responseBody = body
        ? body.toString().substring(0, 50) +
          (body.toString().length > 50 ? "…" : "")
        : "";
      log(
        `${time} ${req.method} ${req.url} ${res.statusCode} in ${
          req.startTime ? Math.round(end - req.startTime) : "?"
        }ms${responseBody ? " :: " + responseBody : ""}`
      );
    }

    return originalSend.call(this, body);
  };

  req.startTime = Date.now();
  next();
});

// API route for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Register artist search router
app.use(artistSearchRouter);

// Register trending sets router
app.use(trendingSetsRouter);

// Register the main routes file which contains API endpoints for sets
registerRoutes(app);

// Set up Vite development server and static asset serving
const PORT = process.env.PORT || 3001;

// Create the HTTP server
const server = createServer(app);

// Register upload router
app.use(uploadRouter);

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// ✅ NEW: Serve Vite-built static assets (add this)
app.use(express.static(path.resolve(process.cwd(), "dist/public")));

if (process.env.NODE_ENV === "development") {
  setupVite(app, server).then(() => {
    server.listen(PORT, () => {
      log(`Server (dev) listening on http://127.0.0.1:${PORT}`);
    });
  });
} else {
  server.listen(PORT, () => {
    log(`Server (prod) listening on http://127.0.0.1:${PORT}`);
    // Serve frontend index.html for unmatched routes (like "/")
    app.get("*", (req, res) => {
      const indexPath = path.resolve(process.cwd(), "dist/public/index.html");
      res.sendFile(indexPath);
    });
  });
}
