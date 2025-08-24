import { Inngest } from "inngest";
import { inngestAIMiddleware } from "@inngest/agent-kit";

export const inngest = new Inngest({ 
  id: "business-scraper",
  middleware: [inngestAIMiddleware({ name: "inngest-ai" })],
});