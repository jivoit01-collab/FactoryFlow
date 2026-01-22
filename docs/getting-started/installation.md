# Installation Guide

This guide will walk you through setting up the Factory Management System development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Minimum Version | Recommended Version |
|----------|-----------------|---------------------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Git | 2.x | Latest |

### Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd factoryManagementSystemWeb
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies defined in `package.json`, including:

- React and React DOM
- TypeScript
- Vite build tool
- Redux Toolkit and React Query
- UI component libraries (Radix UI, Tailwind CSS)
- Form handling (React Hook Form, Zod)
- Development tools (ESLint, Prettier)

### 3. Environment Configuration

Create a `.env` file in the project root (or copy from `.env.example` if available):

```env
# API Configuration
VITE_API_BASE_URL=http://your-api-server:3000/api/v1

# Application Environment
VITE_APP_ENV=development

# Feature Flags
VITE_ENABLE_MOCKING=false
```

See [Environment Setup](../configuration/environment.md) for detailed configuration options.

### 4. Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173` (default Vite port).

## Verifying Installation

After starting the development server:

1. Open your browser and navigate to `http://localhost:5173`
2. You should see the login page
3. Check the browser console for any errors
4. Verify network requests are reaching the API server

## Common Installation Issues

### Node Version Mismatch

**Problem**: Build errors or unexpected behavior due to incompatible Node.js version.

**Solution**: Use a Node version manager like `nvm`:

```bash
# Install nvm (if not already installed)
# See: https://github.com/nvm-sh/nvm

# Use the correct Node version
nvm install 20
nvm use 20
```

### Dependency Installation Failures

**Problem**: `npm install` fails with permission or network errors.

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Remove existing node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

### Port Already in Use

**Problem**: Development server fails to start because port 5173 is in use.

**Solution**: Either stop the process using that port or specify a different port:

```bash
# Using a different port
npm run dev -- --port 3000
```

### TypeScript Errors

**Problem**: TypeScript compilation errors after fresh install.

**Solution**: Ensure TypeScript is properly installed and restart your IDE:

```bash
# Rebuild TypeScript project
npx tsc --noEmit

# If using VS Code, restart the TypeScript server
# Press Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

## IDE Setup

### Visual Studio Code (Recommended)

Install the following extensions for the best development experience:

1. **ESLint** - Linting support
2. **Prettier** - Code formatting
3. **TypeScript and JavaScript Language Features** - Built-in
4. **Tailwind CSS IntelliSense** - Tailwind class suggestions
5. **ES7+ React/Redux/React-Native snippets** - Code snippets

### Recommended VS Code Settings

Add to your workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Next Steps

- [Quick Start Guide](./quick-start.md) - Learn the basics
- [Project Structure](./project-structure.md) - Understand the codebase
- [Architecture Overview](../architecture/overview.md) - System design concepts
