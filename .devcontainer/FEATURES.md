# DevContainer Features

This document details all the features and capabilities of the PhoText Codespaces environment.

## 🏗️ Base Configuration

### Container Image
- **Base:** `mcr.microsoft.com/devcontainers/typescript-node:20`
- **Node.js:** Version 20 (LTS)
- **Package Manager:** pnpm (via corepack)
- **OS:** Debian-based Linux

### Included Tools
- Git (latest)
- GitHub CLI (`gh`)
- OpenSSL (for generating secrets)
- PostgreSQL client (`psql`)
- curl, wget, nano, vim

## 🗄️ Database Configuration

### PostgreSQL Service
- **Version:** 16 (latest stable)
- **Container:** Separate service container
- **Database Name:** `photext`
- **Username:** `postgres`
- **Password:** `postgres` ⚠️ (dev only)
- **Host:** `db` (container hostname)
- **Port:** 5432

### Connection String
```
postgresql://postgres:postgres@db:5432/photext
```

This is automatically set in `remoteEnv.DATABASE_URL`.

### Data Persistence
- PostgreSQL data persists between container rebuilds
- Data is stored in a Docker volume
- Safe to stop/start the Codespace without data loss

## 🔌 Port Forwarding

### Port 3000 (Web App)
- **Label:** "PhoText Web"
- **Auto-forward:** Opens browser automatically
- **Visibility:** Private (requires authentication)
- **Protocol:** HTTPS (via Codespaces proxy)

### Port 5432 (PostgreSQL)
- **Label:** "PostgreSQL"
- **Auto-forward:** Silent (no browser)
- **Usage:** External database tools (TablePlus, DBeaver, etc.)
- **Connection:** Use the forwarded URL from Codespaces

## 🎨 VS Code Customization

### Settings
```json
{
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

- **Format on Save:** Auto-format with Prettier
- **TypeScript SDK:** Use workspace version for consistency

### Extensions (Auto-installed)
1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Linting for JavaScript/TypeScript
   - Auto-fix on save (when configured)

2. **Prettier** (`esbenp.prettier-vscode`)
   - Code formatting
   - Integrates with format-on-save

3. **Prisma** (`Prisma.prisma`)
   - Syntax highlighting for `.prisma` files
   - Schema validation
   - Prisma Client auto-completion

4. **TypeScript** (`ms-vscode.vscode-typescript-next`)
   - Latest TypeScript features
   - Enhanced IntelliSense

## 🤖 Lifecycle Commands

### postCreateCommand
**Runs once when container is first created:**
```bash
corepack enable && pnpm install && pnpm prisma:generate
```

1. Enable pnpm via corepack
2. Install all npm dependencies
3. Generate Prisma Client

**Time:** ~1-2 minutes

### updateContentCommand
**Runs when container is rebuilt or code is updated:**
```bash
pnpm install
```

Ensures dependencies are up-to-date after changes.

## 🌐 Environment Variables

### Automatically Set
- `DATABASE_URL` — PostgreSQL connection string
- `CODESPACE_NAME` — Your unique Codespace identifier
- `NODE_ENV` — Set to `development` by default

### You Must Set (in `.env`)
```bash
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://$CODESPACE_NAME-3000.preview.app.github.dev
```

Optional:
- `GITHUB_ID` / `GITHUB_SECRET` — OAuth
- `EMAIL_SERVER` / `EMAIL_FROM` — Email provider
- `OPENAI_API_KEY` — AI provider

## 📦 Services Architecture

```
┌─────────────────────────────────────────┐
│         Codespace Container             │
│  ┌───────────────────────────────────┐  │
│  │     Node.js 20 + TypeScript       │  │
│  │                                   │  │
│  │   Next.js App (Port 3000)         │  │
│  │   ↓                               │  │
│  │   Prisma Client                   │  │
│  │   ↓                               │  │
│  └───────────────────────────────────┘  │
│               ↓ DB Connection           │
│  ┌───────────────────────────────────┐  │
│  │   PostgreSQL 16 (Port 5432)       │  │
│  │   - Database: photext             │  │
│  │   - User: postgres                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↓ Port Forwarding (HTTPS)
┌─────────────────────────────────────────┐
│      Your Browser (Any Device)          │
│  https://...-3000.preview.app.github.dev│
└─────────────────────────────────────────┘
```

## ⚡ Performance Optimizations

### Node Modules Volume
- `node_modules` stored in named volume
- Faster install times on container rebuild
- Avoids cross-platform file sync issues

### Build Cache
- Docker layer caching enabled
- Faster subsequent container builds
- Shared base images across Codespaces

### Prisma Client
- Pre-generated on container creation
- No first-run generation delay
- Cached between sessions

## 🔒 Security Considerations

### Development Environment Only
⚠️ **Important:** This configuration is for development only!

- Default PostgreSQL password (`postgres`)
- No SSL for database connection
- Ports are forwarded via Codespaces HTTPS (secure)
- Database is not exposed to the internet directly

### Production Checklist
When deploying to production:
- [ ] Use strong database password
- [ ] Enable SSL for database connection
- [ ] Set `NEXTAUTH_SECRET` to cryptographically random value
- [ ] Use proper secrets management (not `.env` file)
- [ ] Enable database connection pooling
- [ ] Configure proper CORS and CSP headers

## 🧪 Testing in Codespaces

### Unit Tests
```bash
# Add test script to package.json, then:
pnpm test
```

### Prisma Studio
```bash
pnpm prisma:studio
```
Access at forwarded port (usually 5555)

### Database Inspection
```bash
psql $DATABASE_URL
```

## 🛠️ Troubleshooting

### Database Not Connecting
```bash
# Check if PostgreSQL is running
docker ps

# View logs
docker logs $(docker ps -q -f name=postgres)

# Restart database (from host)
docker restart $(docker ps -q -f name=postgres)
```

### Prisma Client Out of Sync
```bash
pnpm prisma:generate
```

### Port Already Forwarded
VS Code → Ports panel → Stop forwarding → Try again

### Container Won't Start
1. View creation logs in "Codespaces" output panel
2. Check for errors in `postCreateCommand`
3. Try rebuilding: Command Palette → "Codespaces: Rebuild Container"

### Slow Performance
- Check if Codespace is in the same region as you
- Upgrade to 4-core or 8-core machine type
- Enable Codespaces prebuilds for faster startup

## 📊 Resource Usage

### Default Codespace (2-core, 4GB RAM)
- ✅ Sufficient for development
- ✅ Can run Next.js dev server + PostgreSQL
- ⚠️ May be slow for heavy AI operations

### Recommended (4-core, 8GB RAM)
- ✅ Smooth development experience
- ✅ Can run multiple services
- ✅ Better for Prisma Studio + dev server

### For Teams
- Consider prebuilds to speed up container creation
- Set organization defaults for machine type
- Monitor usage via GitHub settings

## 🎓 Learning Resources

### Codespaces
- [GitHub Codespaces Docs](https://docs.github.com/en/codespaces)
- [Codespaces Quickstart](https://docs.github.com/en/codespaces/getting-started/quickstart)
- [Deep Dive into DevContainers](https://code.visualstudio.com/docs/devcontainers/containers)

### DevContainers
- [DevContainer Specification](https://containers.dev/)
- [Available Features](https://containers.dev/features)
- [VS Code Remote - Containers](https://code.visualstudio.com/docs/remote/containers)

### Tools
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [pnpm Docs](https://pnpm.io/)

## 🚀 Advanced Usage

### Adding Custom Scripts
Edit `devcontainer.json`:
```json
{
  "postCreateCommand": "corepack enable && pnpm install && pnpm prisma:generate && ./scripts/setup.sh"
}
```

### Adding System Packages
```json
{
  "postCreateCommand": "sudo apt-get update && sudo apt-get install -y imagemagick && pnpm install"
}
```

### Multiple Database Services
```json
{
  "services": {
    "db": { /* PostgreSQL */ },
    "redis": {
      "image": "redis:7",
      "forwardPorts": [6379]
    }
  }
}
```

### Custom Environment Variables
```json
{
  "remoteEnv": {
    "DATABASE_URL": "...",
    "REDIS_URL": "redis://redis:6379"
  }
}
```

## 📝 Changelog

### 2025-11-08 (Initial Release)
- ✅ Node.js 20 base image
- ✅ PostgreSQL 16 service
- ✅ Auto-install dependencies
- ✅ Port forwarding (3000, 5432)
- ✅ VS Code extensions (ESLint, Prettier, Prisma)
- ✅ GitHub CLI integration

---

**Questions or Issues?** Check `.devcontainer/README.md` or open a GitHub issue!
