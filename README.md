<p align="center">
  <h1 align="center">xAPI MCP Server</h1>
  <p align="center">Model Context Protocol server for intelligent xAPI learning data management and analysis</p>
</p>

<p align="center">
  <a href="https://github.com/yourusername/xapi-mcp-server/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/xapi-mcp-server">
    <img src="https://img.shields.io/npm/v/xapi-mcp-server" alt="npm version">
  </a>
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-quickstart">QuickStart</a> •
  <a href="#%EF%B8%8F-configuration">Configuration</a> •
  <a href="#%EF%B8%8F-tools">Tools</a> •
</p>

## 🌟 Key Features

- **Fast and Accurate** - Efficient xAPI data handling across multiple sources through native adapters.
- **LLM-friendly** - Direct AI integration with structured learning data and standardized formats.
- **Deterministic Analysis** - Consistent pattern analysis based on xAPI specs without interpretation ambiguity.

## 🚀 QuickStart

### Prerequisites

- Node.js v18 or later
- MongoDB 4.4+ (for MongoDB adapter)
- Basic understanding of xAPI specification

### Installation

First, install the xAPI MCP server with your client. A typical configuration looks like this:

```json
{
	"mcpServers": {
		"xAPI": {
			"command": "npx",
			"args": ["xapi-mcp-server@latest"]
		}
	}
}
```

<details><summary><b>Install in VS Code</b></summary>
You can install the xAPI MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"xAPI","command":"npx","args":["xapi-mcp-server@latest"]}'
```

After installation, the xAPI MCP server will be available for use with your GitHub Copilot agent in VS Code.

</details>

<details><summary><b>Install in Cursor</b></summary>
Go to Cursor Settings -> MCP -> Add new MCP Server. Use following configuration:

```json
{
	"mcpServers": {
		"xAPI": {
			"command": "npx",
			"args": ["xapi-mcp-server@latest"]
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
		"xAPI": {
			"command": "npx",
			"args": ["xapi-mcp-server@latest"]
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
		"xAPI": {
			"command": "npx",
			"args": ["xapi-mcp-server@latest"]
		}
	}
}
```

</details>

### Standalone MCP server

When you need to run xAPI MCP server as a standalone service, you can use the following options:

#### Using Port Configuration

Run the MCP server with a specific port to enable SSE transport:

```bash
npx xapi-mcp-server@latest --port 8931
```

Then in MCP client config, set the url to the SSE endpoint:

```json
{
	"mcpServers": {
		"xAPI": {
			"url": "http://localhost:8931/sse"
		}
	}
}
```

<details><summary><b>Using Docker</b></summary>

NOTE: Make sure to properly configure MongoDB access when using Docker.

Basic docker configuration:

```json
{
	"mcpServers": {
		"xAPI": {
			"command": "docker",
			"args": ["run", "-i", "--rm", "--init", "--pull=always", "xapi-mcp-server:latest"]
		}
	}
}
```

With MongoDB configuration:

```json
{
	"mcpServers": {
		"xAPI": {
			"command": "docker",
			"args": [
				"run",
				"-i",
				"--rm",
				"--init",
				"-e",
				"XAPI_MCP_MONGO_URI=mongodb://mongo:27017",
				"-e",
				"XAPI_MCP_DATABASES_CONFIG={\"learning\":{\"collections\":[\"statements\"]}}",
				"xapi-mcp-server:latest"
			]
		}
	}
}
```

Build your own Docker image:

```bash
docker build -t xapi-mcp-server .
```

</details>

<details><summary><b>Programmatic Usage</b></summary>

You can also create and run the MCP server programmatically:

```js
import http from 'http';
import { createConnection } from 'xapi-mcp-server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

http.createServer(async (req, res) => {
	// Create MCP server connection
	const connection = await createConnection({
		datasource: {
			type: 'mongodb',
			connection: {
				uri: 'mongodb://localhost:27017',
				databases: {
					learning: {
						collections: ['statements'],
					},
				},
			},
		},
	});

	// Setup SSE transport
	const transport = new SSEServerTransport('/messages', res);
	await connection.connect(transport);
});
```

</details>

## ⚙️ Configuration

xAPI MCP server supports following arguments. They can be provided in the JSON configuration above, as a part of the "args" list:

```bash
> npx xapi-mcp-server@latest --help
  --mongo-uri <uri>           MongoDB connection URI (required unless using env vars)
  --databases <config>        Database and collections configuration
  --port <port>              Port to listen on (default: 3000)
  --host <host>              Host to bind to (default: localhost)
  --validate-all             Validate all documents in collections (default: false)
  --sample-size <size>       Number of documents to sample for validation (default: 3)
  --output-dir <path>        Directory for output files
  --log-level <level>        Logging level (default: info)
```

The server can also be configured using environment variables or a configuration file. See the Configuration section for more details.

### Configuration File

The xAPI MCP server can be configured using a JSON configuration file. You can specify the configuration file using the --config command line option:

```bash
npx xapi-mcp-server@latest --config path/to/config.json
```

<details>
<summary>Configuration file schema</summary>

```typescript
{
  // Data source configuration
  datasource: {
    type: "mongodb",
    connection: {
      uri: string,
      databases: {
        [dbName: string]: {
          collections: string[]
        }
      },
      options: {
        validateAll: boolean,
        sampleSize: number
      }
    }
  },

  // Server configuration
  server: {
    port: number,
    host: string,
    logLevel: "debug" | "info" | "warn" | "error"
  },

  // Output configuration
  output: {
    directory: string
  }
}
```

</details>

## 🛠️ Tools

### Data Management Tools

- `list-collections` - Find xAPI data collections from connected data sources
- `collection-schema` - Get schema information for a specified collection
- `insert-one` - Insert a single xAPI statement into a collection
- `insert-many` - Insert multiple xAPI statements into a collection

### Query Tools

- `find` - Query xAPI statements with filtering and options
- `aggregate` - Run aggregation pipelines on xAPI data
- `count` - Get the count of statements matching a query

### Analysis Tools

- `analyze-pattern` - Analyze learning patterns from xAPI statements
- `get-progress` - Get learning progress metrics for a user
- `get-summary` - Generate summary of learning activities
- `extract-context` - Extract learning context from xAPI data
- `build-history` - Create timeline of learning activities
- `detect-trend` - Identify trends in learning behavior

### Context Generation Tools

- `build-context` - Build context from xAPI statements for LLM
- `filter-relevant` - Filter relevant xAPI data for current context
- `summarize-activities` - Create summary of activities for context

## 🤝 Contributing

Contributions are welcome! Please read our Contributing Guide for details on our Code of conduct and the process for submitting pull requests.
