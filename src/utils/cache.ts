// src/utils/fileCache.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	fileHash: string;
	filePath: string;
}

export interface CacheOptions {
	maxAge: number;
	checkFileChanges: boolean;
}

export class FileBasedCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private rootDirectory: string;
	private options: CacheOptions = {
		maxAge: 10 * 60 * 1000, // 10분
		checkFileChanges: true,
	};

	constructor(rootDirectory: string) {
		this.rootDirectory = rootDirectory;
	}

	private static generateCacheKey(filePath: string, namespace: string = 'default'): string {
		return crypto.createHash('md5').update(`${namespace}:${filePath}`).digest('hex');
	}

	async get(filePath: string, namespace?: string): Promise<T | null> {
		const key = FileBasedCache.generateCacheKey(filePath, namespace);
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		if (Date.now() - entry.timestamp > this.options.maxAge) {
			this.cache.delete(key);
			return null;
		}

		if (this.options.checkFileChanges) {
			const hasChanged = await this.hasFileChanged(entry);
			if (hasChanged) {
				this.cache.delete(key);
				return null;
			}
		}

		return entry.data;
	}

	async set(filePath: string, data: T, namespace?: string): Promise<void> {
		const key = FileBasedCache.generateCacheKey(filePath, namespace);

		let fileHash = '';
		try {
			fileHash = await this.getFileHash(filePath);
		} catch (error) {
			console.warn(`Failed to hash file: ${filePath}`, error);
		}

		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			fileHash,
			filePath,
		};

		this.cache.set(key, entry);
	}

	private async hasFileChanged(entry: CacheEntry<T>): Promise<boolean> {
		try {
			const currentHash = await this.getFileHash(entry.filePath);
			return currentHash !== entry.fileHash;
		} catch {
			return true;
		}
	}

	private async getFileHash(filePath: string): Promise<string> {
		const fullPath = path.resolve(this.rootDirectory, filePath);
		const stats = await fs.stat(fullPath);

		if (stats.size < 1024 * 1000) {
			// 1000KB 미만
			const content = await fs.readFile(fullPath, 'utf-8');
			return crypto
				.createHash('md5')
				.update(content + stats.mtime.toISOString())
				.digest('hex');
		} else {
			// 큰 파일은 메타데이터만 사용
			return crypto
				.createHash('md5')
				.update(stats.size + stats.mtime.toISOString())
				.digest('hex');
		}
	}

	cleanup(maxAge: number = 30 * 60 * 1000): void {
		const now = Date.now();
		for (const [key, entry] of this.cache) {
			if (now - entry.timestamp > maxAge) {
				this.cache.delete(key);
			}
		}
	}
}
