import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { ScrapedData } from "../types/index.js";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token estimation: ~4 characters per token (conservative estimate)
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS_FOR_GEMINI = 950000; // Stay under 1M limit
const MAX_CHARS_FOR_GEMINI = MAX_TOKENS_FOR_GEMINI * CHARS_PER_TOKEN;

export const apifyScrapingTool = createTool({
  name: "apify_scraping",
  description: "Scrapes website content using Apify API (currently using mock data for testing)",
  parameters: z.object({
    url: z.string().describe("The URL to scrape"),
    useApify: z.boolean().default(true).describe("Whether to use Apify API or mock data"),
  }),
  handler: async ({ url, useApify }, { network }) => {
    console.log(`[ApifyScrapingTool] Starting scrape for URL: ${url}`);
    
    // For now, we'll use mock data instead of actual Apify API
    // In production, this would make an actual API call to Apify
    
    try {
      let mockData: any;
      
      // Determine which mock file to use based on URL
      let mockFilePath;
      if (url.includes("spoonity") || url.includes("localhost")) {
        mockFilePath = path.join(__dirname, "../../spoonity-39000.json");
        console.log(`[ApifyScrapingTool] Using SMALL file: spoonity-39000.json for ${url}`);
      } else {
        mockFilePath = path.join(__dirname, "../../tapistro.com_180000.json");
        console.log(`[ApifyScrapingTool] Using LARGE file: tapistro.com_180000.json for ${url}`);
      }
      
      const fileContent = await fs.readFile(mockFilePath, "utf-8");
      mockData = JSON.parse(fileContent);
      
      // Get original content
      const originalContent = mockData.text || mockData.content || JSON.stringify(mockData);
      const originalLength = originalContent.length;
      
      console.log(`[ApifyScrapingTool] Successfully scraped ${originalLength} characters`);
      
      // 1. Save ORIGINAL untruncated data locally (even if >1M tokens)
      const rawDataDir = path.join(__dirname, "../../data/raw_scraped");
      await fs.mkdir(rawDataDir, { recursive: true });
      
      const originalScrapedData: ScrapedData = {
        url: url,
        title: mockData.title || "Website Title",
        content: originalContent,
        metadata: {
          description: mockData.description || "",
          keywords: mockData.keywords || "",
          scrapedBy: useApify ? "apify" : "mock",
          originalLength: originalLength,
          wasTruncated: false,
        },
        scrapedAt: new Date(),
      };
      
      const rawFileName = `raw_scraped_${nanoid(8)}_${new Date().getTime()}.json`;
      const rawFilePath = path.join(rawDataDir, rawFileName);
      await fs.writeFile(rawFilePath, JSON.stringify(originalScrapedData, null, 2));
      console.log(`[ApifyScrapingTool] Saved original data (${originalLength} chars) to: ${rawFilePath}`);
      
      // 2. Create truncated version for Gemini (≤950k tokens)
      let processedContent = originalContent;
      let wasTruncated = false;
      
      if (originalLength > MAX_CHARS_FOR_GEMINI) {
        processedContent = originalContent.substring(0, MAX_CHARS_FOR_GEMINI);
        wasTruncated = true;
        console.log(`[ApifyScrapingTool] Content truncated from ${originalLength} to ${processedContent.length} characters for Gemini processing`);
      }
      
      const processedScrapedData: ScrapedData = {
        url: url,
        title: mockData.title || "Website Title",
        content: processedContent, // Truncated for tools
        metadata: {
          description: mockData.description || "",
          keywords: mockData.keywords || "",
          scrapedBy: useApify ? "apify" : "mock",
          originalLength: originalLength,
          wasTruncated: wasTruncated,
          rawDataFile: rawFileName,
        },
        scrapedAt: new Date(),
      };
      
      // 3. Store TRUNCATED data in network state for tools to access
      if (network) {
        const state = network.state.kv as Map<string, any>;
        state.set("scrapedData", processedScrapedData);
      }
      
      // 4. Return ONLY summary to agent (avoid token limits)
      const contentPreview = processedScrapedData.content.substring(0, 500) + "...";
      const agentSummary = {
        url: processedScrapedData.url,
        title: processedScrapedData.title,
        originalLength: originalLength,
        processedLength: processedScrapedData.content.length,
        wasTruncated: wasTruncated,
        contentPreview,
        scrapedAt: processedScrapedData.scrapedAt,
        rawDataFile: rawFileName,
      };
      
      return {
        success: true,
        data: agentSummary, // Agent gets summary only
        message: `Scraped ${originalLength} characters. ${wasTruncated ? `Truncated to ${processedContent.length} chars for processing.` : 'No truncation needed.'} Original saved locally, processed data in network state.`
      };
    } catch (error) {
      console.error("[ApifyScrapingTool] Error during scraping:", error);
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});