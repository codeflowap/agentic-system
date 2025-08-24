import { inngest } from "./inngestClient.js";
import { businessScraperNetwork } from "../networks/businessScraperNetwork.js";

// Create a shared network state for tool communication
let sharedNetworkState: Map<string, any> | null = null;

export const generateBrandKit = inngest.createFunction(
  {
    id: "generate-brand-kit",
    name: "Generate Brand Kit",
  },
  { event: "business/generate.brandkit" },
  async ({ event, step }) => {
    const { url } = event.data;
    
    console.log(`[GenerateBrandKit] Starting brand kit generation for ${url}`);
    
    // Step 1: Initialize shared state
    await step.run("initialize-state", async () => {
      sharedNetworkState = new Map([
        ["url", url],
        ["completedSteps", []]
      ]);
      return { 
        message: `Initialized analysis state for ${url}`,
        timestamp: new Date().toISOString() 
      };
    });
    
    // Step 2: Apify Scraping Tool
    const scrapingResult = await step.run("apify-scraping-tool", async () => {
      console.log(`[Step] Apify Scraping Tool: Scraping ${url}`);
      
      const { apifyScrapingTool } = await import("../tools/apifyScrapingTool.js");
      const result = await apifyScrapingTool.handler(
        { url, useApify: false },
        { network: { state: { kv: sharedNetworkState } } }
      );
      
      const scrapedData = sharedNetworkState?.get("scrapedData");
      return {
        success: result.success,
        message: result.message,
        contentLength: scrapedData?.content?.length || 0,
        timestamp: new Date().toISOString()
      };
    });
    
    // Step 3: Brand Analysis Tool (Gemini 1.5 Pro)
    const brandAnalysisResult = await step.run("brand-analysis-tool-gemini", async () => {
      console.log(`[Step] Brand Analysis Tool: Processing with Gemini 1.5 Pro`);
      
      const { brandAnalysisTool } = await import("../tools/brandAnalysisTool.js");
      const result = await brandAnalysisTool.handler(
        { url, title: "Website Title", content: "" }, // Minimal params, tool gets full data from state
        { network: { state: { kv: sharedNetworkState } } }
      );
      
      const brandKit = sharedNetworkState?.get("brandKit");
      return {
        success: result.success,
        brandKitGenerated: !!brandKit,
        aboutBrand: brandKit?.aboutTheBrand?.description?.substring(0, 100) || "Generated",
        timestamp: new Date().toISOString()
      };
    });
    
    // Step 4: Competitor Analysis Tool (Gemini 1.5 Pro)  
    const competitorResult = await step.run("competitor-analysis-tool-gemini", async () => {
      console.log(`[Step] Competitor Analysis Tool: Identifying competitors with Gemini 1.5 Pro`);
      
      const { competitorAnalysisTool } = await import("../tools/competitorAnalysisTool.js");
      const brandKit = sharedNetworkState?.get("brandKit");
      
      if (!brandKit) {
        throw new Error("Brand kit not found in state for competitor analysis");
      }
      
      const result = await competitorAnalysisTool.handler(
        {
          aboutTheBrand: brandKit.aboutTheBrand?.description || "",
          idealCustomerProfile: brandKit.idealCustomerProfile?.description || "",
          brandPointOfView: brandKit.brandPointOfView?.coreBeliefs || "",
          toneOfVoice: brandKit.toneOfVoice || "",
          authorPersona: brandKit.authorPersona?.personality || "",
          url
        },
        { network: { state: { kv: sharedNetworkState } } }
      );
      
      const competitors = sharedNetworkState?.get("competitors");
      return {
        success: result.success,
        competitorsFound: competitors?.competitors?.length || 0,
        firstCompetitor: competitors?.competitors?.[0]?.name || "Unknown",
        timestamp: new Date().toISOString()
      };
    });
    
    // Step 5: Compile final results
    const finalResult = await step.run("compile-final-results", async () => {
      console.log(`[Step] Compiling final brand kit results`);
      
      const scrapedData = sharedNetworkState?.get("scrapedData");
      const brandKit = sharedNetworkState?.get("brandKit");
      const competitors = sharedNetworkState?.get("competitors");
      
      if (!scrapedData || !brandKit || !competitors) {
        throw new Error("Missing required data in network state");
      }
      
      // Generate unique ID
      const { nanoid } = await import("nanoid");
      const result = {
        id: `bkit_${nanoid(10)}`,
        url,
        brandKit,
        competitors,
        scrapedData,
        createdAt: new Date(),
      };
      
      return {
        success: true,
        result,
        message: `Brand kit analysis completed for ${url}`,
        resultId: result.id,
        timestamp: new Date().toISOString()
      };
    });
    
    // Clear shared state
    sharedNetworkState = null;
    
    return {
      success: true,
      result: finalResult.result,
    };
  }
);