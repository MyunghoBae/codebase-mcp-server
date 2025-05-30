<p align="center">
  <h1 align="center">Codebase MCP Server</h1>
  <p align="center">Model Context Protocol server for secure and efficient Codebase analysis</p>
</p>

<p align="center">
  <a href="https://github.com/yourusername/codebase-mcp-server/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/codebase-mcp-server">
    <img src="https://img.shields.io/npm/v/codebase-mcp-server" alt="npm version">
  </a>
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-quickstart">QuickStart</a> •
  <a href="#%EF%B8%8F-configuration">Configuration</a> •
  <a href="#%EF%B8%8F-tools">Tools</a> •
</p>

## 🌟 Key Features

- **Secure Access**: Restricts file operations to predefined root directory.
- **Efficient File Management**: Provides tools for reading and searching files.
- **Detailed Metadata**: Retrieves comprehensive file metadata including size, creation time, last modified time, permissions, and type.
- **Dependency Analysis**: Traverses and analyzes dependency trees within projects.

## 🛠️ Tools

- `search-config-files`: Searches for configuration files within the root directory and returns their paths.
- `get-dependency-tree`: Traverses the dependency tree based on the given file path and root directory, and returns the traversal results.
- `list-directory`: Lists the contents of a specified directory, distinguishing between files and directories.
- `read-file-with-metadata`: Reads the content of a specified file and retrieves its metadata.

## 🚀 QuickStart

### Prerequisites

- Node.js v18 or later
- Codebase to communicate with LLM

### Installation

First, install the Codebase MCP server with your client. A typical configuration looks like this:

```json
{
	"mcpServers": {
		"Codebase": {
			"command": "npx",
			"args": ["codebase-mcp-server@latest"]
		}
	}
}
```

Or, you can install the Codebase MCP server with Docker.

```json
{
	"mcpServers": {
		"Codebase": {
			"command": "docker",
			"args": [
				"run",
				"-i",
				"--rm",
				"--mount",
				"type=bind,src=/path/to/your/codebase/dir,dst=/projects/path/to/your/codebase/dir,ro",
				"--mount",
				"type=bind,src=/path/to/some/file.txt,dst=/projects/path/to/some/file.txt",
				"mcp/codebase",
				"/projects"
			]
		}
	}
}
```

<details><summary><b>Install in VS Code</b></summary>
You can install the Codebase MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"Codebase","command":"npx","args":["codebase-mcp-server@latest"]}'
```

After installation, the Codebase MCP server will be available for use with your GitHub Copilot agent in VS Code.

</details>

<details><summary><b>Install in Cursor</b></summary>
Go to Cursor Settings -> MCP -> Add new MCP Server. Use following configuration:

```json
{
	"mcpServers": {
		"Codebase": {
			"command": "npx",
			"args": ["codebase-mcp-server@latest"]
		}
	}
}
```

</details>

<details><summary><b>Install in Windsurf</b></summary>

Follow Windsuff MCP documentation. Use following configuration:

```json
{
	"mcpServers": {
		"Codebase": {
			"command": "npx",
			"args": ["codebase-mcp-server@latest"]
		}
	}
}
```

</details>

<details><summary><b>Install in Claude Desktop</b></summary>

Follow the MCP install guide, use following configuration:

```json
{
	"mcpServers": {
		"Codebase": {
			"command": "npx",
			"args": ["codebase-mcp-server@latest"]
		}
	}
}
```

</details>

## 🔧 Build

### Local Development Build

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build
```

### Docker Build

```bash
# Build Docker image
docker build -t mcp/codebase -f .

# Or with specific tag
docker build -t mcp/codebase:latest -f .
```

## 🤝 Contributing

Contributions are welcome! Please read our Contributing Guide for details on our Code of conduct and the process for submitting pull requests.
