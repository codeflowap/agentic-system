import { inngest } from "./inngestClient.js";
import { businessScraperNetwork } from "../networks/businessScraperNetwork.js";

export const generateBrandKit = inngest.createFunction(
  {
    id: "generate-brand-kit",
    name: "Generate Brand Kit",
  },
  { event: "business/generate.brandkit" },
  async ({ event, step }) => {
    const { url } = event.data;
    
    console.log(`[GenerateBrandKit] Starting brand kit generation for ${url}`);
    
    // Step 1: Log start
    await step.run("log-start", async () => {
      return { 
        message: `Starting brand kit analysis for ${url}`,
        url, 
        timestamp: new Date().toISOString() 
      };
    });
    
    // Run the analysis WITHOUT wrapping in step.run to avoid nesting
    console.log(`[Inngest] Running business analysis for ${url}`);
    
    let analysisResult;
    try {
      const { runBusinessAnalysis } = await import("../networks/businessScraperNetwork.js");
      analysisResult = await runBusinessAnalysis(url);
      console.log(`[Inngest] Analysis completed successfully for ${url}`);
    } catch (error) {
      console.error(`[Inngest] Analysis failed for ${url}:`, error);
      throw error;
    }
    
    // Step 2: Log completion
    await step.run("log-completion", async () => {
      return { 
        message: `Completed brand kit analysis for ${url}`,
        resultId: analysisResult.id,
        timestamp: new Date().toISOString() 
      };
    });
    
    return {
      success: true,
      result: analysisResult,
    };
  }
);