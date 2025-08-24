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
    
    const result = await step.run("run-network", async () => {
      return await businessScraperNetwork.run({
        prompt: `Analyze the website at ${url} to create a brand kit and identify competitors.`,
        state: { url },
      });
    });
    
    return {
      success: true,
      result,
    };
  }
);