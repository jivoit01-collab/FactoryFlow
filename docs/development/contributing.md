# Contributing Guide

This guide explains how to contribute to the Factory Management System project effectively.

## Development Setup

### Prerequisites

1. Node.js 18.x or higher
2. npm 9.x or higher
3. Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd factoryManagementSystemWeb

# Install dependencies
npm install

# Start development server
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-user-export` |
| Bug Fix | `fix/description` | `fix/login-redirect-issue` |
| Refactor | `refactor/description` | `refactor/auth-service` |
| Docs | `docs/description` | `docs/api-documentation` |
| Chore | `chore/description` | `chore/update-dependencies` |

### 2. Make Changes

Follow the [Code Style Guide](./code-style.md) when writing code.

```bash
# Check your changes
npm run lint
npm run format:check

# Fix formatting issues
npm run format
```

### 3. Commit Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "Add user export functionality to admin panel"
git commit -m "Fix redirect loop on company selection page"
git commit -m "Refactor auth service to use IndexedDB"

# Bad commit messages
git commit -m "fix"
git commit -m "changes"
git commit -m "WIP"
```

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat: add date range filter to raw materials list

- Add DateRangePicker component
- Integrate with Redux filters slice
- Update API queries to include date params

Closes #123
```

```
fix: resolve token refresh race condition

The concurrent request queue was not properly handling
rejected promises, causing some requests to hang.
```

### 4. Push and Create Pull Request

```bash
# Push your branch
git push -u origin feature/your-feature-name
```

Create a pull request on GitHub with:
- Clear title describing the change
- Description of what and why
- Link to related issues
- Screenshots for UI changes

## Pull Request Guidelines

### PR Title

Follow the same format as commit messages:

```
feat: add user export functionality
fix: resolve login redirect issue
docs: update API documentation
```

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- List of specific changes made
- Another change
- Third change

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] Verified no console errors

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Related Issues
Closes #123
```

### PR Checklist

Before submitting:

- [ ] Code follows the style guide
- [ ] No lint errors (`npm run lint`)
- [ ] Code is properly formatted (`npm run format:check`)
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed

## Code Review Process

### For Authors

1. **Keep PRs small** - Easier to review and merge
2. **Respond to feedback** - Address comments promptly
3. **Request re-review** - After making changes
4. **Squash if needed** - Keep commit history clean

### For Reviewers

1. **Be constructive** - Suggest improvements positively
2. **Explain reasoning** - Help the author learn
3. **Approve promptly** - Don't block progress unnecessarily
4. **Test locally** - For significant changes

## Adding New Features

### 1. Plan the Feature

- Understand requirements fully
- Identify affected areas
- Consider edge cases
- Plan the implementation approach

### 2. Create Module Structure

For new feature modules:

```bash
mkdir -p src/modules/new-feature/{pages,components,api,hooks,schemas,types}
```

### 3. Implement in Order

1. **Types** - Define TypeScript interfaces
2. **API** - Create API functions and query hooks
3. **Schemas** - Add Zod validation schemas
4. **Components** - Build UI components
5. **Pages** - Create page components
6. **Routes** - Add route configuration

### 4. Update Documentation

- Add JSDoc comments for public APIs
- Update relevant documentation files
- Add examples if helpful

## Fixing Bugs

### 1. Reproduce the Bug

- Understand the exact steps to reproduce
- Identify the root cause
- Check if it affects other areas

### 2. Write a Test (if possible)

```typescript
// Test that fails before the fix
test('should handle empty date range', () => {
  // Test case
})
```

### 3. Fix the Bug

- Make minimal changes
- Don't introduce new features
- Keep the fix focused

### 4. Verify the Fix

- Ensure the bug is fixed
- Check for regressions
- Test edge cases

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Writing Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<MyComponent onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Common Tasks

### Adding a New Page

1. Create page component in module's `pages/` directory
2. Add route in `src/config/routes.config.ts`
3. Register route in `src/app/routes/AppRoutes.tsx`
4. Add to sidebar menu if needed

### Adding a New API Endpoint

1. Add endpoint constant in `src/config/constants/api.constants.ts`
2. Create API function in module's `api/` directory
3. Create React Query hook in same directory
4. Use hook in components

### Adding a New Component

1. Create component file in appropriate directory
2. Export from index file
3. Add documentation/examples if shared

## Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npx tsc --noEmit
```

### Lint Errors

```bash
# Auto-fix lint issues
npm run lint -- --fix

# Format code
npm run format
```

### Dev Server Issues

```bash
# Kill existing processes and restart
npm run dev
```

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Create an issue with reproduction steps
- **Features**: Create an issue for discussion first

## Related Documentation

- [Code Style Guide](./code-style.md)
- [Project Structure](../getting-started/project-structure.md)
- [Architecture Overview](../architecture/overview.md)
