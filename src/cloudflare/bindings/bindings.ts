import type {
	AiBinding,
	BrowserBinding,
	EmailBinding,
	EnvBinding,
	JsonValue,
	MTLSCertificateBinding,
	RateLimitBinding,
	WorkerVersionBinding,
} from "~/cloudflare/bindings/types";

export function workerVersion<_Binding extends string>(binding: _Binding) {
	return {
		$cfBindingType: "workerVersion" as const,
		binding,
	} satisfies WorkerVersionBinding;
}

export function browser<_Binding extends string>(binding: _Binding) {
	return {
		$cfBindingType: "browser" as const,
		binding,
	} satisfies BrowserBinding;
}

export function ai<_Binding extends string>(binding: _Binding) {
	return {
		$cfBindingType: "ai" as const,
		binding,
	} satisfies AiBinding;
}

export function mtls<_Binding extends string>(
	binding: _Binding,
	certificateId: string,
) {
	return {
		$cfBindingType: "mTLSCert" as const,
		binding,
		certificateId,
	} satisfies MTLSCertificateBinding;
}

export function rateLimit<_Binding extends string>(
	binding: _Binding,
	options: {
		namespaceId: `${number}`;
		limit: number;
		period: number;
	},
) {
	return {
		$cfBindingType: "rateLimit" as const,
		binding,
		type: "ratelimit",
		namespaceId: options.namespaceId,
		limit: options.limit,
		period: options.period,
	} satisfies RateLimitBinding;
}

export function env<_Binding extends string, _Value extends JsonValue>(
	binding: _Binding,
	value: _Value,
) {
	return {
		$cfBindingType: "env" as const,
		binding,
		value: value as _Value,
	} satisfies EnvBinding;
}

export function email<_Binding extends string>(
	binding: _Binding,
	option: {
		allowedDestinations: Array<string>;
	},
) {
	return {
		$cfBindingType: "email",
		binding,
		allowedDestinations: option.allowedDestinations,
	} satisfies EmailBinding;
}
