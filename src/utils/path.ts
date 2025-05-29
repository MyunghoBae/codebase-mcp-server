import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export function normalizePath(p: string): string {
	return path.normalize(p);
}

export function expandHome(filepath: string): string {
	if (filepath.startsWith('~/') || filepath === '~') {
		return path.join(os.homedir(), filepath.slice(1));
	}
	return filepath;
}

export function absolutePath(p: string): string {
	const expandedPath = expandHome(p);
	const absolute = path.isAbsolute(expandedPath)
		? path.resolve(expandedPath)
		: path.resolve(process.cwd(), expandedPath);

	return normalizePath(absolute);
}

export async function validatePath(rootDirectory: string, requestedPath: string): Promise<string> {
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
