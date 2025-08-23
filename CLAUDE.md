# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

When local server is running, use it. Don't kill it and then run it again. it is waste of time. 

## Development Commands

### Essential Commands
```bash
# Development server with hot reload
npm run dev                 # Uses tsx watch for development

# Building and running
npm run build              # TypeScript compilation to dist/
npm start                 # Run production build

# Code quality (run before committing)
npm run check             # Biome lint + format + fix all in one
npm run format            # Biome formatting only
npm run lint              # Biome linting only

# Testing
npm run test              # Run all tests with Vitest
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests for APIs/database
npm run test:e2e          # End-to-end tests (run before releases)
npm run test:watch        # Watch mode for active development
npm run test:coverage     # Coverage reports

# Database operations (ENHANCED SAFETY SYSTEM)
npm run db:pull          # Pull current database schema to local model
npm run db:safe-push     # RECOMMENDED: Full safety workflow with validation
npm run db:schema-diff   # Preview changes before applying them
npm run db:check         # Pull schema + show differences in one command
npm run db:validate      # Run schema validation checks only
npm run db:backup        # Manual backup (database + schema)
npm run db:push          # Legacy: backup + push (shows safety warning)
npm run db:migrate       # Safe: backup + prisma migrate dev
npm run db:migrate:deploy # Safe: backup + prisma migrate deploy  
npm run db:restore       # Interactive restore from local backups
npm run db:reset         # PROTECTED: Multiple confirmations required

# Direct Prisma commands (USE WITH CAUTION - no backup protection)
npx prisma generate       # Generate Prisma client (after schema changes)
npx prisma studio         # Open database GUI
```

## 🚨 CRITICAL: Database Safety Guidelines

### NEVER Use These Commands on Staging/Production:
```bash
❌ npx prisma db push --force-reset     # DESTROYS ALL DATA - drops entire database
❌ npx prisma migrate reset             # DESTROYS ALL DATA - resets all migrations
❌ npx prisma db execute --file=drop.sql # CAN DESTROY DATA - executes raw SQL
```

**USE scripts folder only for package.json prisma commdas**

**Any temprary scripts to be created in data/temp-scripts/ folder**

### RECOMMENDED Safe Database Change Workflow:
1. ✅ **Pull current schema**: `npm run db:pull` (sync with database first)
2. ✅ **Make your schema changes** in `src/prisma/schema.prisma`
3. ✅ **Preview changes**: `npm run db:schema-diff` (see what will change)
4. ✅ **Apply safely**: `npm run db:safe-push` (automatic backup + validation)
5. ✅ **Verify results**: Check that changes applied correctly

### Enhanced Safety Features:
- **Automatic backups**: Database + schema backed up before any changes
- **Destructive change detection**: Warns about operations that may cause data loss
- **Schema validation**: Ensures local schema matches database before changes
- **Multi-step confirmation**: Requires explicit approval for dangerous operations
- **Environment protection**: Production databases completely protected from resets

### The Critical Mistake That Caused Complete Data Loss:
- **What happened**: Ran `npx prisma db push --force-reset` on staging database
- **Result**: ALL 283 ScrapingRuns + 29 AnalysisResults permanently deleted
- **Why**: `--force-reset` drops the ENTIRE database and recreates it empty
- **Lesson**: Database commands affect the ENTIRE database, not individual tables

### Backup & Restore Commands:
```bash
# Automatic backup (recommended)
npm run db:backup                        # Uses DATABASE_URL from .env

# Interactive restore (recommended)
npm run db:restore                       # Lists backups, select one to restore
# → Shows available backups with timestamps and sizes
# → User selects by number (1, 2, 3...)  
# → Asks for confirmation before restoring
# → Uses DATABASE_URL credentials automatically

# Manual backup/restore (if needed)
mysqldump -h HOST -u USER -pPASS DB > backup.sql
mysql -h HOST -u USER -pPASS DB < backup.sql
```

### Team Collaboration & Security:
- ✅ **Each team member uses their own .env** - no shared credentials in code
- ✅ **Backups stay local** - `backups/` folder not committed to git  
- ✅ **Same commands for everyone** - npm scripts work with any DATABASE_URL
- ✅ **Secure by default** - scripts read credentials from environment variables
- ✅ **Interactive safety** - restore requires explicit user confirmation

### Important: Always run `npm run check` before committing to fix linting and formatting issues.

## High-Level Architecture

### Core Pipeline: URL → Scraping → AI Analysis → Storage

TOMAS AgentKit is an AI-powered business analysis platform built on **AgentKit by Inngest** that follows this flow:

1. **API Entry**: `/api/business/generate-brandkit` receives URL and parameters
2. **Network Orchestration**: `businessScraperNetwork.ts` coordinates the entire pipeline using AgentKit
3. **Scraping Phase**: Tools perform deterministic operations (Apify → Crawlee fallback)
4. **AI Analysis Phase**: Sequential specialized Agents with LLM reasoning
5. **Storage**: MySQL database with comprehensive metadata tracking

### Project Structure Following AgentKit Patterns

```
src/
├── networks/           # AgentKit Networks - orchestrate multi-agent workflows
├── agents/            # AgentKit Agents - specialized LLM-powered reasoning
├── tools/             # AgentKit Tools - deterministic operations & structured output  
├── config/            # Configuration for models, timeouts, scraping
├── core/              # Core services (Apify, storage) - NOT AgentKit components
├── prisma/            # Database schema and services - NOT AgentKit components
└── server/            # Express API - NOT AgentKit components
```

### AgentKit Architecture Patterns

**This project HEAVILY uses AgentKit SDK and follows its core architecture:**

#### 1. Networks (`createNetwork`)
- **Purpose**: Systems of Agents that orchestrate multi-step AI workflows
- **Components**: Combine Agents + State + Routers to execute complex tasks
- **Our Implementation**: `businessScraperNetwork.ts` orchestrates the entire business analysis pipeline
- **Key Features**: Shared state between agents, agent coordination, workflow control

#### 2. Agents (`createAgent`)
- **Purpose**: Stateless entities with specific goals that accomplish tasks using Tools
- **Core Components**: `name` + `description` + `system` prompt + `model` + `tools[]`
- **Our Agents**: 
  - `brandKitAgent`: Analyzes website content → generates brand insights
  - `competitorAgent`: Uses brand analysis → identifies competitors
- **Key Features**: LLM reasoning, tool calling, specialized expertise

#### 3. Tools (`createTool`)
- **Purpose**: Functions that extend Agent capabilities for structured output or system interaction
- **Core Components**: `name` + `description` + `parameters` + `handler`
- **Tool Categories**: 
  - **System Integration**: `apifyScrapingTool`, `crawleeScrapingTool` (call external services)
  - **Structured Output**: `brandAnalysisTool`, `competitorAnalysisTool` (LLM → structured data)
- **Key Features**: Function calling integration, parameter validation, error handling

#### AgentKit Flow Pattern
```
Network → Agents → Tools
├── businessScraperNetwork (orchestrates)
├── brandKitAgent (uses brandAnalysisTool) 
├── competitorAgent (uses competitorAnalysisTool)
└── Tools (scraping, analysis) → External Systems/APIs
```

#### Fallback Strategy Pattern
- **Primary**: Apify API (scalable cloud scraping)
- **Fallback**: Crawlee with Playwright (local scraping)
- Automatic fallback with comprehensive error tracking and dynamic configuration

#### Two-Table Database Workflow
- `scraping_runs`: Raw scraped data with metadata (IDs: `srun_*`)
- `brandkit_results`: AI-generated analysis results (IDs: `bkit_*`)
- Relationship: One scraping run → One analysis result

### Model Configuration

**CENTRALIZED MODEL MANAGEMENT - SINGLE SOURCE OF TRUTH**

ALL model configurations are now centralized in `src/utils/ModelResolverUtils.ts` for simplified management:

#### Central Configuration Rules:
- **Single File**: ALL models defined in `src/utils/ModelResolverUtils.ts` ONLY
- **No Hardcoding**: NEVER hardcode model names anywhere else in the codebase
- **Current Use Only**: Only add configs for services CURRENTLY IN USE, not future cases
- **Primary + Fallback**: Each config must have primary and fallback model options
- **Health Checks**: Automatic model health testing at endpoint startup

#### Current Model Configuration:
```typescript
// src/utils/ModelResolverUtils.ts
export const MODEL_CONFIGS = {
  BRAND_ANALYSIS: {
    primary: { provider: "google", model: "gemini-1.5-pro", temperature: 0.1, maxTokens: 3000 },
    fallback: { provider: "openai", model: "gpt-4.1", temperature: 0.1, maxTokens: 3000 }
  },
  COMPETITOR_ANALYSIS: {
    primary: { provider: "openai", model: "gpt-4.1", temperature: 0.1, maxTokens: 2000 },
    fallback: { provider: "google", model: "gemini-1.5-pro", temperature: 0.1, maxTokens: 2000 }
  }
}
```

#### Usage Pattern:
```typescript
// Import and use in any file
import { getModelConfig } from "../utils/ModelResolverUtils.js";

const modelConfig = getModelConfig("BRAND_ANALYSIS");
// Automatically includes all hyperparameters: provider, model, temperature, maxTokens, timeout
```

#### Deprecated Configurations:
- ❌ `src/config/modelsConfig.ts` - kept for backward compatibility only
- ❌ `src/config/tenants.json` - removed (was never used)  
- ❌ `src/models/AgentModelWrapper.ts` - removed (never instantiated)
- ❌ `src/models/ModelConfigService.ts` - removed (never called)

#### Health Check System:
- **Endpoint Startup**: `/api/business/generate-brandkit` tests all models before processing
- **Failure Handling**: Creates PAUSED scraping runs with error details if models fail
- **Logging**: All model tests logged (pass/fail) for monitoring
- **Database**: Proper database entries created even when models are unavailable

### Environment Configuration

Critical environment variables for development:

```bash
# Database (Required)
DATABASE_URL="mysql://user:pass@host:port/staging_v1"

# AI Models (At least one required)  
OPENAI_API_KEY="sk-..."              # For GPT models (primary)
GOOGLE_API_KEY="AIza..."             # For Gemini models (fallback)

# Web Scraping (Optional but recommended)
APIFY_API_TOKEN="apify_api_..."      # For cloud scraping
USE_APIFY_SCRAPER=true              # Enable/disable Apify

# Model Override (Optional)
GLOBAL_MODEL_OVERRIDE="gpt-4.1"     # Force specific model across all agents
```

### Testing Strategy

- **Unit Tests** (`tests/unit/`): Individual components and utilities
- **Integration Tests** (`tests/integration/`): API endpoints and database operations
- **E2E Tests** (`tests/e2e/`): Full pipeline workflows
- **Setup**: `tests/setup.ts` configures test environment
- **Timeout**: 30 seconds for network-dependent tests

## AgentKit Development Guidelines

### CRITICAL: Follow AgentKit Patterns Strictly

When creating new components, you MUST follow AgentKit's architectural patterns:

#### Creating Networks (`createNetwork`)
```typescript
import { createNetwork } from "@inngest/agent-kit";

export const myNetwork = createNetwork({
  name: "Network Name",
  description: "Network description for routing decisions",
  agents: [agent1, agent2], // Array of agents
  defaultModel: openai({ model: "gpt-4" }), // Shared model
  // Optional: router for custom agent routing logic
});
```

#### Creating Agents (`createAgent`)  
```typescript
import { createAgent, openai } from "@inngest/agent-kit";

export const myAgent = createAgent({
  name: "Agent Name",
  description: "Agent description for network routing", // REQUIRED for networks
  system: "You are a specialized agent that...", // System prompt
  model: openai({ model: "gpt-4" }), // Model configuration
  tools: [tool1, tool2], // Tools available to this agent
});
```

#### Creating Tools (`createTool`)
```typescript  
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const myTool = createTool({
  name: "tool_name", // Function name for LLM
  description: "Tool description for LLM decision making",
  parameters: z.object({
    param1: z.string().describe("Parameter description"),
  }),
  handler: async ({ param1 }) => {
    // Tool implementation
    return { result: "structured output" };
  },
});
```

### Code Conventions

- **File Naming**: `*Agent.ts`, `*Tool.ts`, `*Network.ts`, `*Service.ts`, `*Config.ts`
- **AgentKit Imports**: Always import from `@inngest/agent-kit`
- **ID Prefixes**: `srun_*` (scraping runs), `bkit_*` (brand kit results)
- **Formatting**: Biome configuration with 2-space indentation, double quotes
- **Import Organization**: Biome auto-organizes imports
- **Error Handling**: Comprehensive logging with structured metadata
- **Tool Design**: Tools should be focused, well-described, and handle specific tasks
- **Agent Specialization**: Each agent should have a clear, specific purpose and expertise area

### Database Schema Key Points

- **ScrapingRun**: Stores raw scraped data, scraper metadata, timing, and parameters
- **AnalysisResult**: Stores AI-generated brand analysis linked to scraping run
- **Prisma Extensions**: Auto-generate prefixed IDs (`generatePrefixedId.ts`)
- **Indexes**: Optimized for workspace queries, status filtering, and time-based lookups

### API Endpoints

```
POST /api/business/generate-brandkit     # Full analysis (scrape + AI analysis)
GET  /api/business/brandkit/:id          # Complete results with raw data
GET  /api/business/brandkit/:id/result   # Lightweight results (brandkit + competitors only)
GET  /api/business/brandkits             # List all analyses
GET  /api/business/health                # Health check
```

### Performance Considerations

- **Scraping Timeouts**: Configured in `src/config/timeoutsConfig.ts`
- **Model Token Limits**: Configured per agent in business scraping config
- **Database Connection**: Connection pooling via Prisma
- **Content Processing**: Chunked processing for large websites
- **Monitoring**: Built-in metrics and monitoring utilities

## AgentKit Best Practices for This Project

### Network Design
- **Single Network**: `businessScraperNetwork` orchestrates the entire pipeline
- **Sequential Execution**: Brand Kit Agent → Competitor Agent (no parallel execution needed)
- **Shared State**: Network manages data flow between agents
- **Default Model**: Configured at network level for consistency

### Agent Design Principles
- **Specialized Agents**: Each agent has ONE clear responsibility
  - `brandKitAgent`: Website content → Brand analysis
  - `competitorAgent`: Brand analysis → Competitor identification
- **Descriptive Names**: Agent descriptions enable proper network routing
- **Tool Integration**: Agents MUST use their designated tools for structured output
- **System Prompts**: Detailed system prompts define agent expertise and behavior

### Tool Design Principles
- **Two Categories**: System integration tools vs. structured output tools
- **Error Handling**: Tools throw errors to enable fallback logic (e.g., Apify → Crawlee)
- **Parameter Validation**: Use Zod schemas for type safety
- **Handler Focus**: Each tool does ONE thing well

### Integration with External Systems
- **Tools Handle Integration**: Never let agents directly call external APIs
- **Fallback Logic**: Implemented in Network layer, not in individual tools
- **Configuration**: External service configs (Apify, models) separate from AgentKit components

### State Management
- **Network State**: Shared between agents for data passing
- **Database Persistence**: Separate from AgentKit state, handled in network orchestration
- **Stateless Agents**: Agents don't maintain state between calls

### IMPORTANT: When extending this project
1. **Always create Tools first** before building Agents that use them
2. **Test Tools independently** before integrating with Agents  
3. **Use createNetwork, createAgent, createTool** - never build custom wrappers
4. **Follow the existing pattern**: Network orchestrates → Agents reason → Tools execute
5. **Read AgentKit docs** in `claude/agentkit-documentation-full.txt` before making changes

## 🚨 SECURITY: Deployment Anti-Patterns to NEVER Use

### ❌ BAD PRACTICES - Never Do These:

#### 1. Hardcoding Secrets in Build Files
```yaml
# ❌ NEVER DO THIS in cloudbuild.yaml:
--set-env-vars=OPENAI_API_KEY=sk-proj-actual-key-here,DATABASE_URL=mysql://user:pass@host/db
```
**Why this is dangerous:**
- Secrets visible in build logs and Cloud Build history
- Accessible to anyone with repository or Cloud Build access
- Permanently stored in version control if committed
- Violates principle of least privilege

#### 2. Committing Production Secrets
```bash
# ❌ NEVER commit these files:
.env.production
secrets.json
config/production.yaml
```

#### 3. Using Development Tokens in Production
```yaml
# ❌ NEVER use in production deployments:
DEV_TOKEN_ENABLED=TRUE
```

### ✅ CORRECT PRACTICES - Always Do These:

#### 1. Use Google Secret Manager
```bash
# ✅ Store secrets securely:
echo -n "actual-secret-value" | gcloud secrets versions add secret-name --data-file=-

# ✅ Reference in Cloud Run:
--update-secrets="OPENAI_API_KEY=openai-api-key:latest"
```

#### 2. Environment-Specific Configuration
```yaml
# ✅ Use separate secrets per environment:
development-openai-key    # For dev/staging
production-openai-key     # For production
```

#### 3. Infrastructure as Code
```yaml
# ✅ Use separate cloudbuild files:
cloudbuild-staging.yaml   # References staging secrets
cloudbuild-prod.yaml      # References production secrets  
```

#### 4. Principle of Least Privilege
- Each environment has its own secrets
- Cloud Run service accounts with minimal required permissions
- Secrets rotated regularly with versioning

### Security Incident Prevention
The above practices prevent:
- Credential leaks in logs and repositories
- Unauthorized access to production systems
- Accidental exposure during deployments
- Cross-environment contamination

**Remember: Security is not optional - it's a requirement for any production system.**

## 🚨 CRITICAL: Business Analysis Workflow Architecture

### MANDATORY Flow for `/api/business/generate-brandkit` Endpoint

The business analysis workflow MUST follow this exact AgentKit architecture pattern. **DO NOT DEVIATE** from this flow:

```
Scraping → brandKitAgent.run() → competitorAgent.run() → Results
            ↓                      ↓
     brandAnalysisTool        competitorAnalysisTool
     (ModelService)           (ModelService)
```

### Detailed Flow Requirements:

1. **Phase 1: Brand Analysis**
   - ✅ MUST use `brandKitAgent.run(scrapedData)` 
   - ✅ MUST call `brandAnalysisTool` which uses `ModelService`
   - ❌ NEVER use direct API calls (GoogleGenerativeAI SDK)
   - ❌ NEVER call `brandAnalysisTool.handler()` directly

2. **Phase 2: Competitor Analysis**  
   - ✅ MUST use `competitorAgent.run(brandKitResult)`
   - ✅ MUST call `competitorAnalysisTool` which uses `ModelService`
   - ❌ NEVER use direct API calls or simplified fallback logic
   - ❌ NEVER call `competitorAnalysisTool.handler()` directly

3. **ModelService Integration**
   - ✅ ALL LLM calls MUST go through `ModelService`
   - ✅ Proper error handling and token usage tracking
   - ✅ Observable and durable through AgentKit framework

### Why This Architecture is Critical:

- **Observability**: All LLM calls tracked through AgentKit/Inngest
- **Durability**: Automatic retry and error handling
- **Consistency**: Unified model configuration and routing
- **Maintainability**: Standard patterns across all AI operations

### Code Verification Checklist:

- [ ] No `GoogleGenerativeAI` imports in tools
- [ ] No `.handler()` direct calls in network
- [ ] All agents have proper model configuration
- [ ] Tools use `ModelService.generate()` for LLM calls
- [ ] Network orchestrates agents, not tools directly