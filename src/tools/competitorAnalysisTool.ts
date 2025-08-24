import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { ModelService } from "../core/ModelService.js";
import type { BrandKit, CompetitorAnalysis } from "../types/index.js";

export const competitorAnalysisTool = createTool({
  name: "competitor_analysis",
  description: "Identifies and analyzes competitors based on brand kit information using web search and Gemini 1.5 Pro",
  parameters: z.object({
    brandKit: z.object({
      aboutTheBrand: z.string(),
      idealCustomerProfile: z.string(),
      brandPointOfView: z.string(),
      toneOfVoice: z.string(),
      authorPersona: z.string(),
    }).describe("The brand kit to use for competitor identification"),
    url: z.string().describe("The original website URL"),
  }),
  handler: async ({ brandKit, url }) => {
    console.log(`[CompetitorAnalysisTool] Starting competitor analysis for ${url}`);
    
    const modelService = new ModelService();
    
    const prompt = `You are a competitive intelligence expert. Based on the following brand kit, identify 3 direct competitors.

Brand Kit Information:
- About the Brand: ${brandKit.aboutTheBrand}
- Ideal Customer Profile: ${brandKit.idealCustomerProfile}
- Brand Point of View: ${brandKit.brandPointOfView}
- Tone of Voice: ${brandKit.toneOfVoice}
- Author Persona: ${brandKit.authorPersona}

Based on this brand profile, identify 3 companies that:
1. Serve the same or very similar customer segments
2. Offer comparable products or services
3. Operate in the same market space
4. Would be considered direct alternatives by customers

For each competitor, provide:
- Company name
- Their website URL (make sure it's a real, valid URL)
- A detailed reason explaining why they are a close competitor, including specific similarities in offerings, target market, and positioning

Think about companies that would appear in the same RFP, pitch against each other for the same clients, or be evaluated side-by-side by potential customers.

Format your response as a JSON object:
{
  "competitors": [
    {
      "name": "Company Name",
      "url": "https://example.com",
      "reason": "Detailed explanation of why this is a close competitor..."
    }
  ]
}`;

    try {
      const response = await modelService.generate(prompt, "gemini-1.5-pro", 0.1);
      
      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from model response");
      }
      
      const competitorAnalysis: CompetitorAnalysis = JSON.parse(jsonMatch[0]);
      
      // Validate that we have exactly 3 competitors
      if (!competitorAnalysis.competitors || competitorAnalysis.competitors.length !== 3) {
        console.warn(`[CompetitorAnalysisTool] Expected 3 competitors, got ${competitorAnalysis.competitors?.length || 0}`);
      }
      
      console.log(`[CompetitorAnalysisTool] Successfully identified ${competitorAnalysis.competitors.length} competitors`);
      
      return {
        success: true,
        competitors: competitorAnalysis,
      };
    } catch (error) {
      console.error("[CompetitorAnalysisTool] Error during analysis:", error);
      throw new Error(`Failed to analyze competitors: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});