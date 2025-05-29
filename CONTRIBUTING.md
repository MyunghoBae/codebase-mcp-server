# Contributing to xAPI MCP Server

Thank you for your interest in contributing to the xAPI MCP Server project! This document provides guidelines and instructions for contributing.

## Project Overview

This project implements a Model Context Protocol (MCP) server for xAPI data management and analysis, enabling AI assistants to interact with learning records through natural language.

## Development Setup

### Prerequisites

- Node.js (v18 or later)
- npm
- MongoDB (for development)

### Getting Started

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/xapi-mcp-server.git
    cd xapi-mcp-server
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Add the MCP server to your IDE:
    ```bash
    {
       "mcpServers": {
          "xAPI": {
             "command": "/path/to/xapi-mcp-server/dist/index.js"
          }
       }
    }
    ```

## Development Workflow

### Branch Management

1. Create a new branch:

    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-fix-name
    ```

2. Keep your branch up to date:
    ```bash
    git fetch origin
    git rebase origin/main
    ```

### Development Process

1. Make your changes following our code standards:

    - Use TypeScript for type safety
    - Follow existing code patterns
    - Add appropriate comments
    - Include tests for new features

2. Verify your changes:

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Run inspector
npm run inspect
```

3. Commit your changes using conventional commits:

```bash
# Features
git commit -m "feat: add new analysis tool"
git commit -m "feat(adapter): add postgresql support"

# Bug fixes
git commit -m "fix: resolve connection timeout"
git commit -m "fix(mongodb): handle connection errors"

# Documentation
git commit -m "docs: update README"
git commit -m "docs(api): add new endpoints"
```

### Adding New Features

#### Data Source Adapters

When implementing a new data source adapter:

```typescript
interface XAPISourceAdapter {
	connect(): Promise<void>;
	detectXAPICollections(): Promise<string[]>;
	findStatements(query: any): Promise<any[]>;
}
```

1. Create new adapter in `src/adapters/`
2. Implement required interfaces
3. Add connection management
4. Include validation logic
5. Write tests in `tests/adapters/`

#### Analysis Tools

When adding new analysis features:

1. Create tool in `src/tools/`
2. Define parameter schema:

```javascript
const schema = z.object({
	userId: z.string(),
	timeRange: z.object({
		start: z.date(),
		end: z.date(),
	}),
});
```

3. Add error handling
4. Write documentation
5. Create tests in `tests/tools/`

### Testing

Run tests using npm scripts:

```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Documentation

Update documentation for:

- New features
- Changed functionality
- Bug fixes
- API changes

### Pull Request Process

1. Ensure all tests pass
2. Update relevant documentation
3. Fill out PR template
4. Request maintainer review

PR title format:

```plain
feat: add PostgreSQL adapter
fix: resolve MongoDB connection timeout
docs: update adapter documentation
```

## Release Process

### Version Bumping

1. Go to GitHub repository Actions tab
2. Select "Version Bump" workflow
3. Click "Run workflow" and choose:
    - `patch` (1.0.0 → 1.0.1) for bug fixes
    - `minor` (1.0.0 → 1.1.0) for new features
    - `major` (1.0.0 → 2.0.0) for breaking changes
    - Or specific version (e.g., "1.2.3")
4. Wait for PR creation with version change
5. After approval and merge, version is updated

### Automatic Publishing

When version bump merges to main branch:

1. "Publish" workflow triggers automatically
2. Checks for existing git tag
3. For new versions:
    - Builds package
    - Publishes to NPM
    - Creates git tag
    - Creates GitHub release with auto-generated notes

### Code Quality

All PRs run through "Code Health" workflow:

- Code style verification
- Formatting checks
- Tests on multiple platforms:
    - Ubuntu
    - macOS
    - Windows

### License

By contributing to xAPI MCP Server, you agree that your contributions will be licensed under the project's MIT License. See the [LICENSE](LICENSE) file for details.

### Questions?

Need help? Open an issue in our [GitHub repository](https://github.com/yourusername/xapi-mcp-server/issues)
