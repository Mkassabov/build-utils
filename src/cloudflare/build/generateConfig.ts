import { execSync } from "node:child_process";
import path from "pathe";
import type {
	BindingConfigList,
	CloudflareWorkerConfig,
	GenerateBindingsFromList,
} from "~/cloudflare/workerConfigTypes";

//* we re-export this os the user only needs to import this file
export type {
	UnwrapBindings,
	UnwrapGeneratorBindings,
	CloudflareWorkerConfig,
} from "~/cloudflare/workerConfigTypes";

type InputRoute = {
	pattern: string;
	zone: string;
	customDomain?: boolean;
};

// Compile the regex during the build step and return it as a correctly escaped string
function compileRouteRegex(routes: Array<{ pattern: string }>) {
	const patterns = routes
		.map((route) => {
			const [domain, ...path] = route.pattern.split("/");
			if (path != null && domain != null) {
				const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const escapedPath = path.join("\\/").replace(/[*?]+$/, "");
				return `(https?:\\/\\/${escapedDomain}\\/${escapedPath})`;
			}
			return null;
		})
		.filter(Boolean);
	return patterns.join("|");
}

export function generateConfig<BindingList extends BindingConfigList>(
	name: string,
	main: string,
	routes: Array<InputRoute>,
	bindings: BindingList,
	options: {
		accountId: string;
		outDir: string;
		tsconfig?: string;
		compatibility?: {
			date?: string;
			flags?: Array<string>;
			node?: boolean;
		};
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		placement?: CloudflareWorkerConfig<any>["placement"]["mode"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		workersDev?: CloudflareWorkerConfig<any>["workers_dev"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		triggers?: CloudflareWorkerConfig<any>["triggers"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		limits?: CloudflareWorkerConfig<any>["limits"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		rules?: CloudflareWorkerConfig<any>["rules"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		sendMetrics?: CloudflareWorkerConfig<any>["send_metrics"];
		// biome-ignore lint/suspicious/noExplicitAny: this can't be empty, but we also can't infer here
		logpush?: CloudflareWorkerConfig<any>["logpush"];
	},
) {
	return (isProd = false) => {
		const branch = execSync("git rev-parse --abbrev-ref HEAD")
			.toString()
			.trim();
		const commit = execSync("git rev-parse HEAD").toString().trim();
		const isDirty = execSync("git diff HEAD").toString().length > 0;
		const modifiedRoutes = routes.map((r) => ({
			// biome-ignore lint/style/useNamingConvention: foreign definition
			custom_domain: r.customDomain,
			pattern: isProd
				? r.pattern
				: r.pattern.replace(r.zone, `${branch}.branch.${r.zone}`),
			// biome-ignore lint/style/useNamingConvention: foreign definition
			zone_name: r.zone,
		}));
		const config = {
			name: `${branch}-${name}`
				.replace(/@/g, "")
				.replaceAll("/", "-")
				.toLowerCase(),
			main: path.resolve(
				options.outDir,
				main.replaceAll("\\", "/").replace(/\.ts$/, ".js"),
			),
			$afEntry: main.replaceAll("\\", "/"),
			// biome-ignore lint/style/useNamingConvention: foreign definition
			account_id: options.accountId,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			compatibility_date:
				// biome-ignore lint/style/noNonNullAssertion: iso on new dates always returns an iso string
				options.compatibility?.date ?? new Date().toISOString().split("T")[0]!,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			compatibility_flags: options.compatibility?.flags ?? [],
			// biome-ignore lint/style/useNamingConvention: foreign definition
			workers_dev: options.workersDev ?? false,
			// routes,
			routes: modifiedRoutes,
			tsconfig: options.tsconfig?.replaceAll("\\", "/"),
			triggers: options.triggers,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			no_bundle: true,
			minify: true,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			node_compat: options.compatibility?.node ?? false,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			send_metrics: options.sendMetrics ?? true,
			// biome-ignore lint/style/useNamingConvention: foreign definition
			keep_vars: false,
			logpush: options.logpush ?? false,
			limits: options.limits,
			rules: options.rules,
			//todo upload source maps handling
			// biome-ignore lint/style/useNamingConvention: foreign definition
			upload_source_maps: false,
			placement: { mode: options.placement ?? "smart" },
			$cfBindingsObject:
				undefined as unknown as GenerateBindingsFromList<BindingList>,
			vars: {
				$branch: branch,
				$commit: `${isDirty ? "dirty-" : ""}${commit}`,
				$isProd: isProd,
				$routeParser: compileRouteRegex(modifiedRoutes),
			},
		} satisfies CloudflareWorkerConfig<BindingList> as CloudflareWorkerConfig<BindingList>;

		for (const binding of bindings) {
			if ("binding" in binding && binding.binding === "$deployment") {
				throw new Error(
					"$deployment is a reserved binding name and cannot be used",
				);
			}
			switch (binding.$cfBindingType) {
				case "browser": {
					config.browser = { binding: binding.binding };
					break;
				}
				case "d1Database": {
					if (config.d1_databases === undefined) {
						config.d1_databases = [];
					}
					config.d1_databases.push({
						binding: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						database_name: binding.name,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						database_id: binding.id,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						preview_database_id: binding.previewId,
					});
					break;
				}
				case "durableObject": {
					if (config.durable_objects === undefined) {
						config.durable_objects = { bindings: [] };
					}
					if (config.migrations === undefined) {
						config.migrations = [];
					}
					config.durable_objects.bindings.push({
						name: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						class_name: binding.className,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						script_name: binding.scriptName,
					});
					config.migrations.push(
						...binding.migrations.map((m) => ({
							// biome-ignore lint/style/useNamingConvention: foreign definition
							...(m.newClasses && { new_classes: m.newClasses }),
							// biome-ignore lint/style/useNamingConvention: foreign definition
							...(m.deletedClasses && { deleted_classes: m.deletedClasses }),
							// biome-ignore lint/style/useNamingConvention: foreign definition
							...(m.renamedClasses && { rename_classes: m.renamedClasses }),
							//* see comment in `DurableObjectBinding` definition for why we rename
							tag: `${binding.binding}_${m.tag}`,
						})),
					);
					break;
				}
				case "email": {
					if (config.send_email === undefined) {
						config.send_email = [];
					}
					config.send_email.push({
						name: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						allowed_destination_addresses: binding.allowedDestinations,
					});
					break;
				}
				case "env": {
					// biome-ignore lint/style/noNonNullAssertion: we no its not null because we set it in default
					config.vars![binding.binding] = binding.value;
					break;
				}
				case "hyperdrive": {
					if (config.hyperdrive === undefined) {
						config.hyperdrive = [];
					}
					config.hyperdrive.push({
						binding: binding.binding,
						id: binding.id,
						localConnectionString: binding.localConnectionString,
					});
					break;
				}
				case "kvNamespaces": {
					if (config.kv_namespaces === undefined) {
						config.kv_namespaces = [];
					}
					config.kv_namespaces.push({
						binding: binding.binding,
						id: binding.id,
					});
					break;
				}
				case "QueueProducer": {
					if (config.queues === undefined) {
						config.queues = {};
					}
					if (config.queues.producers === undefined) {
						config.queues.producers = [];
					}
					config.queues.producers.push({
						queue: binding.queue,
						binding: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						delivery_delay: binding.deliveryDelay,
					});
					break;
				}
				case "QueueConsumer": {
					if (config.queues === undefined) {
						config.queues = {};
					}
					if (config.queues.consumers === undefined) {
						config.queues.consumers = [];
					}
					config.queues.consumers.push({
						queue: binding.queue,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						max_batch_size: binding.maxBatchSize,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						max_batch_timeout: binding.maxBatchTimeout,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						max_retries: binding.maxRetries,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						dead_letter_queue: binding.deadLetterQueue,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						max_concurrency: binding.maxConcurrency,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						retry_delay: binding.retryDelay,
					});
					break;
				}
				case "r2Bucket": {
					if (config.r2_buckets === undefined) {
						config.r2_buckets = [];
					}
					config.r2_buckets.push({
						binding: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						bucket_name: binding.bucketName,
						jurisdiction: binding.jurisdiction,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						preview_bucket_name: binding.previewBucketName,
					});
					break;
				}
				case "vectorizeIndex": {
					if (config.vectorize === undefined) {
						config.vectorize = [];
					}
					config.vectorize.push({
						binding: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						index_name: binding.indexName,
					});
					break;
				}
				case "service": {
					if (config.services === undefined) {
						config.services = [];
					}
					config.services.push({
						binding: binding.binding,
						service: binding.service,
						entrypoint: binding.entrypoint,
					});
					break;
				}
				case "analyticsEngine": {
					if (config.analytics_engine_datasets === undefined) {
						config.analytics_engine_datasets = [];
					}
					config.analytics_engine_datasets.push({
						binding: binding.binding,
						dataset: binding.dataset,
					});
					break;
				}
				case "mTLSCert": {
					if (config.mtls_certificates === undefined) {
						config.mtls_certificates = [];
					}
					config.mtls_certificates.push({
						binding: binding.binding,
						// biome-ignore lint/style/useNamingConvention: foreign definition
						certificate_id: binding.certificateId,
					});
					break;
				}
				case "ai": {
					if (config.ai === undefined) {
						config.ai = { binding: binding.binding };
					}
					break;
				}
				case "tail": {
					if (config.tail_consumers === undefined) {
						config.tail_consumers = [];
					}
					config.tail_consumers.push({ service: binding.service });
					break;
				}
				case "rateLimit": {
					if (config.unsafe === undefined) {
						config.unsafe = {};
					}
					if (config.unsafe.bindings === undefined) {
						config.unsafe.bindings = [];
					}
					config.unsafe.bindings.push({
						name: binding.binding,
						type: "ratelimit",
						// biome-ignore lint/style/useNamingConvention: foreign definition
						namespace_id: binding.namespaceId,
						simple: {
							limit: binding.limit,
							period: binding.period,
						},
					});
					break;
				}
				case "workerVersion": {
					if (config.version_metadata === undefined) {
						config.version_metadata = { binding: binding.binding };
					}
					break;
				}
			}
		}

		return config;
	};
}
