export interface FileContentsMap {
	[key: string]: string;
}

export interface ReadFilePromiseMap {
	[key: string]: Promise<string>;
}

export interface FileInfo {
	size: number;
	created: Date;
	modified: Date;
	accessed: Date;
	isDirectory: boolean;
	isFile: boolean;
	permissions: string;
}
