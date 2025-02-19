import type {
	AnalyticsEngineDataset,
	D1Database,
	DurableObjectNamespace,
	Fetcher,
	Hyperdrive,
	KVNamespace,
	Queue,
	R2Bucket,
	Service,
	VectorizeIndex,
	WorkerVersionMetadata,
} from "@cloudflare/workers-types";
import type {
	CfDurableObject,
	CfWorkerEntrypoint,
} from "~/cloudflare/workerConfigTypes";

export type CfRuntimeWorkerVersionMetadata = WorkerVersionMetadata;
export type CfRuntimeBrowser = Fetcher;
export type CfRuntimeD1Db = D1Database;
export type CfRuntimeService<_Class extends CfWorkerEntrypoint | undefined> =
	Service<_Class>;
export type CfRuntimeDurableObject<
	_Class extends CfDurableObject | undefined = undefined,
> = DurableObjectNamespace<_Class>;
export type CfRuntimeHyperDrive = Hyperdrive;
export type CfRuntimeKv = KVNamespace;
export type CfRuntimeQueue<_Body = unknown> = Queue<_Body>;
export type CfRuntineR2Bucket = R2Bucket;
export type CfRuntimeVectorize = VectorizeIndex;
export type CfRuntimeAnalyticsEngine = AnalyticsEngineDataset;
export type CfRuntimeMtlsCert = Fetcher;
export type CfRuntimeAi = {
	run: (
		model: string,
		options: { prompt: string; stream?: boolean },
	) => Promise<string>;
};
export type CfRuntimeRatelimit = {
	limit: (options: { key: string }) => Promise<{ success: boolean }>;
};
