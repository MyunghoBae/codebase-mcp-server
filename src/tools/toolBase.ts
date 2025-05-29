import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';

import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { type Config } from '../types/config.js';

export abstract class ToolBase {
	protected abstract name: string;
	protected abstract description: string;
	protected abstract argsShape: ZodObject<ZodRawShape, 'strip', ZodTypeAny>;

	protected abstract execute(args: z.infer<typeof this.argsShape>): Promise<CallToolResult>;

	constructor(protected readonly config: Config) {}

	public register(server: McpServer): void {
		const callback: ToolCallback<typeof this.argsShape.shape> = async (args) => {
			try {
				const parsed = this.argsShape.safeParse(args);
				if (!parsed.success) {
					throw new Error(`Invalid arguments for ${this.name}: ${parsed.error}`);
				}

				const result = await this.execute(parsed.data);

				return result;
			} catch (error: unknown) {
				const toolResult = await this.handleError(error);

				return toolResult;
			}
		};

		server.tool(this.name, this.description, this.argsShape.shape, callback);
	}

	protected handleError(error: unknown): CallToolResult {
		return {
			content: [
				{
					type: 'text',
					text: `Error running ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		};
	}
}
