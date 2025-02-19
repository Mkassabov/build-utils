import type {
	AnalyticsEngineBinding,
	D1DatabaseBinding,
	DurableObjectBinding,
	HyperDriveBinding,
	KVNamespaceBinding,
	QueueConsumerBinding,
	QueueProducerBinding,
	R2Binding,
	ServiceBinding,
	TailConsumerBinding,
	VectorizeIndexBinding,
} from "~/cloudflare/bindings/types";
import type { CfWorkerEntrypoint } from "~/cloudflare/workerConfigTypes";
import type { CfDurableObject } from "~/cloudflare/workerConfigTypes";

export function durableObject<
	_Class extends CfDurableObject | undefined,
>(options: {
	class: string;
	script?: string;
	migrations: DurableObjectBinding<_Class>["migrations"];
}) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "durableObject" as const,
			$cfBindingDetails: undefined as unknown as _Class,
			binding,
			className: options.class,
			scriptName: options.script,
			//todo figure out if all the migrations are needed in every worker or only in the host
			migrations: options.migrations,
		} satisfies DurableObjectBinding<_Class>;
	};
}

export function tailConsumer(service: string) {
	return () => {
		return {
			$cfBindingType: "tail",
			service: service,
		} satisfies TailConsumerBinding;
	};
}

export function service<
	_Class extends CfWorkerEntrypoint | undefined,
>(options: {
	service: string;
	entrypoint?: string;
}) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "service" as const,
			$cfBindingDetails: undefined as unknown as _Class,
			binding,
			service: options.service,
			...(options.entrypoint && {
				entrypoint: options?.entrypoint,
			}),
		} satisfies ServiceBinding<_Class>;
	};
}

export function d1(options: { name: string; id: string; previewId?: string }) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "d1Database" as const,
			binding,
			name: options.name,
			id: options.id,
			previewId: options.previewId,
		} satisfies D1DatabaseBinding;
	};
}

export function hyperdrive(options: {
	id: string;
	localConnectionString: string;
}) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "hyperdrive" as const,
			binding,
			id: options.id,
			localConnectionString: options.localConnectionString,
		} satisfies HyperDriveBinding;
	};
}

export function kv(options: {
	id: string;
	previewId?: string;
}) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "kvNamespaces" as const,
			binding,
			id: options.id,
			previewId: options.previewId,
		} satisfies KVNamespaceBinding;
	};
}

export function queue<_Body = unknown>(
	queue: string,
	consumerOptions?: {
		maxBatchSize?: number;
		maxBatchTimeout?: number;
		maxRetries?: number;
		deadLetterQueue?: string;
		maxConcurrency?: number;
		retryDelay?: number;
	},
) {
	return {
		producer: <_Binding extends string>(
			binding: _Binding,
			options?: {
				deliveryDelay?: number;
			},
		) => {
			return {
				$cfBindingType: "QueueProducer" as const,
				$cfBindingDetails: undefined as unknown as _Body,
				queue,
				binding,
				deliveryDelay: options?.deliveryDelay,
			} satisfies QueueProducerBinding<_Body>;
		},
		consumer: {
			$cfBindingType: "QueueConsumer" as const,
			queue,
			maxBatchSize: consumerOptions?.maxBatchSize,
			maxBatchTimeout: consumerOptions?.maxBatchTimeout,
			maxRetries: consumerOptions?.maxRetries,
			deadLetterQueue: consumerOptions?.deadLetterQueue,
			maxConcurrency: consumerOptions?.maxConcurrency,
			retryDelay: consumerOptions?.retryDelay,
		} satisfies QueueConsumerBinding,
	};
}

export function r2Bucket(options: {
	bucketName: string;
	jurisdiction?: string;
	previewBucketName?: string;
}) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "r2Bucket" as const,
			binding,
			bucketName: options.bucketName,
			jurisdiction: options.jurisdiction,
			previewBucketName: options.previewBucketName,
		} satisfies R2Binding;
	};
}

export function vectorizeIndex(indexName: string) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "vectorizeIndex" as const,
			binding,
			indexName,
		} satisfies VectorizeIndexBinding;
	};
}

export function analyticsEngine(dataset: string) {
	return <_Binding extends string>(binding: _Binding) => {
		return {
			$cfBindingType: "analyticsEngine" as const,
			binding,
			dataset,
		} satisfies AnalyticsEngineBinding;
	};
}
