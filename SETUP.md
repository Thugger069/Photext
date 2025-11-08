# PhoText Setup Guide

This document provides a step-by-step guide to get PhoText up and running.

## ✅ What's Been Set Up

The following files have been created and wired together:

### Database & ORM
- `prisma/schema.prisma` — Complete database schema with User, Account, Session, VerificationToken, and Project models
- `lib/db.ts` — Prisma Client singleton for server-side data access

### Authentication
- `lib/auth.ts` — NextAuth configuration with Prisma adapter
- `app/api/auth/[...nextauth]/route.ts` — NextAuth API route handler
- `types/next-auth.d.ts` — TypeScript declarations for custom session fields

### Data Layer
- `lib/projects.ts` — Comprehensive project CRUD operations with helpers:
  - `createProject()` — Create new projects for users or guests
  - `getProjectById()` — Retrieve projects with ownership validation
  - `listProjectsForUser()` — List all projects for a user/guest
  - `updateProject()` — Update canvas state and metadata
  - `deleteProject()` — Delete projects with ownership validation
  - `incrementAiUsage()` — Track AI usage per project and user

### Type Definitions
- `types/photext.ts` — Complete TypeScript types for:
  - `BoxState` — Text box state (position, style, text, etc.)
  - `CanvasState` — Full canvas state
  - `ProjectDto` — Project data transfer object
  - `Platform` — Social media platforms
  - `GeneratedPosts` / `HashtagSet` — AI-generated content

### Configuration
- `package.json` — Dependencies and scripts
- `tsconfig.json` — TypeScript configuration with path aliases
- `next.config.ts` — Next.js configuration
- `.gitignore` — Git ignore rules
- `.env.example` — Environment variable template

### Documentation
- `README.md` — Complete project documentation with:
  - Quick start guide
  - Database schema overview
  - Plans & limits documentation
  - API reference
  - Development workflow
- `SETUP.md` — This file!

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
pnpm install
```

This will install all required packages and run `prisma generate` automatically.

### Step 2: Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the following **required** variables:

```bash
# Required: PostgreSQL database connection
DATABASE_URL="postgresql://user:password@localhost:5432/photext"

# Required: NextAuth session encryption (use a random string)
NEXTAUTH_SECRET="generate-a-random-secret-here"

# Required: Your app URL
NEXTAUTH_URL="http://localhost:3000"
```

**To generate a secure NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

**Optional** variables for OAuth/Email authentication:

```bash
# GitHub OAuth
GITHUB_ID=""
GITHUB_SECRET=""

# Email provider (for magic links)
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="noreply@yourdomain.com"

# AI provider
OPENAI_API_KEY=""  # If not set, mock AI provider will be used
```

### Step 3: Set Up the Database

#### Option A: Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create database
createdb photext

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://localhost:5432/photext"
```

#### Option B: Hosted PostgreSQL

Use a hosted provider like:
- [Neon](https://neon.tech) (free tier available)
- [Supabase](https://supabase.com) (free tier available)
- [Railway](https://railway.app) (free trial)

Copy the connection string to your `.env` file.

### Step 4: Run Database Migrations

Create all database tables:

```bash
pnpm prisma:migrate dev --name init
```

This will:
1. Create all tables defined in `schema.prisma`
2. Generate the Prisma Client
3. Create a migration file in `prisma/migrations/`

### Step 5: Verify the Setup

Open Prisma Studio to view your database:

```bash
pnpm prisma:studio
```

This opens a GUI at `http://localhost:5555` where you can browse tables and data.

### Step 6: Start the Development Server

```bash
pnpm dev
```

Your app will be running at `http://localhost:3000`!

## 🔍 Verify Authentication

To test that NextAuth is working:

1. Navigate to `http://localhost:3000/api/auth/signin`
2. You should see the NextAuth sign-in page

Note: To actually sign in, you'll need to configure at least one provider (GitHub or Email).

## 📊 Database Schema Key Points

### User Model
- Tracks billing plan (`FREE` or `PRO`)
- Aggregate AI usage counters for quota enforcement
- Relations: accounts, sessions, projects

### Project Model
- Supports both authenticated users and guests (via `guestKey`)
- Stores canvas state as JSON in `boxes` field (type: `BoxState[]`)
- Per-project AI usage counters
- Optional caches for generated posts and hashtags

### AI Usage Tracking
Every time an AI function is called:
1. Increment project counter (e.g., `Project.aiRewriteCount`)
2. Increment user total (e.g., `User.aiTotalRewriteCount`)

Use `incrementAiUsage()` helper from `lib/projects.ts`:

```typescript
await incrementAiUsage({
  projectId: "...",
  type: "rewrite", // or "grammarFix", "postGeneration", "hashtagSuggestion"
});
```

## 🎨 Canvas State Structure

The `Project.boxes` field stores an array of `BoxState` objects:

```typescript
{
  id: "box-1",
  text: "Hello World",
  x: 100,
  y: 200,
  width: 300,
  height: 50,
  zIndex: 1,
  locked: false,
  hidden: false,
  ocrConfidence: 0.95,
  language: "en",
  style: {
    fontFamily: "Inter",
    fontSize: 24,
    fontWeight: 700,
    color: "#000000",
    textAlign: "left",
    lineHeight: 1.5
  },
  aiHistory: [
    {
      id: "hist-1",
      action: "rewrite",
      createdAt: "2025-11-08T10:00:00Z",
      previousText: "hello world",
      newText: "Hello World"
    }
  ]
}
```

## 🛠️ Development Commands

```bash
# Development
pnpm dev                  # Start dev server
pnpm build               # Build for production
pnpm start               # Start production server

# Database
pnpm prisma:generate     # Generate Prisma Client
pnpm prisma:migrate      # Run migrations (dev)
pnpm prisma:studio       # Open database GUI

# Linting
pnpm lint                # Run ESLint
```

## 📦 Next Steps

### 1. Create App Pages

Create the main app structure:

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (app)/
│   ├── dashboard/
│   ├── projects/
│   │   └── [id]/
│   └── layout.tsx
└── page.tsx
```

### 2. Implement OCR Integration

Choose and integrate an OCR provider:
- Tesseract.js (browser-based, free)
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision

### 3. Build Canvas Editor

Implement the canvas component:
- Image background layer
- Draggable/resizable text boxes
- Zoom and pan controls
- Snap-to-guide functionality

### 4. Add AI Provider

Implement AI functions in a provider pattern:

```typescript
// lib/ai/provider.ts
export interface AiProvider {
  rewriteText(input: string, style: string): Promise<string>;
  fixGrammar(input: string): Promise<string>;
  generatePosts(params: GeneratePostsParams): Promise<GeneratedPosts>;
  suggestHashtags(params: HashtagParams): Promise<HashtagSet>;
}

// lib/ai/openai-provider.ts
export class OpenAIProvider implements AiProvider {
  // Implementation...
}

// lib/ai/mock-provider.ts
export class MockProvider implements AiProvider {
  // Deterministic responses for dev/testing
}
```

### 5. Add UI Components

Install shadcn/ui:

```bash
pnpm dlx shadcn@latest init
```

Add components:
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
# etc.
```

## 🐛 Troubleshooting

### Prisma Client Not Found

```bash
pnpm prisma:generate
```

### Database Connection Issues

- Verify `DATABASE_URL` in `.env`
- Check that PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

### NextAuth Session Issues

- Verify `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your app URL
- Check that migrations created the auth tables

### TypeScript Errors

```bash
# Regenerate Prisma types
pnpm prisma:generate

# Restart TypeScript server in your editor
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🤝 Need Help?

Refer to the main `README.md` for:
- Feature specifications
- API reference
- Plans & limits documentation
- Architecture notes

---

**Happy coding! 🚀**
