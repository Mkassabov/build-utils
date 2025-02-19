import type { Rpc } from "@cloudflare/workers-types";

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| { [x: string]: JsonValue }
	| Array<JsonValue>;

export type BrowserBinding = {
	$cfBindingType: "browser";
	binding: string;
};
export type D1DatabaseBinding = {
	$cfBindingType: "d1Database";
	binding: string;
	name: string;
	id: string;
	previewId?: string;
};
export type DurableObjectBinding<
	_Class extends Rpc.DurableObjectBranded | undefined = undefined,
> = {
	$cfBindingType: "durableObject";
	$cfBindingDetails: _Class;
	binding: string;
	className: string;
	//todo find a way to only allow this via importing your other worker?
	//todo worth investigating if foreign defined DOs need migrations in every worker or just in the defining worker
	scriptName?: string;
	//todo migrations are technically global across all objects in a worker but this forces us to treat them as local to an object
	//todo investigate if thats a problem. We prefix tag names when building the config in `generateConfig` in order to account for this
	migrations: Array<{
		tag: string;
		newClasses?: Array<string>;
		deletedClasses?: Array<string>;
		renamedClasses?: Array<{
			from: string;
			to: string;
		}>;
	}>;
};
export type EmailBinding = {
	$cfBindingType: "email";
	binding: string;
	allowedDestinations: Array<string>;
};
export type EnvBinding = {
	$cfBindingType: "env";
	binding: string;
	value: JsonValue;
};
export type HyperDriveBinding = {
	$cfBindingType: "hyperdrive";
	binding: string;
	id: string;
	localConnectionString: string;
};
// biome-ignore lint/style/useNamingConvention: this is correct KV should both be uppercase
export type KVNamespaceBinding = {
	$cfBindingType: "kvNamespaces";
	binding: string;
	id: string;
	previewId?: string;
};
export type QueueProducerBinding<_Body = unknown> = {
	$cfBindingType: "QueueProducer";
	$cfBindingDetails: _Body;
	queue: string;
	binding: string;
	deliveryDelay?: number;
};
export type QueueConsumerBinding = {
	$cfBindingType: "QueueConsumer";
	queue: string;
	maxBatchSize?: number;
	maxBatchTimeout?: number;
	maxRetries?: number;
	deadLetterQueue?: string;
	maxConcurrency?: number;
	retryDelay?: number;
};
export type R2Binding = {
	$cfBindingType: "r2Bucket";
	binding: string;
	bucketName: string;
	jurisdiction?: string;
	previewBucketName?: string;
};
export type VectorizeIndexBinding = {
	$cfBindingType: "vectorizeIndex";
	binding: string;
	indexName: string;
};
export type ServiceBinding<
	_Class extends Rpc.WorkerEntrypointBranded | undefined = undefined,
> = {
	$cfBindingType: "service";
	$cfBindingDetails: _Class;
	binding: string;
	service: string;
	entrypoint?: string;
};
export type AnalyticsEngineBinding = {
	$cfBindingType: "analyticsEngine";
	binding: string;
	dataset: string;
};
// biome-ignore lint/style/useNamingConvention: this is correct mTLS should be uppercase
export type MTLSCertificateBinding = {
	$cfBindingType: "mTLSCert";
	binding: string;
	certificateId: string;
};
export type AiBinding = {
	$cfBindingType: "ai";
	binding: string;
};
export type TailConsumerBinding = {
	$cfBindingType: "tail";
	service: string;
};
export type RateLimitBinding = {
	$cfBindingType: "rateLimit";
	binding: string;
	type: "ratelimit";
	namespaceId: `${number}`;
	limit: number;
	period: number;
};
export type WorkerVersionBinding = {
	$cfBindingType: "workerVersion";
	binding: string;
};
