export type DependencyNodeId = number;

export interface DependencyTree {
	[key: string]: DependencyTree | object;
}

export interface DependencyNode {
	id: DependencyNodeId;
	filePath: string;
	parents: DependencyNodeId[];
	content: string;
}
