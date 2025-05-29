import fs from 'fs/promises';
import { z } from 'zod';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ToolBase } from './toolBase.js';
import { validatePath } from '../utils/path.js';

export class ListDirectoryTool extends ToolBase {
	protected name = 'list-directory';
	protected description =
		'TLists the contents of a specified directory. Returns a detailed listing of all files and directories within the specified path, clearly distinguishing between files and directories with [FILE] and [DIR] prefixes. This tool is essential for understanding directory structure and finding specific files within a directory. Only works within root directory';
	protected argsShape = z.object({
		directoryPath: z.string().describe('The path to the directory to list.'),
	});

	protected async execute({ directoryPath }: z.infer<typeof this.argsShape>): Promise<CallToolResult> {
		const validPath = await validatePath(this.config.rootDirectory, directoryPath);
		const entries = await fs.readdir(validPath, { withFileTypes: true });

		const formatted = entries
			.map((entry) => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`)
			.join('\n');

		return {
			content: [{ type: 'text', text: formatted }],
		};
	}
}
