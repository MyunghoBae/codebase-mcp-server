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
		targetConfigFilePatterns: z
			.string()
			.describe(
				'A Comma-separated configuration file pattern list to search for. Supports file names (tsconfig.json) and glob patterns (webpack.config.*, *.config.js, **/*.config.json)',
			),
		excludePatterns: z
			.string()
			.describe(
				'A comma-separated list of patterns to exclude from the search. This should be a list of patterns',
			),
	});

	protected async execute({
		targetConfigFilePatterns,
		excludePatterns,
	}: z.infer<typeof this.argsShape>): Promise<CallToolResult> {
		const searchConfigFilesPromises = targetConfigFilePatterns.split(',').map(async (pattern) => {
			const result = await this.searchFile(this.config.rootDirectory, pattern.trim(), excludePatterns.split(','));

			return { pattern: pattern.trim(), filePath: result || 'Not found' };
		});

		const allResults = await Promise.all(searchConfigFilesPromises);
		const resultText = JSON.stringify(allResults, null, 2);

		return {
			content: [
				{
					type: 'text',
					text: resultText,
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

					if (
						entry.name.toLowerCase() === pattern.toLowerCase() ||
						minimatch(entry.name, pattern, { nocase: true })
					) {
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
