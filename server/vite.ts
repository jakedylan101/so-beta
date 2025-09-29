import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    appType: 'custom' as const
  };

  try {
    log("Starting Vite middleware setup...", "vite");
    
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: viteLogger,
      server: serverOptions,
    });

    // Apply Vite middleware but keep Express in control
    app.use(vite.middlewares);
    
    // Catch-all route for SPA but only for non-API routes
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Skip API routes so Express can handle them
      if (url.startsWith('/api/')) {
        return next();
      }

      try {
        const clientTemplate = path.resolve(
          import.meta.dirname,
          "..",
          "client",
          "index.html",
        );

        // Load and transform the HTML template
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        log(`Error serving HTML: ${(e as Error).message}`, "vite-error");
        next(e);
      }
    });
    
    log("Vite middleware setup complete", "vite");
  } catch (err) {
    log(`Failed to initialize Vite: ${(err as Error).message}`, "vite-error");
    throw err;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // SPA fallback for non-API routes 
  app.use("*", (req, res, next) => {
    // Skip API routes
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
