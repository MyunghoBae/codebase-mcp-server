import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { minimatch } from 'minimatch';

import { ToolBase } from './toolBase.js';
import { validatePath } from '../utils/path.js';

export class SearchConfigFilesTool extends ToolBase {
	protected name = 'search-config-files';
	protected description =
		'Searches for configuration files within the root directory, based on the provided target configuration files and exclude patterns. Returns the paths to the found configuration files in the format { config_a: path/of/config/a, config_b: path/of/config/b, ... }. This tool helps in locating specific configuration files within the project';
	protected argsShape = z.object({
		targetConfigFiles: z
			.string()
			.describe(
				'A comma-separated list of target configuration files to search for. This should be a list of file names or patterns',
			),
		excludePatterns: z
			.string()
			.describe(
				'A comma-separated list of patterns to exclude from the search. This should be a list of patterns',
			),
	});

	protected async execute({
		targetConfigFiles,
		excludePatterns,
	}: z.infer<typeof this.argsShape>): Promise<CallToolResult> {
		const searchConfigFiles = targetConfigFiles.split(',').map(async (file) => {
			const validPath = await validatePath(this.config.rootDirectory, file.trim());
			const result = await this.searchFile(this.config.rootDirectory, validPath, excludePatterns.split(','));

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
	}

	private async searchFile(
		rootPath: string,
		pattern: string,
		excludePatterns: string[] = [],
	): Promise<string | null> {
		async function search(currentPath: string): Promise<string | null> {
			const entries = await fs.readdir(currentPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name);

				try {
					await validatePath(rootPath, fullPath);

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
}
