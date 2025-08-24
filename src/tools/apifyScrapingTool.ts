import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { ScrapedData } from "../types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apifyScrapingTool = createTool({
  name: "apify_scraping",
  description: "Scrapes website content using Apify API (currently using mock data for testing)",
  parameters: z.object({
    url: z.string().url().describe("The URL to scrape"),
    useApify: z.boolean().default(true).describe("Whether to use Apify API or mock data"),
  }),
  handler: async ({ url, useApify }) => {
    console.log(`[ApifyScrapingTool] Starting scrape for URL: ${url}`);
    
    // For now, we'll use mock data instead of actual Apify API
    // In production, this would make an actual API call to Apify
    
    try {
      let mockData: any;
      
      // Determine which mock file to use based on URL
      if (url.includes("spoonity") || url.includes("localhost")) {
        const mockFilePath = path.join(__dirname, "../../spoonity-39000.json");
        const fileContent = await fs.readFile(mockFilePath, "utf-8");
        mockData = JSON.parse(fileContent);
      } else {
        const mockFilePath = path.join(__dirname, "../../tapistro.com_180000.json");
        const fileContent = await fs.readFile(mockFilePath, "utf-8");
        mockData = JSON.parse(fileContent);
      }
      
      // Transform mock data to ScrapedData format
      const scrapedData: ScrapedData = {
        url: url,
        title: mockData.title || "Website Title",
        content: mockData.text || mockData.content || JSON.stringify(mockData),
        metadata: {
          description: mockData.description || "",
          keywords: mockData.keywords || "",
          scrapedBy: useApify ? "apify" : "mock",
        },
        scrapedAt: new Date(),
      };
      
      console.log(`[ApifyScrapingTool] Successfully scraped ${scrapedData.content.length} characters`);
      
      return {
        success: true,
        data: scrapedData,
      };
    } catch (error) {
      console.error("[ApifyScrapingTool] Error during scraping:", error);
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});