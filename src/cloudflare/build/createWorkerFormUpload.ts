import { basename } from "pathe";
import { FormData } from "undici";
import type { CloudflareWorkerConfig } from "~/configTypes";

export async function createWorkerFormUpload(
	config: CloudflareWorkerConfig,
	content: string,
) {
	const formData = new FormData();
	const metadataBindings = [];

	if (config.vars != null) {
		for (const [key, value] of Object.entries(config.vars)) {
			if (typeof value === "string") {
				metadataBindings.push({ name: key, type: "plain_text", text: value });
			} else {
				metadataBindings.push({ name: key, type: "json", json: value });
			}
		}
	}

	if (config.kv_namespaces != null) {
		for (const { id, binding } of config.kv_namespaces) {
			metadataBindings.push({
				name: binding,
				type: "kv_namespace",
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				namespace_id: id,
			});
		}
	}

	if (config.send_email != null) {
		for (const { name, allowed_destination_addresses } of config.send_email) {
			metadataBindings.push({
				name,
				type: "send_email",
				allowed_destination_addresses,
			});
		}
	}

	if (config.durable_objects?.bindings) {
		for (const { name, class_name, script_name, environment } of config
			.durable_objects.bindings) {
			metadataBindings.push({
				name,
				type: "durable_object_namespace",
				class_name,
				...(script_name && { script_name }),
				...(environment && { environment }),
			});
		}
	}

	//todo support delivery_delay
	//todo support queue consumers
	if (config.queues != null && config.queues.producers != null) {
		for (const { binding, queue } of config.queues.producers) {
			metadataBindings.push({
				name: binding,
				type: "queue",
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				queue_name: queue,
			});
		}
	}

	if (config.r2_buckets != null) {
		for (const { binding, bucket_name, jurisdiction } of config.r2_buckets) {
			metadataBindings.push({
				name: binding,
				type: "r2_bucket",
				bucket_name,
				jurisdiction,
			});
		}
	}

	if (config.d1_databases != null) {
		for (const { binding, database_id } of config.d1_databases) {
			metadataBindings.push({
				name: binding,
				type: "d1",
				id: database_id,
			});
		}
	}

	if (config.vectorize != null) {
		for (const { binding, index_name } of config.vectorize) {
			metadataBindings.push({
				name: binding,
				type: "vectorize",
				index_name,
			});
		}
	}

	if (config.services != null) {
		for (const { binding, service, entrypoint } of config.services) {
			metadataBindings.push({
				name: binding,
				type: "service",
				service,
				...(entrypoint && { entrypoint }),
			});
		}
	}

	if (config.analytics_engine_datasets != null) {
		for (const { binding, dataset } of config.analytics_engine_datasets) {
			metadataBindings.push({
				name: binding,
				type: "analytics_engine",
				dataset,
			});
		}
	}

	if (config.mtls_certificates != null) {
		for (const { binding, certificate_id } of config.mtls_certificates) {
			metadataBindings.push({
				name: binding,
				type: "mtls_certificate",
				certificate_id,
			});
		}
	}

	if (config.browser != null) {
		metadataBindings.push({
			name: config.browser.binding,
			type: "browser",
		});
	}

	if (config.ai != null) {
		metadataBindings.push({
			name: config.ai.binding,
			type: "ai",
		});
	}

	if (config.version_metadata != null) {
		metadataBindings.push({
			name: config.version_metadata.binding,
			type: "version_metadata",
		});
	}

	if (config.unsafe?.bindings) {
		for (const { name, type, ...rest } of config.unsafe.bindings) {
			switch (type) {
				case "ratelimit": {
					metadataBindings.push({
						name,
						type: "ratelimit",
						// biome-ignore lint/style/useNamingConvention: Foreign definition
						namespace_id: rest.namespace_id,
						simple: rest.simple,
					});
					break;
				}
			}
		}
	}

	let migrations:
		| undefined
		| {
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				new_tag: string;
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				old_tag?: string;
				steps: {
					// biome-ignore lint/style/useNamingConvention: Foreign definition
					new_classes?: string[];
					// biome-ignore lint/style/useNamingConvention: Foreign definition
					renamed_classes?: { from: string; to: string }[];
					// biome-ignore lint/style/useNamingConvention: Foreign definition
					deleted_classes?: string[];
				}[];
		  } = undefined;
	if (config.migrations && config.migrations.length !== 0) {
		// biome-ignore lint/style/noNonNullAssertion: we check migration length so this is fine
		const newTag = config.migrations[config.migrations.length - 1]!.tag;
		const oldTag: undefined | string = undefined as undefined | string;
		if (oldTag !== newTag) {
			const oldTagIndex =
				oldTag != null
					? config.migrations.findIndex((m) => m.tag === oldTag)
					: undefined;
			migrations = {
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				new_tag: newTag,
				// biome-ignore lint/style/useNamingConvention: Foreign definition
				...(oldTag && { old_tag: oldTag }),
				steps:
					oldTagIndex != null && oldTagIndex !== -1
						? config.migrations
								.splice(oldTagIndex + 1)
								.map(({ tag: _tag, ...rest }) => rest)
						: config.migrations,
			};
		}
	}

	const mainModule = basename(config.main);

	const metadata = {
		// biome-ignore lint/style/useNamingConvention: Foreign definition
		main_module: mainModule,
		bindings: metadataBindings,
		// biome-ignore lint/style/useNamingConvention: Foreign definition
		compatibility_date: config.compatibility_date,
		// biome-ignore lint/style/useNamingConvention: Foreign definition
		compatibility_flags: config.compatibility_flags,
		...(migrations && { migrations }),
		logpush: config.logpush,
		placement: config.placement,
		// biome-ignore lint/style/useNamingConvention: Foreign definition
		tail_consumers: config.tail_consumers,
	};

	formData.set("metadata", JSON.stringify(metadata));
	formData.set(
		mainModule,
		new File([content], mainModule, {
			type: "application/javascript+module",
		}),
	);

	return formData;
}
