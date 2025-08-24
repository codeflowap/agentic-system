# Business Scraper - AgentKit Agentic System

An AI-powered business analysis platform built with **AgentKit by Inngest** that scrapes websites and generates comprehensive brand kits with competitor analysis.

## Architecture

The system follows AgentKit SDK patterns:

```
API Request → Network → Agents → Tools → Results
             ↓
    businessScraperNetwork
         ├── brandKitAgent → brandAnalysisTool (Gemini 1.5 Pro)
         └── competitorAgent → competitorAnalysisTool (Gemini 1.5 Pro)
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GOOGLE_API_KEY
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Start Inngest Dev Server (in another terminal):**
   ```bash
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```
   This provides visual debugging and observability for the agent workflow.

5. **Test the API:**
   ```bash
   node test-api.js
   ```

## API Endpoints

- `POST /api/business/generate-brandkit` - Generate brand kit for a URL
  ```json
  {
    "url": "https://example.com"
  }
  ```

- `GET /api/business/brandkit/:id` - Get specific brand kit
- `GET /api/business/brandkits` - List all brand kits
- `GET /api/business/health` - Health check

## Project Structure

```
src/
├── networks/           # AgentKit Networks - orchestrate workflows
│   └── businessScraperNetwork.ts
├── agents/            # AgentKit Agents - specialized AI reasoning
│   ├── brandKitAgent.ts
│   └── competitorAgent.ts
├── tools/             # AgentKit Tools - deterministic operations
│   ├── apifyScrapingTool.ts
│   ├── brandAnalysisTool.ts
│   └── competitorAnalysisTool.ts
├── core/              # Core services
│   └── ModelService.ts
├── server/            # Express API & Inngest
│   ├── index.ts
│   ├── inngestClient.ts
│   └── functions.ts
└── types/             # TypeScript interfaces
    └── index.ts
```

## Workflow

1. **Scraping Phase**: Uses Apify API (mocked with local JSON files for testing)
2. **Brand Analysis**: brandKitAgent analyzes content using Gemini 1.5 Pro
3. **Competitor Analysis**: competitorAgent identifies 3 competitors using Gemini 1.5 Pro
4. **Storage**: Results saved locally in `data/results/`

## Mock Data

Currently using mock scraped data for testing:
- `spoonity-39000.json` - Spoonity website data (39k chars)
- `tapistro.com_180000.json` - Tapistro website data (180k chars)

## Observability

The system integrates with Inngest for full observability:
1. Start the Inngest dev server
2. Open http://localhost:8288
3. Watch agents execute in real-time
4. Debug tool calls and agent decisions

## Development

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build TypeScript
npm run check      # Run Biome linter/formatter
npm test           # Run tests
```

## Environment Variables

- `GOOGLE_API_KEY` - Required for Gemini 1.5 Pro
- `OPENAI_API_KEY` - Optional, for GPT-4 in agents
- `APIFY_API_TOKEN` - Optional, for real Apify scraping
- `PORT` - Server port (default: 3000)