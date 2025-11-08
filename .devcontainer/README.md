# DevContainer Configuration

This directory contains the configuration for running PhoText in GitHub Codespaces or any DevContainer-compatible environment (VS Code Remote Containers, etc.).

## What's Included

### Base Image
- **Node.js 20** with TypeScript support
- **pnpm** package manager (enabled via `corepack`)
- **GitHub CLI** for GitHub operations

### Services
- **PostgreSQL 16** running in a separate container
  - Database: `photext`
  - User: `postgres`
  - Password: `postgres`
  - Connection: `postgresql://postgres:postgres@db:5432/photext`

### VS Code Extensions
- **ESLint** — Linting
- **Prettier** — Code formatting
- **Prisma** — Prisma schema support
- **TypeScript** — Enhanced TypeScript support

### Automatic Setup
When the container is created, it automatically:
1. Enables pnpm via `corepack`
2. Installs all dependencies (`pnpm install`)
3. Generates Prisma Client (`pnpm prisma:generate`)

## Port Forwarding

- **3000** — PhoText web app (auto-opens in browser)
- **5432** — PostgreSQL database (for external tools)

## Environment Variables

The following environment variables are automatically configured:

```bash
DATABASE_URL=postgresql://postgres:postgres@db:5432/photext
```

You still need to add to `.env`:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Optional: OAuth provider credentials

## First-Time Setup

After the container starts:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate NextAuth secret
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env

# 3. Set your Codespace URL (if using Codespaces)
echo "NEXTAUTH_URL=https://$CODESPACE_NAME-3000.preview.app.github.dev" >> .env

# 4. Run database migrations
pnpm prisma:migrate dev --name init

# 5. Start development server
pnpm dev
```

## Database Management

### Prisma Studio
Open the database GUI:
```bash
pnpm prisma:studio
```

### Direct PostgreSQL Access
Connect to the database:
```bash
psql postgresql://postgres:postgres@db:5432/photext
```

### Reset Database
If you need to start fresh:
```bash
pnpm prisma migrate reset
```

## Rebuilding the Container

If you modify `devcontainer.json`, rebuild the container:
- **VS Code:** Command Palette → "Remote-Containers: Rebuild Container"
- **Codespaces:** Codespaces menu → "Rebuild Container"

## Customization

### Adding VS Code Extensions
Edit `devcontainer.json`:
```json
"customizations": {
  "vscode": {
    "extensions": [
      "your.extension-id"
    ]
  }
}
```

### Adding System Dependencies
Add to `devcontainer.json`:
```json
"features": {
  "ghcr.io/devcontainers/features/your-feature:1": {}
}
```

### Changing PostgreSQL Version
Edit the `services.db.image` field:
```json
"services": {
  "db": {
    "image": "postgres:15"
  }
}
```

## Troubleshooting

### Database Connection Issues
If you can't connect to PostgreSQL:
```bash
# Check if the database service is running
docker ps

# View database logs
docker logs <postgres-container-id>

# Restart the container if needed
```

### Prisma Client Not Found
```bash
pnpm prisma:generate
```

### Port Already in Use
Change the port in `package.json`:
```json
"dev": "next dev -p 3001"
```

And update `forwardPorts` in `devcontainer.json`.

## Using with VS Code Remote Containers

1. Install the "Remote - Containers" extension
2. Open the project in VS Code
3. Click "Reopen in Container" when prompted
4. Follow the first-time setup steps above

## Performance Tips

- **Use Codespaces prebuild:** Configure `.github/workflows/codespaces-prebuild.yml` to speed up container startup
- **Persistent data:** PostgreSQL data persists between container rebuilds
- **Volume mounts:** node_modules are mounted in a volume for faster performance

## Security Notes

- The default PostgreSQL password is for development only
- Never commit real credentials to the devcontainer config
- For production, always use proper secrets management

## Learn More

- [Codespaces Documentation](https://docs.github.com/en/codespaces)
- [DevContainer Spec](https://containers.dev/)
- [DevContainer Features](https://containers.dev/features)

---

**Happy coding in the cloud! ☁️**
