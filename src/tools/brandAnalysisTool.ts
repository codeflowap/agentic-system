import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { ModelService } from "../core/ModelService.js";
import type { BrandKit, ScrapedData } from "../types/index.js";

export const brandAnalysisTool = createTool({
  name: "brand_analysis",
  description: "Analyzes scraped website content to generate a comprehensive brand kit using Gemini 1.5 Pro",
  parameters: z.object({
    url: z.string().describe("The URL of the scraped website"),
    title: z.string().describe("The title of the scraped website"),
    content: z.string().describe("The scraped website content"),
  }),
  handler: async ({ url, title, content }, { network }) => {
    console.log(`[BrandAnalysisTool] Starting brand analysis for ${url}`);
    
    // Get full scraped data from network state (not from agent parameters)
    if (!network) {
      throw new Error("Network context required to access scraped data");
    }
    
    const state = network.state.kv as Map<string, any>;
    const scrapedData = state.get("scrapedData");
    
    if (!scrapedData) {
      throw new Error("No scraped data found in network state. Run scraping tool first.");
    }
    
    console.log(`[BrandAnalysisTool] Processing ${scrapedData.content.length} characters with Gemini 1.5 Pro`);
    
    const modelService = new ModelService();
    
    const prompt = `You are a brand strategy expert. Analyze the following website content and create a comprehensive brand kit.

Website URL: ${scrapedData.url}
Website Title: ${scrapedData.title || "N/A"}

Content:
${scrapedData.content} 

Based on this content, create a detailed brand kit with the following sections. Be specific and comprehensive:

1. About the Brand: Provide a detailed description of what the company does, their core offerings, unique selling points, mission, target market, and any key information about their operations, locations, or legal structure.

2. Ideal Customer Profile: Describe the ideal customer including their role/title, company type, size, industry, geographic location, primary needs, pain points, and what they value most in a solution.

3. Brand Point of View: Explain the brand's core beliefs, positioning, differentiation from competitors, and their vision for the future of their industry.

4. Tone of Voice: Describe the brand's communication style in a few words.

5. Author Persona: Describe the personality and communication approach used in the brand's content, including writing style, key terms they use, and how they engage with their audience.

Format your response as a JSON object with these exact keys:
{
  "aboutTheBrand": "...",
  "idealCustomerProfile": "...",
  "brandPointOfView": "...",
  "toneOfVoice": "...",
  "authorPersona": "..."
}`;

    try {
      const response = await modelService.generate(prompt, "gemini-1.5-pro", 0.1);
      
      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from model response");
      }
      
      const brandKit: BrandKit = JSON.parse(jsonMatch[0]);
      
      console.log(`[BrandAnalysisTool] Successfully generated brand kit`);
      
      // Store in network state if available
      if (network) {
        const state = network.state.kv as Map<string, any>;
        state.set("brandKit", brandKit);
        
        // Also store the scraped data used for analysis
        const scrapedData = { url, title, content };
        state.set("scrapedData", scrapedData);
        
        // Mark this step as completed
        const completedSteps = state.get("completedSteps") || [];
        completedSteps.push("brandAnalysis");
        state.set("completedSteps", completedSteps);
      }
      
      return {
        success: true,
        brandKit,
      };
    } catch (error) {
      console.error("[BrandAnalysisTool] Error during analysis:", error);
      throw new Error(`Failed to analyze brand: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});