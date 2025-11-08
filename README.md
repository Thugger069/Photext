# PhoText — OCR Canvas + AI Text Lab + Post Generator

PhoText lets users upload any image with text (flyers, posters, screenshots, slides, memes), automatically extracts all text with OCR, overlays editable text boxes on a canvas, and gives AI-powered tools to clean, rewrite, and restyle the text. It also auto-generates platform-aware plain-text posts/captions from the detected text plus suggested hashtags, then lets users export the final image and/or text.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js with Prisma adapter
- **UI:** (To be added: Tailwind CSS + shadcn/ui)
- **OCR:** (To be integrated)
- **AI:** Configurable provider (OpenAI, or Mock for dev)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- PostgreSQL database (local or hosted)

### Installation

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random string for session encryption
- `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)

Optional (for OAuth/Email auth):
- `GITHUB_ID` / `GITHUB_SECRET`: GitHub OAuth
- `EMAIL_SERVER` / `EMAIL_FROM`: Email provider
- `OPENAI_API_KEY`: OpenAI API key (if not set, mock AI provider will be used)

3. **Initialize the database:**

```bash
pnpm prisma:migrate dev --name init
```

This will:
- Create all tables in your PostgreSQL database
- Generate the Prisma Client

4. **Run the development server:**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `pnpm dev` — Start development server
- `pnpm build` — Build for production
- `pnpm start` — Start production server
- `pnpm lint` — Run ESLint
- `pnpm prisma:generate` — Generate Prisma Client
- `pnpm prisma:migrate` — Run database migrations
- `pnpm prisma:studio` — Open Prisma Studio (DB GUI)

## Project Structure

```
/workspace/
├── app/
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts  # NextAuth API handler
│   └── (app routes to be added)
├── lib/
│   ├── db.ts                            # Prisma client singleton
│   ├── auth.ts                          # NextAuth configuration
│   └── projects.ts                      # Project persistence helpers
├── prisma/
│   └── schema.prisma                    # Database schema
├── types/
│   └── photext.ts                       # TypeScript type definitions
├── .env.example                         # Example environment variables
└── package.json                         # Dependencies and scripts
```

## Database Schema Overview

### Core Models

- **User** — User accounts with billing plan and aggregate AI usage counters
- **Account** / **Session** / **VerificationToken** — NextAuth models
- **Project** — User projects with canvas state, text boxes, and AI usage tracking

### Key Features

- **Guest Mode:** Projects can be created without authentication using `guestKey`
- **Canvas State:** Text boxes stored as JSON (`BoxState[]`) in `Project.boxes`
- **AI Usage Tracking:** Per-project and per-user counters for:
  - Text rewrites
  - Grammar fixes
  - Post generation
  - Hashtag suggestions

## Plans & Limits

PhoText ships with a simple two-tier model, wired to `User.billingPlan`:

### FREE Plan (`BillingPlan.FREE`)

**Intended for:** casual users, light editing.

**Soft defaults (can be enforced later using the AI counters):**

- Up to **5 active projects** per user
- Up to **100 AI text actions per month**, e.g.:
  - `aiTotalRewriteCount`
  - `aiTotalGrammarFixCount`
  - `aiTotalPostGenerationCount`
  - `aiTotalHashtagSuggestionCount`
  - Total across all = max ~100 / month (configurable)
- Guest sessions:
  - No login
  - Local-only storage
  - Fewer AI calls per session (e.g., 10)

### PRO Plan (`BillingPlan.PRO`)

**Intended for:** creators, marketers, and teams.

**Soft defaults:**

- Up to **100 active projects** per user
- Up to **5,000 AI text actions per month**:
  - Same counters as FREE, just higher caps
- Priority for:
  - Higher OCR/AI limits
  - Future features: templates, team sharing, versioning, etc.

### How These Map to the Schema

**Per-user aggregate counters** (for global limits):

```prisma
User.aiTotalRewriteCount
User.aiTotalGrammarFixCount
User.aiTotalPostGenerationCount
User.aiTotalHashtagSuggestionCount
```

**Per-project counters** (for analytics and per-project limits):

```prisma
Project.aiRewriteCount
Project.aiGrammarFixCount
Project.aiPostGenerationCount
Project.aiHashtagSuggestionCount
```

**When calling any AI function:**

1. Increment the per-project counter
2. If `userId` is present, increment the corresponding per-user total
3. (Later) Use these numbers + `billingPlan` to enforce quotas

## Core Features (v1)

### 1. Ingest & OCR
- Drag & drop image upload (PNG/JPG/WebP)
- Automatic text extraction with OCR
- Multi-language support with auto-detection
- Low-confidence text marking

### 2. Canvas Editing
- Draggable/resizable text boxes
- Snap-to-guide alignment helpers
- Zoom and pan functionality
- Sidebar list with lock/unlock and show/hide controls

### 3. Style & Fonts
- Per-box font controls (family, size, weight, color, alignment, line-height)
- Global style presets: Minimal, Loud, Corporate, Playful
- Toggle between global and per-box styling

### 4. AI Tools on Text
- **Rewrite:** Shorter, Clearer, More casual, More formal
- **Grammar Check:** Magic Fix for grammar/spelling
- **v1.5 hooks:** Translate, Summarize, Expand
- Per-box AI history with version revert

### 5. Platform-Aware Posts Generator
- **v1 platforms:** Instagram, X (Twitter), LinkedIn
- **v1.5 platforms:** TikTok, Generic
- Platform-specific style defaults and character limits
- Post style presets: Neutral, Friendly, Promotional, Storytelling
- Optional context field for better generation
- 1–3 variants per platform with copy buttons

### 6. Hashtag Suggester (v1.5-ready)
- Toggle to suggest hashtags
- Compact (6–10 tags) and Maximal (15–25 tags) modes
- Platform-aware behavior
- Easy copy functionality

### 7. Sessions & Auth
- **Guest Mode:** No account, local storage, soft AI limits
- **Authenticated Users:** Named projects, cloud storage, higher limits
- "Continue last project" shortcut on dashboard

### 8. Export
- **Image export:** PNG/JPG in preset sizes (1080x1080, 1080x1350, 1920x1080)
- **Text export:** Plaintext and Markdown
- **AI-generated posts:** Combined or per-platform export
- Quick copy buttons throughout the UI

## API Reference

### Project Management (`lib/projects.ts`)

```typescript
// Create a new project
createProject({ userId?, guestKey?, title?, imagePath, boxes })

// Get project by ID
getProjectById(id, { userId?, guestKey? })

// List projects for user
listProjectsForUser({ userId?, guestKey?, limit?, offset? })

// Update project
updateProject({ id, title?, boxes?, dominantLanguage?, lastPlatforms?, userId?, guestKey? })

// Delete project
deleteProject({ id, userId?, guestKey? })

// Increment AI usage counters
incrementAiUsage({ projectId, type, count? })
```

### Type Definitions

See `types/photext.ts` for complete type definitions including:
- `BoxState` — Individual text box state
- `CanvasState` — Full canvas state
- `ProjectDto` — Project data transfer object
- `Platform` — Supported social platforms
- `GeneratedPosts` / `HashtagSet` — AI-generated content

## Development Workflow

### Adding a Migration

When you modify `prisma/schema.prisma`:

```bash
pnpm prisma:migrate dev --name your_migration_name
```

### Viewing Data

Open Prisma Studio to browse your database:

```bash
pnpm prisma:studio
```

### AI Provider Integration

The app uses a provider interface for AI operations. Implement:

- `MockProvider` — Deterministic, offline, for dev and no-key mode
- `OpenAIProvider` — Enabled when `OPENAI_API_KEY` is set

AI methods to implement:
- `rewriteText(input)`
- `fixGrammar(input)`
- `generatePostsFromText({ text, platforms, stylePreset, context })`
- `suggestHashtags({ text, platforms })`

**Important:** Always call `incrementAiUsage()` after successful AI operations to track usage.

## Future Features (v2+)

- **Templates:** Pre-made layouts for common use-cases
- **Versioning:** Multiple named versions per project with quick restore
- **Team Mode:** Shareable view-only links, comment/suggest mode
- **Analytics:** Usage dashboards driven by AI counters
- **Quotas:** Enforce limits based on billing plan and usage counters

## Contributing

(To be added)

## License

(To be added)

---

**Built with ❤️ for creators, marketers, and anyone who works with text in images.**
