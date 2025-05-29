#!/usr/bin/env node

import os from 'os';
import fs from 'fs/promises';
import path from 'path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { minimatch } from 'minimatch';
import dependencyTree from 'dependency-tree';
import { z } from 'zod';

const args = process.argv.slice(2);
if (args.length === 0) {
	console.error('Usage: codebase-mcp-server <project-root-directory>');

	process.exit(1);
}

function normalizePath(p: string): string {
	return path.normalize(p);
}

function expandHome(filepath: string): string {
	if (filepath.startsWith('~/') || filepath === '~') {
		return path.join(os.homedir(), filepath.slice(1));
	}
	return filepath;
}

function absolutePath(p: string): string {
	const expandedPath = expandHome(p);
	const absolute = path.isAbsolute(expandedPath)
		? path.resolve(expandedPath)
		: path.resolve(process.cwd(), expandedPath);

	return normalizePath(absolute);
}

const rootDirectory = absolutePath(args[0]);

type DependencyNodeId = number;

interface DependencyTree {
	[key: string]: DependencyTree | object;
}

interface DependencyNode {
	id: DependencyNodeId;
	filePath: string;
	parents: DependencyNodeId[];
	content: string;
}

interface FileContentsMap {
	[key: string]: string;
}

interface ReadFilePromiseMap {
	[key: string]: Promise<string>;
}

interface FileInfo {
	size: number;
	created: Date;
	modified: Date;
	accessed: Date;
	isDirectory: boolean;
	isFile: boolean;
	permissions: string;
}

async function validatePath(requestedPath: string): Promise<string> {
	const absolute = absolutePath(requestedPath);
	const normalizedRequested = normalizePath(absolute);

	// Check if path is within root directory
	const isAllowed = normalizedRequested.startsWith(rootDirectory);
	if (!isAllowed) {
		throw new Error(`Access denied - path outside root directory: ${absolute} not in ${rootDirectory}`);
	}

	// Handle symlinks by checking their real path
	try {
		const realPath = await fs.realpath(absolute);
		const normalizedReal = normalizePath(realPath);
		const isRealPathAllowed = normalizedReal.startsWith(rootDirectory);
		if (!isRealPathAllowed) {
			throw new Error('Access denied - symlink target outside root directory');
		}
		return realPath;
	} catch {
		// For new files that don't exist yet, verify parent directory
		const parentDir = path.dirname(absolute);
		try {
			const realParentPath = await fs.realpath(parentDir);
			const normalizedParent = normalizePath(realParentPath);
			const isParentAllowed = normalizedParent.startsWith(rootDirectory);
			if (!isParentAllowed) {
				throw new Error('Access denied - parent directory outside root directory');
			}
			return absolute;
		} catch {
			throw new Error(`Parent directory does not exist: ${parentDir}`);
		}
	}
}

async function searchFile(rootPath: string, pattern: string, excludePatterns: string[] = []): Promise<string | null> {
	async function search(currentPath: string): Promise<string | null> {
		const entries = await fs.readdir(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name);

			try {
				await validatePath(fullPath);

				const relativePath = path.relative(rootPath, fullPath);
				const shouldExclude = excludePatterns.some((pattern) => {
					const globPattern = pattern.includes('*') ? pattern : `**/${pattern}/**`;
					return minimatch(relativePath, globPattern, { dot: true });
				});

				if (shouldExclude) {
					continue;
				}

				if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
					return fullPath;
				}

				if (entry.isDirectory()) {
					const result = await search(fullPath);
					if (result) {
						return result;
					}
				}
			} catch {
				continue;
			}
		}

		return null;
	}

	return search(rootPath);
}

async function parseDependencies(dependencies: DependencyTree) {
	const nodeMap = new Map<string, DependencyNodeId>();
	const nodes: DependencyNode[] = [];
	let nodeId = 1;
	const fileContents: FileContentsMap = {};
	const nodeFilePathMap = new Map<string, DependencyNode>();
	const readFilePromises: ReadFilePromiseMap = {};

	async function traverse(obj: DependencyTree, parentIds = new Set<DependencyNodeId>()) {
		for (const key in obj) {
			if (!nodeMap.has(key)) {
				nodeMap.set(key, nodeId++);
			}
			const currentId = nodeMap.get(key)!;

			if (!nodeFilePathMap.has(key)) {
				nodeFilePathMap.set(key, {
					id: currentId,
					filePath: key,
					parents: [...parentIds],
					content: '',
				});
				nodes.push(nodeFilePathMap.get(key)!);
			} else {
				const existingNode = nodeFilePathMap.get(key)!;
				parentIds.forEach((id) => {
					if (!existingNode.parents.includes(id)) {
						existingNode.parents.push(id);
					}
				});
			}

			if (!fileContents[key]) {
				if (!readFilePromises[key]) {
					readFilePromises[key] = fs.readFile(key, 'utf8').catch((err) => {
						console.error(`Error reading file ${key}: ${err}`);
						return 'File not found';
					});
				}
				fileContents[key] = await readFilePromises[key];
			}

			if (typeof obj[key] === 'object' && obj[key] !== null) {
				parentIds.add(currentId);
				await traverse(obj[key] as DependencyTree, parentIds);
				parentIds.delete(currentId);
			}
		}
	}

	await traverse(dependencies);

	const result = nodes.map((node) => {
		return {
			id: node.id,
			filePath: node.filePath,
			parents: node.parents,
			content: fileContents[node.filePath],
		};
	});

	return result;
}

async function getFileStats(filePath: string): Promise<FileInfo> {
	const stats = await fs.stat(filePath);
	return {
		size: stats.size,
		created: stats.birthtime,
		modified: stats.mtime,
		accessed: stats.atime,
		isDirectory: stats.isDirectory(),
		isFile: stats.isFile(),
		permissions: stats.mode.toString(8).slice(-3),
	};
}

const GetDependencyTreeSchema = z.object({
	filePath: z
		.string()
		.describe(
			'The path to the starting file for traversing the dependency tree. The dependency graph will be constructed starting from this file',
		),
	requireConfig: z.string().optional().describe('The path to the RequireJS configuration file'),
	webpackConfig: z.string().optional().describe('The path to the Webpack configuration file'),
	tsConfig: z.string().optional().describe('The path to the TypeScript configuration file'),
});

const SearchConfigFilesSchema = z.object({
	targetConfigFiles: z
		.string()
		.describe(
			'A comma-separated list of target configuration files to search for. This should be a list of file names or patterns',
		),
	excludePatterns: z
		.string()
		.describe('A comma-separated list of patterns to exclude from the search. This should be a list of patterns'),
});

const ListDirectorySchema = z.object({
	directoryPath: z.string().describe('The path to the directory to list.'),
});

const ReadFileWithMetadataSchema = z.object({
	filePath: z.string().describe('The path to the file to read and get metadata for'),
});

// Create server instance
const server = new McpServer({
	name: 'weather',
	version: '1.0.0',
	capabilities: {
		resources: {},
		tools: {},
	},
});

server.tool(
	'search-config-files',
	'Searches for configuration files within the root directory, based on the provided target configuration files and exclude patterns. Returns the paths to the found configuration files in the format { config_a: path/of/config/a, config_b: path/of/config/b, ... }. This tool helps in locating specific configuration files within the project',
	SearchConfigFilesSchema.shape,
	async (args) => {
		try {
			const parsed = ListDirectorySchema.safeParse(args);
			if (!parsed.success) {
				throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
			}

			const { targetConfigFiles, excludePatterns } = args;

			const searchConfigFiles = targetConfigFiles.split(',').map(async (file) => {
				const validPath = await validatePath(file.trim());
				const result = await searchFile(rootDirectory, validPath, excludePatterns.split(','));

				return result ? [[file.trim(), result]] : null;
			});

			const allResults = await Promise.all(searchConfigFiles);
			const filteredResults = allResults.filter((result) => result !== null);
			const resultObject = Object.fromEntries(filteredResults);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(resultObject, null, 2),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: 'text', text: `Error: ${errorMessage}` }],
				isError: true,
			};
		}
	},
);

server.tool(
	'get-dependency-tree',
	'Traverses the dependency tree based on the given file path and root directory, and returns the traversal results. This tool helps in understanding the dependency relationships within the project. Optionally accepts paths to RequireJS, Webpack, and TypeScript configuration files to enhance dependency resolution',
	GetDependencyTreeSchema.shape,
	async (args) => {
		try {
			const parsed = ListDirectorySchema.safeParse(args);
			if (!parsed.success) {
				throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
			}

			const { filePath, requireConfig, webpackConfig, tsConfig } = args;

			const dependencies = dependencyTree({
				filename: normalizePath(filePath),
				directory: rootDirectory,
				requireConfig: requireConfig ? normalizePath(requireConfig) : undefined,
				webpackConfig: webpackConfig ? normalizePath(webpackConfig) : undefined,
				tsConfig: tsConfig ? normalizePath(tsConfig) : undefined,
			}) as DependencyTree;

			const result = await parseDependencies(dependencies);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: 'text', text: `Error: ${errorMessage}` }],
				isError: true,
			};
		}
	},
);

server.tool(
	'list-directory',
	'Lists the contents of a specified directory. Returns a detailed listing of all files and directories within the specified path, clearly distinguishing between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding directory structure and finding specific files within a directory. Only works within root directory',
	ListDirectorySchema.shape,
	async (args) => {
		try {
			const parsed = ListDirectorySchema.safeParse(args);
			if (!parsed.success) {
				throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
			}

			const { directoryPath } = args;

			const validPath = await validatePath(directoryPath);
			const entries = await fs.readdir(validPath, { withFileTypes: true });
			const formatted = entries
				.map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`)
				.join('\n');

			return {
				content: [{ type: 'text', text: formatted }],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: 'text', text: `Error: ${errorMessage}` }],
				isError: true,
			};
		}
	},
);

server.tool(
	'read-file-with-metadata',
	'Reads the content of a specified file and retrieves its metadata. Returns the file content and metadata as a JSON object with 2-space indentation for readability. This tool provides comprehensive information about the file, including its content and detailed metadata such as size, creation time, last modified time, permissions, and type. Only works within root directory',
	ReadFileWithMetadataSchema.shape,
	async (args) => {
		try {
			const parsed = ReadFileWithMetadataSchema.safeParse(args);
			if (!parsed.success) {
				throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
			}

			const { filePath } = args;

			const validPath = await validatePath(filePath);

			const content = await fs.readFile(validPath, 'utf-8');
			const info = await getFileStats(validPath);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ content: content, metadata: info }, null, 2),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [{ type: 'text', text: `Error: ${errorMessage}` }],
				isError: true,
			};
		}
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);

	console.error('Codebase MCP Server running on stdio');
}

main().catch((error) => {
	console.error('Fatal error in main():', error);

	process.exit(1);
});
