import fs from 'fs/promises';
import { z } from 'zod';
import dependencyTree from 'dependency-tree';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ToolBase } from './toolBase.js';
import { normalizePath } from '../utils/path.js';
import { FileBasedCache } from '../utils/cache.js';

import type { DependencyNodeId, DependencyTree, DependencyNode } from '../types/dependency.js';
import type { FileContentsMap, ReadFilePromiseMap } from '../types/file.js';
import { Config } from '../types/config.js';

export class GetDependencyTreeTool extends ToolBase {
	private cache: FileBasedCache<DependencyTree>;
	private CACHE_EXPIRY = 5 * 60 * 1000; // 5분

	protected name = 'get-dependency-tree';
	protected description =
		'Traverses the dependency tree based on the given file path and root directory, and returns the traversal results. This tool helps in understanding the dependency relationships within the project. Optionally accepts paths to RequireJS, Webpack, and TypeScript configuration files to enhance dependency resolution';
	protected argsShape = z.object({
		filePath: z
			.string()
			.describe(
				'The path to the starting file for traversing the dependency tree. The dependency graph will be constructed starting from this file',
			),
		requireConfig: z.string().optional().describe('The path to the RequireJS configuration file'),
		webpackConfig: z.string().optional().describe('The path to the Webpack configuration file'),
		tsConfig: z.string().optional().describe('The path to the TypeScript configuration file'),
	});

	constructor(config: Config) {
		super(config);

		this.cache = new FileBasedCache<DependencyTree>(config.rootDirectory);

		setInterval(() => {
			this.cache.cleanup();
		}, this.CACHE_EXPIRY);
	}

	protected async execute({
		filePath,
		requireConfig,
		webpackConfig,
		tsConfig,
	}: z.infer<typeof this.argsShape>): Promise<CallToolResult> {
		const cachedResult = await this.cache.get(filePath, this.constructor.name);
		if (cachedResult) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(cachedResult, null, 2),
					},
				],
			};
		}

		const dependencies = dependencyTree({
			filename: normalizePath(filePath),
			directory: this.config.rootDirectory,
			requireConfig: requireConfig ? normalizePath(requireConfig) : undefined,
			webpackConfig: webpackConfig ? normalizePath(webpackConfig) : undefined,
			tsConfig: tsConfig ? normalizePath(tsConfig) : undefined,
		}) as DependencyTree;

		const result = await this.parseDependencies(dependencies);

		await this.cache.set(filePath, dependencies, this.constructor.name);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	}

	private async parseDependencies(dependencies: DependencyTree) {
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
}
