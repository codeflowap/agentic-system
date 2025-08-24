import { createNetwork, openai } from "@inngest/agent-kit";
import { brandKitAgent } from "../agents/brandKitAgent.js";
import { competitorAgent } from "../agents/competitorAgent.js";
import type { BrandKitResult } from "../types/index.js";
import { nanoid } from "nanoid";

// Define the network state interface
interface NetworkState {
  url: string;
  scrapedData?: any;
  brandKit?: any;
  competitors?: any;
  completedSteps: string[];
}

export const businessScraperNetwork = createNetwork<NetworkState>({
  name: "Business Scraper Network",
  description: "Orchestrates web scraping and AI analysis to generate brand kits and identify competitors",
  
  agents: [brandKitAgent, competitorAgent],
  
  defaultModel: openai({ 
    model: "gpt-4",
    temperature: 0.1,
    maxTokens: 8000,  // Network orchestration
  }),
  
  // Custom router to control the agent flow
  router: ({ network, lastResult, callCount }) => {
    const state = network.state.kv as Map<string, any>;
    const completedSteps = state.get("completedSteps") || [];
    
    // Step 1: Brand Kit Analysis (includes scraping)
    if (!completedSteps.includes("brandAnalysis")) {
      console.log("[Router] Routing to Brand Kit Agent for scraping and analysis");
      return brandKitAgent;
    }
    
    // Step 2: Competitor Analysis
    if (!completedSteps.includes("competitorAnalysis") && state.get("brandKit")) {
      console.log("[Router] Routing to Competitor Agent for competitor identification");
      return competitorAgent;
    }
    
    // All steps completed
    console.log("[Router] All analysis steps completed");
    return undefined; // End the network
  },
  
  maxIter: 5, // Maximum iterations to prevent infinite loops
});

export async function runBusinessAnalysis(url: string): Promise<BrandKitResult> {
  console.log(`[BusinessScraperNetwork] Starting analysis for ${url}`);
  
  try {
    // Initialize the network state
    const initialState: NetworkState = {
      url,
      completedSteps: [],
    };
    
    // Run the network with the initial prompt
    const result = await businessScraperNetwork.run(
      `Analyze the website at ${url}. 
      First, scrape the website using the apify_scraping tool.
      Then, analyze the scraped content to create a comprehensive brand kit using the brand_analysis tool.
      Finally, based on the brand kit, identify 3 direct competitors using the competitor_analysis tool.`,
      {
        state: {
          kv: new Map(Object.entries(initialState)),
        },
      }
    );
    
    // Extract results from the network state
    const finalState = result.state.kv as Map<string, any>;
    const scrapedData = finalState.get("scrapedData");
    const brandKit = finalState.get("brandKit");
    const competitors = finalState.get("competitors");
    
    if (!scrapedData || !brandKit || !competitors) {
      throw new Error("Network did not complete all required analysis steps");
    }
    
    // Compile final result
    const finalResult: BrandKitResult = {
      id: `bkit_${nanoid(10)}`,
      url,
      brandKit,
      competitors,
      scrapedData,
      createdAt: new Date(),
    };
    
    console.log(`[BusinessScraperNetwork] Analysis complete for ${url}`);
    return finalResult;
    
  } catch (error) {
    console.error(`[BusinessScraperNetwork] Error during analysis:`, error);
    throw error;
  }
}