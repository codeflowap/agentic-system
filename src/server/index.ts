import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest } from "./inngestClient.js";
import { generateBrandKit } from "./functions.js";
import { runBusinessAnalysis } from "../networks/businessScraperNetwork.js";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Inngest endpoint for observability
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [generateBrandKit],
    signingKey: process.env.INNGEST_SIGNING_KEY,
  })
);

// Main API endpoint for generating brand kits
app.post("/api/business/generate-brandkit", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }
    
    console.log(`[API] Received request to analyze ${url}`);
    
    // Run the analysis directly (for immediate response)
    // You can also trigger via Inngest for async processing
    const result = await runBusinessAnalysis(url);
    
    // Save result to local storage
    const resultsDir = path.join(__dirname, "../../data/results");
    await fs.mkdir(resultsDir, { recursive: true });
    
    const filename = `${result.id}.json`;
    const filepath = path.join(resultsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    
    console.log(`[API] Saved result to ${filepath}`);
    
    // Also trigger Inngest for observability
    await inngest.send({
      name: "business/generate.brandkit",
      data: { url, resultId: result.id },
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error processing request:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

// Get a specific brand kit result
app.get("/api/business/brandkit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const filepath = path.join(__dirname, `../../data/results/${id}.json`);
    const data = await fs.readFile(filepath, "utf-8");
    const result = JSON.parse(data);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Error fetching result:", error);
    res.status(404).json({
      success: false,
      error: "Brand kit not found",
    });
  }
});

// List all brand kits
app.get("/api/business/brandkits", async (req, res) => {
  try {
    const resultsDir = path.join(__dirname, "../../data/results");
    
    try {
      const files = await fs.readdir(resultsDir);
      const results = [];
      
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filepath = path.join(resultsDir, file);
          const data = await fs.readFile(filepath, "utf-8");
          const result = JSON.parse(data);
          results.push({
            id: result.id,
            url: result.url,
            createdAt: result.createdAt,
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      // Directory doesn't exist yet
      res.json({
        success: true,
        data: [],
      });
    }
  } catch (error) {
    console.error("[API] Error listing results:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list brand kits",
    });
  }
});

// Health check
app.get("/api/business/health", (req, res) => {
  res.json({
    success: true,
    message: "Business Scraper API is running",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Inngest Dev Server: npx inngest-cli@latest dev -u http://localhost:${PORT}/api/inngest`);
  console.log(`\n📝 API Endpoints:`);
  console.log(`  POST /api/business/generate-brandkit - Generate brand kit for a URL`);
  console.log(`  GET  /api/business/brandkit/:id - Get specific brand kit`);
  console.log(`  GET  /api/business/brandkits - List all brand kits`);
  console.log(`  GET  /api/business/health - Health check`);
});