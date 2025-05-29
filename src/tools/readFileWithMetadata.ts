import fs from 'fs/promises';
import { z } from 'zod';

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ToolBase } from './toolBase.js';
import { validatePath } from '../utils/path.js';

import { type FileInfo } from '../types/file.js';

export class ReadFileWithMetadataTool extends ToolBase {
	protected name = 'read-file-with-metadata';
	protected description =
		'Reads the content of a specified file and retrieves its metadata. Returns the file content and metadata as a JSON object with 2-space indentation for readability. This tool provides comprehensive information about the file, including its content and detailed metadata such as size, creation time, last modified time, permissions, and type. Only works within root directory';
	protected argsShape = z.object({
		filePath: z.string().describe('The path to the file to read and get metadata for'),
	});

	protected async execute({ filePath }: z.infer<typeof this.argsShape>): Promise<CallToolResult> {
		const validPath = await validatePath(this.config.rootDirectory, filePath);

		const content = await fs.readFile(validPath, 'utf-8');
		const info = await this.getFileStats(validPath);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({ content: content, metadata: info }, null, 2),
				},
			],
		};
	}

	private async getFileStats(filePath: string): Promise<FileInfo> {
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
}
