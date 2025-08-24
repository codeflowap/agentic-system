import { createNetwork, openai } from "@inngest/agent-kit";
import { brandKitAgent } from "../agents/brandKitAgent.js";
import { competitorAgent } from "../agents/competitorAgent.js";
import { apifyScrapingTool } from "../tools/apifyScrapingTool.js";
import type { BrandKitResult, ScrapedData, BrandKit, CompetitorAnalysis } from "../types/index.js";
import { nanoid } from "nanoid";

export const businessScraperNetwork = createNetwork({
  name: "Business Scraper Network",
  description: "Orchestrates web scraping and AI analysis to generate brand kits and identify competitors",
  
  agents: [brandKitAgent, competitorAgent],
  
  defaultModel: openai({ 
    model: "gpt-4",
    temperature: 0.1,
  }),
  
  maxConcurrency: 1, // Sequential execution
});

export async function runBusinessAnalysis(url: string): Promise<BrandKitResult> {
  console.log(`[BusinessScraperNetwork] Starting analysis for ${url}`);
  
  try {
    // Phase 1: Scrape the website
    console.log(`[BusinessScraperNetwork] Phase 1: Scraping website`);
    const scrapingResult = await apifyScrapingTool.handler({
      url,
      useApify: true,
    });
    
    if (!scrapingResult.success || !scrapingResult.data) {
      throw new Error("Failed to scrape website");
    }
    
    const scrapedData: ScrapedData = scrapingResult.data;
    console.log(`[BusinessScraperNetwork] Scraped ${scrapedData.content.length} characters`);
    
    // Phase 2: Run Brand Kit Analysis Agent
    console.log(`[BusinessScraperNetwork] Phase 2: Running Brand Kit Agent`);
    const brandKitPrompt = `Analyze this scraped website content and create a comprehensive brand kit:
    
URL: ${scrapedData.url}
Title: ${scrapedData.title || "N/A"}
Content: ${scrapedData.content}

Use the brand_analysis tool to generate a structured brand kit.`;
    
    const brandKitResponse = await brandKitAgent.run(brandKitPrompt);
    
    // Extract brand kit from agent response
    let brandKit: BrandKit;
    if (brandKitResponse && typeof brandKitResponse === 'object' && 'brandKit' in brandKitResponse) {
      brandKit = (brandKitResponse as any).brandKit;
    } else {
      // Parse from text response if needed
      const jsonMatch = String(brandKitResponse).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        brandKit = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to extract brand kit from agent response");
      }
    }
    
    console.log(`[BusinessScraperNetwork] Brand kit generated successfully`);
    
    // Phase 3: Run Competitor Analysis Agent
    console.log(`[BusinessScraperNetwork] Phase 3: Running Competitor Agent`);
    const competitorPrompt = `Based on this brand kit, identify 3 direct competitors:

Brand Kit:
${JSON.stringify(brandKit, null, 2)}

Original URL: ${url}

Use the competitor_analysis tool to find and analyze competitors.`;
    
    const competitorResponse = await competitorAgent.run(competitorPrompt);
    
    // Extract competitors from agent response
    let competitors: CompetitorAnalysis;
    if (competitorResponse && typeof competitorResponse === 'object' && 'competitors' in competitorResponse) {
      competitors = (competitorResponse as any).competitors;
    } else {
      // Parse from text response if needed
      const jsonMatch = String(competitorResponse).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        competitors = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to extract competitors from agent response");
      }
    }
    
    console.log(`[BusinessScraperNetwork] Identified ${competitors.competitors.length} competitors`);
    
    // Phase 4: Compile final result
    const result: BrandKitResult = {
      id: `bkit_${nanoid(10)}`,
      url,
      brandKit,
      competitors,
      scrapedData,
      createdAt: new Date(),
    };
    
    console.log(`[BusinessScraperNetwork] Analysis complete for ${url}`);
    return result;
    
  } catch (error) {
    console.error(`[BusinessScraperNetwork] Error during analysis:`, error);
    throw error;
  }
}