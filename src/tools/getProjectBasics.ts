import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ToolBase } from './toolBase.js';

export class GetProjectBasicsTool extends ToolBase {
	protected name = 'get-project-basics';
	protected description =
		'Quickly retrieves essential project information including package.json details and main directory structure';

	protected argsShape = z.object({});

	protected async execute(): Promise<CallToolResult> {
		const rootPath = this.config.rootDirectory;

		const [packageInfo, basicStructure] = await Promise.all([
			this.readPackageJson(rootPath),
			this.getBasicDirectories(rootPath),
		]);

		const result = {
			name: packageInfo.name,
			version: packageInfo.version,
			description: packageInfo.description,
			main: packageInfo.main,
			type: packageInfo.type,
			dependencies: Object.keys(packageInfo.dependencies || {}),
			devDependencies: Object.keys(packageInfo.devDependencies || {}),
			directories: basicStructure,
		};

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	}

	private async readPackageJson(rootPath: string) {
		const content = await fs.readFile(path.join(rootPath, 'package.json'), 'utf-8');

		return JSON.parse(content);
	}

	private async getBasicDirectories(rootPath: string, maxDepth: number = 2) {
		const directories: { [depth: number]: string[] } = {};

		const scanDepth = async (currentPath: string, depth: number) => {
			if (depth > maxDepth) return;

			const entries = await fs.readdir(currentPath, { withFileTypes: true });

			if (!directories[depth]) directories[depth] = [];

			for (const entry of entries) {
				if (entry.isDirectory()) {
					const fullPath = path.join(currentPath, entry.name);
					const relativePath = path.relative(rootPath, fullPath);

					directories[depth].push(relativePath);

					if (entry.name.startsWith('.')) {
						continue;
					}

					await scanDepth(fullPath, depth + 1);
				}
			}
		};

		await scanDepth(rootPath, 1);
		return directories;
	}
}
