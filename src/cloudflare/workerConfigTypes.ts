import type { DurableObjectNamespace, Rpc } from "@cloudflare/workers-types";
import type {
	CfRuntimeAi,
	CfRuntimeAnalyticsEngine,
	CfRuntimeBrowser,
	CfRuntimeD1Db,
	CfRuntimeHyperDrive,
	CfRuntimeKv,
	CfRuntimeMtlsCert,
	CfRuntimeQueue,
	CfRuntimeRatelimit,
	CfRuntimeService,
	CfRuntimeVectorize,
	CfRuntimeWorkerVersionMetadata,
	CfRuntineR2Bucket,
} from "~/cloudflare/bindings/runtimeTypes";
import type {
	AiBinding,
	AnalyticsEngineBinding,
	BrowserBinding,
	D1DatabaseBinding,
	DurableObjectBinding,
	EmailBinding,
	EnvBinding,
	HyperDriveBinding,
	JsonValue,
	KVNamespaceBinding,
	MTLSCertificateBinding,
	QueueConsumerBinding,
	QueueProducerBinding,
	R2Binding,
	RateLimitBinding,
	ServiceBinding,
	TailConsumerBinding,
	VectorizeIndexBinding,
	WorkerVersionBinding,
} from "~/cloudflare/bindings/types";

export type CfWorkerEntrypoint = Rpc.WorkerEntrypointBranded;
export type CfDurableObject = Rpc.DurableObjectBranded;

// export const cfBindingsObject = "$cfBindingsObject" as const;
// export const cfBindingType = "$cfBindingType" as const;
// export const cfBindingDetails = "$cfBindingDetails" as const;

export type BindingConfigList = Readonly<
	Array<
		| BrowserBinding
		| D1DatabaseBinding
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		| DurableObjectBinding<any>
		| EmailBinding
		| HyperDriveBinding
		| KVNamespaceBinding
		| QueueProducerBinding
		| QueueConsumerBinding
		| R2Binding
		| VectorizeIndexBinding
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		| ServiceBinding<any>
		| AnalyticsEngineBinding
		| MTLSCertificateBinding
		| AiBinding
		| TailConsumerBinding
		| RateLimitBinding
		| EnvBinding
		| WorkerVersionBinding
	>
>;

export type GenerateBindingsFromList<_BindingList extends BindingConfigList> =
	Readonly<{
		[_BindingDetails in _BindingList[number] as _BindingDetails extends {
			binding: infer _BindingKey;
		}
			? _BindingKey
			: never]: _BindingDetails extends WorkerVersionBinding
			? CfRuntimeWorkerVersionMetadata
			: _BindingDetails extends BrowserBinding
				? CfRuntimeBrowser
				: _BindingDetails extends D1DatabaseBinding
					? CfRuntimeD1Db
					: // biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
						_BindingDetails extends ServiceBinding<any>
						? CfRuntimeService<_BindingDetails["$cfBindingDetails"]>
						: // biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
							_BindingDetails extends DurableObjectBinding<any>
							? DurableObjectNamespace<_BindingDetails["$cfBindingDetails"]>
							: _BindingDetails extends HyperDriveBinding
								? CfRuntimeHyperDrive
								: _BindingDetails extends KVNamespaceBinding
									? CfRuntimeKv
									: _BindingDetails extends QueueProducerBinding
										? CfRuntimeQueue<_BindingDetails["$cfBindingDetails"]>
										: _BindingDetails extends R2Binding
											? CfRuntineR2Bucket
											: _BindingDetails extends VectorizeIndexBinding
												? CfRuntimeVectorize
												: _BindingDetails extends AnalyticsEngineBinding
													? CfRuntimeAnalyticsEngine
													: _BindingDetails extends MTLSCertificateBinding
														? CfRuntimeMtlsCert
														: _BindingDetails extends AiBinding
															? CfRuntimeAi
															: _BindingDetails extends RateLimitBinding
																? CfRuntimeRatelimit
																: _BindingDetails extends EnvBinding
																	? _BindingDetails["value"]
																	: never;
	}>;

export type Route = {
	pattern: string;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	zone_name: string;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	custom_domain?: boolean;
};

export type DefaultVars = {
	$branch: string;
	$commit: string;
	$isProd: boolean;
	$routeParser: string;
};

type DefaultVarsBindingList = {
	[P in keyof DefaultVars]: [
		{
			$cfBindingType: "env";
			binding: P;
			value: DefaultVars[P];
		},
	];
}[keyof DefaultVars];

export type CloudflareWorkerConfig<
	// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
	BindingList extends BindingConfigList = any,
> = {
	$cfBindingsObject: GenerateBindingsFromList<
		BindingList | DefaultVarsBindingList
	>;
	$afEntry?: string;
	name: string;
	main: string;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	compatibility_date: string;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	account_id: string;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	compatibility_flags: Array<string>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	workers_dev: boolean;
	routes: Array<Route>;
	tsconfig?: string;
	triggers?: {
		crons?: Array<string>;
	};
	// biome-ignore lint/style/useNamingConvention: foreign definition
	no_bundle: true; //* not needed; bundling happens in the build step
	minify: true; //* not needed; minification happens in the build step
	// biome-ignore lint/style/useNamingConvention: foreign definition
	node_compat: boolean;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	preserve_file_names?: boolean;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	send_metrics: boolean;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	keep_vars: false; //* source of truth is the build file, NOT cloudflare or the wrangler toml
	logpush: boolean;
	limits?: {
		maxCpuMs: number;
	};
	placement: { mode: "off" | "smart" };
	// biome-ignore lint/style/useNamingConvention: foreign definition
	tail_consumers?: Array<{ service: string }>;
	browser?: { binding: string };
	// biome-ignore lint/style/useNamingConvention: foreign definition
	d1_databases?: Array<{
		binding: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		database_name: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		database_id: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		preview_database_id?: string;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	durable_objects?: {
		bindings: Array<{
			name: string;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			class_name: string;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			script_name?: string;
			environment?: string;
		}>;
	};
	migrations?: Array<{
		tag: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		new_classes?: Array<string>;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		deleted_classes?: Array<string>;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		renamed_classes?: Array<{ from: string; to: string }>;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	send_email?: Array<{
		name: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		allowed_destination_addresses: Array<string>;
	}>;
	vars?: DefaultVars & Record<string, JsonValue>;
	//todo hyperdrive requires node compat
	hyperdrive?: Array<{
		binding: string;
		id: string;
		localConnectionString: string;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	kv_namespaces?: Array<{ binding: string; id: string }>;
	queues?: {
		producers?: Array<{
			binding: string;
			queue: string;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			delivery_delay?: number;
		}>;
		consumers?: Array<{
			queue: string;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			max_batch_size?: number;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			max_batch_timeout?: number;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			max_retries?: number;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			dead_letter_queue?: string;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			max_concurrency?: number;
			// biome-ignore lint/style/useNamingConvention: foreign definition
			retry_delay?: number;
		}>;
	};
	// biome-ignore lint/style/useNamingConvention: foreign definition
	r2_buckets?: Array<{
		binding: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		bucket_name: string;
		jurisdiction?: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		preview_bucket_name?: string;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	vectorize?: Array<{ binding: string; index_name: string }>;
	services?: Array<{
		binding: string;
		service: string;
		entrypoint?: string;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	analytics_engine_datasets?: Array<{
		binding: string;
		dataset?: string;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	mtls_certificates?: Array<{
		binding: string;
		// biome-ignore lint/style/useNamingConvention: foreign definition
		certificate_id: string;
	}>;
	ai?: { binding: string };
	rules?: Array<{
		type: "ESModule" | "CommonJS" | "CompiledWasm" | "Text" | "Data";
		globs: Array<string>;
		fallthrough?: boolean;
	}>;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	upload_source_maps: boolean;
	// biome-ignore lint/style/useNamingConvention: foreign definition
	version_metadata?: { binding: string };
	unsafe?: {
		bindings?: Array<{
			name: string;
			type: "ratelimit";
			// biome-ignore lint/style/useNamingConvention: foreign definition
			namespace_id: `${number}`;
			simple: {
				limit: number;
				period: number;
			};
		}>;
	};
};

export type UnwrapBindings<_Config extends CloudflareWorkerConfig> =
	_Config["$cfBindingsObject"];

export type UnwrapGeneratorBindings<T extends () => CloudflareWorkerConfig> =
	UnwrapBindings<ReturnType<T>>;
