#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { absolutePath } from './utils/path.js';
import TOOLS from './tools/tools.js';
import { Config } from './types/config.js';

// Validate argument
const args = process.argv.slice(2);
if (args.length === 0) {
	console.error('Usage: codebase-mcp-server <project-root-directory>');

	process.exit(1);
}

const rootDirectory = absolutePath(args[0]);
const config: Config = {
	rootDirectory,
};

// Create server instance
const server = new McpServer({
	name: 'codebase',
	version: '1.0.0',
	capabilities: {
		resources: {},
		tools: {},
	},
});

// Register tools and connect server instnace
async function main() {
	const transport = new StdioServerTransport();

	TOOLS.forEach((Tool) => {
		new Tool(config).register(server);
	});

	await server.connect(transport);

	console.error('Codebase MCP Server running on stdio');
}

main().catch((error) => {
	console.error('Fatal error in main():', error);

	process.exit(1);
});
