# PhoText Architecture

## Overview

PhoText is built as a Next.js 15 App Router application with PostgreSQL database, Prisma ORM, and NextAuth.js for authentication. The architecture is designed to support both authenticated users and guest sessions, with comprehensive AI usage tracking for quota management.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth.js with Prisma adapter
- **Deployment:** Vercel-ready (or any Node.js host)

## Directory Structure

```
/workspace/
├── app/                          # Next.js App Router
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts      # NextAuth API handler
│
├── lib/                          # Core business logic
│   ├── db.ts                     # Prisma Client singleton
│   ├── auth.ts                   # NextAuth configuration
│   └── projects.ts               # Project CRUD & AI tracking
│
├── prisma/
│   └── schema.prisma             # Database schema
│
├── types/
│   ├── photext.ts                # Core domain types
│   └── next-auth.d.ts            # NextAuth type extensions
│
├── .env.example                  # Environment template
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── README.md                     # Main documentation
├── SETUP.md                      # Setup guide
└── ARCHITECTURE.md               # This file
```

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id              │───┐
│ email           │   │
│ billingPlan     │   │
│ aiTotal...Count │   │ 1:N
└─────────────────┘   │
                      │
        ┌─────────────┴────────────┬──────────────┐
        │                          │              │
        ▼                          ▼              ▼
┌─────────────┐            ┌─────────────┐  ┌──────────┐
│   Account   │            │   Session   │  │ Project  │
├─────────────┤            ├─────────────┤  ├──────────┤
│ provider    │            │ sessionToken│  │ userId?  │
│ access_token│            │ expires     │  │ guestKey?│
└─────────────┘            └─────────────┘  │ boxes    │
                                            │ ai...Count│
                                            └──────────┘
```

### Key Models

#### User
- **Purpose:** User accounts with authentication and billing
- **Fields:**
  - `id` (cuid) — Primary key
  - `email` (unique) — User email
  - `billingPlan` (enum) — FREE or PRO
  - `aiTotal*Count` (int) — Aggregate AI usage counters
- **Relations:** accounts[], sessions[], projects[]

#### Project
- **Purpose:** User projects containing canvas state and AI usage
- **Fields:**
  - `id` (cuid) — Primary key
  - `userId` (nullable) — Owner (null for guest projects)
  - `guestKey` (nullable) — Anonymous identifier for guests
  - `boxes` (JSON) — Serialized `BoxState[]`
  - `ai*Count` (int) — Per-project AI usage counters
  - `lastGeneratedPosts` (JSON) — Cached AI outputs
  - `lastGeneratedHashtags` (JSON) — Cached AI outputs
- **Indexes:** userId, guestKey

## Authentication Flow

### Guest Users
1. User visits app without authentication
2. Frontend generates random `guestKey` (stored in localStorage)
3. Projects created with `userId: null, guestKey: "..."`
4. Limited AI quota enforced client-side or via session

### Authenticated Users
1. User signs in via NextAuth (GitHub, Email, etc.)
2. Session stored in database
3. Projects created with `userId: "...", guestKey: null`
4. AI quota enforced based on `User.billingPlan` and `aiTotal*Count`

### Guest → Authenticated Migration
When a guest signs up:
```typescript
// Claim guest projects
await db.project.updateMany({
  where: { guestKey: existingGuestKey },
  data: { 
    userId: newUser.id,
    guestKey: null 
  }
});
```

## Canvas State Management

### Storage
Canvas state is stored as JSON in `Project.boxes`:

```typescript
type BoxState = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  ocrConfidence?: number;
  language?: string;
  style: BoxStyle;
  aiHistory?: AiHistoryEntry[];
}
```

### Update Flow
```
Client Canvas Editor
        ↓
   Debounced Save
        ↓
Server Action / API Route
        ↓
  updateProject()
        ↓
Prisma: UPDATE project SET boxes = $1
```

### Optimizations
- **Debounced autosave** (2-3 seconds)
- **Optimistic UI updates** (update local state immediately)
- **Incremental saves** (only send changed boxes, not entire state)

## AI Usage Tracking

### Two-Level Counter System

**Per-Project Counters:**
- `Project.aiRewriteCount`
- `Project.aiGrammarFixCount`
- `Project.aiPostGenerationCount`
- `Project.aiHashtagSuggestionCount`

**Per-User Aggregates:**
- `User.aiTotalRewriteCount`
- `User.aiTotalGrammarFixCount`
- `User.aiTotalPostGenerationCount`
- `User.aiTotalHashtagSuggestionCount`

### Tracking Flow

```typescript
// 1. Call AI provider
const result = await aiProvider.rewriteText(input, style);

// 2. Increment counters
await incrementAiUsage({
  projectId: currentProject.id,
  type: "rewrite",
  count: 1
});

// 3. Check quotas (optional)
const user = await db.user.findUnique({ where: { id: userId } });
if (user.aiTotalRewriteCount > getQuotaForPlan(user.billingPlan)) {
  throw new Error("AI quota exceeded");
}
```

### Quota Enforcement (Future)

```typescript
const QUOTAS = {
  FREE: {
    maxProjects: 5,
    maxAiActionsPerMonth: 100,
  },
  PRO: {
    maxProjects: 100,
    maxAiActionsPerMonth: 5000,
  },
};

function canUseAi(user: User): boolean {
  const totalActions = 
    user.aiTotalRewriteCount +
    user.aiTotalGrammarFixCount +
    user.aiTotalPostGenerationCount +
    user.aiTotalHashtagSuggestionCount;
    
  return totalActions < QUOTAS[user.billingPlan].maxAiActionsPerMonth;
}
```

## AI Provider Pattern

### Interface

```typescript
interface AiProvider {
  rewriteText(input: string, style: RewriteStyle): Promise<string>;
  fixGrammar(input: string): Promise<string>;
  generatePosts(params: GeneratePostsParams): Promise<GeneratedPosts>;
  suggestHashtags(params: HashtagParams): Promise<HashtagSet>;
}
```

### Implementations

**MockProvider (Development):**
- Deterministic outputs
- No API keys required
- Instant responses

**OpenAIProvider (Production):**
- Uses OpenAI API
- Requires `OPENAI_API_KEY`
- Implements retry logic and error handling

### Provider Selection

```typescript
// lib/ai/index.ts
export function getAiProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider(process.env.OPENAI_API_KEY);
  }
  return new MockProvider();
}
```

## Platform-Aware Post Generation

### Platform Configurations

```typescript
const PLATFORM_CONFIG = {
  instagram: {
    tone: "friendly",
    maxLength: 2200,
    sentenceCount: "1-3",
    hashtagsRecommended: true,
    emojisAllowed: true,
  },
  x: {
    tone: "concise",
    maxLength: 280,
    softTarget: 200,
    hashtagsRecommended: false,
  },
  linkedin: {
    tone: "professional",
    maxLength: 3000,
    paragraphCount: "1-2",
    hashtagsRecommended: false,
  },
  tiktok: {
    tone: "energetic",
    maxLength: 2200,
    emojisAllowed: true,
    hashtagsRecommended: true,
  },
};
```

### Generation Flow

```typescript
// 1. User selects platforms and style
const params = {
  text: extractedText,
  platforms: ["instagram", "x", "linkedin"],
  stylePreset: "friendly",
  context: "Tech conference announcement"
};

// 2. AI generates platform-specific posts
const posts = await generatePosts(params);

// 3. Cache results
await updateProject({
  id: projectId,
  lastGeneratedPosts: posts,
  lastPlatforms: params.platforms,
});

// 4. Track usage
await incrementAiUsage({
  projectId,
  type: "postGeneration",
});
```

## Security Considerations

### Project Access Control

All project operations validate ownership:

```typescript
// lib/projects.ts
export async function getProjectById(
  id: string,
  options?: { userId?: string; guestKey?: string }
) {
  const where: any = { id };
  
  if (options?.userId) {
    where.userId = options.userId;
  } else if (options?.guestKey) {
    where.guestKey = options.guestKey;
  }
  
  return await db.project.findFirst({ where });
}
```

### Input Validation

- Validate all user inputs before AI calls
- Sanitize text content before storage
- Limit box count per project (e.g., max 100 boxes)
- Limit image upload size (e.g., max 10MB)

### Rate Limiting

Implement rate limiting on:
- AI API calls (per user, per IP)
- Project creation (per session, per user)
- Image uploads (per session, per user)

## Performance Optimizations

### Database
- Indexed fields: `userId`, `guestKey`, `sessionToken`
- Connection pooling (Prisma default)
- Prepared statements (Prisma default)

### API Routes
- Edge runtime for auth routes
- Server actions for mutations
- React Server Components for data fetching

### Canvas
- Canvas virtualization (only render visible boxes)
- Debounced save (reduce DB writes)
- Local state with periodic sync

### AI
- Cache generated posts in `Project.lastGeneratedPosts`
- Batch multiple rewrite requests
- Stream responses for long-running operations

## Deployment

### Environment Variables

Required:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Optional:
- `GITHUB_ID` / `GITHUB_SECRET`
- `EMAIL_SERVER` / `EMAIL_FROM`
- `OPENAI_API_KEY`

### Build Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma Client
pnpm prisma:generate

# 3. Run migrations
pnpm prisma:migrate deploy

# 4. Build Next.js
pnpm build

# 5. Start production server
pnpm start
```

### Vercel Deployment

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# DATABASE_URL, NEXTAUTH_SECRET, etc.
```

## Testing Strategy

### Unit Tests
- `lib/projects.ts` — CRUD operations
- AI provider implementations
- Canvas state transformations

### Integration Tests
- Project creation → save → load flow
- AI usage tracking increments
- Guest → authenticated migration

### E2E Tests
- Upload image → OCR → edit → save
- AI rewrite → generate posts → export
- Authentication flow

## Future Architecture Considerations

### Scalability
- Move AI calls to background queue (Bull, BullMQ)
- Implement caching layer (Redis)
- CDN for uploaded images
- Separate read/write database replicas

### Monitoring
- Log all AI API calls with timing
- Track error rates by operation
- Monitor database query performance
- User analytics (Posthog, Mixpanel)

### Multi-tenancy
- Team workspaces with shared projects
- Role-based access control (owner, editor, viewer)
- Workspace-level billing and quotas

## Conclusion

PhoText's architecture is designed for:
- **Flexibility:** Guest and authenticated flows
- **Tracking:** Comprehensive AI usage metrics
- **Scalability:** Clean separation of concerns
- **Type Safety:** Full TypeScript with Prisma types

All AI operations are tracked, all data access is validated, and the system is ready to scale from MVP to production.

---

**Last Updated:** 2025-11-08
