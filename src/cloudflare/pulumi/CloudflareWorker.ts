import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as pulumi from "@pulumi/pulumi";
import type * as provider from "@pulumi/pulumi/provider";
import { createWorkerFormUpload } from "~/cloudflare/build/createWorkerFormUpload";
import type { CloudflareWorkerConfig } from "~/cloudflare/workerConfigTypes";

export type CloudflareWorkerOptions = pulumi.CustomResourceOptions & {
	apiToken?: pulumi.Input<string>;
	nameOverride?: string;
};

export type CloudflareWorkerProviderInputs = CloudflareWorkerConfig & {
	apiToken?: pulumi.Input<string>;
	content: string;
	sha: string;
};

export type CloudflareWorkerProviderOutputs = CloudflareWorkerProviderInputs & {
	sha: string;
};

function calculateSha(script: string): string {
	return crypto.createHash("sha256").update(script).digest("hex");
}

const CloudflareWorkerProvider: pulumi.dynamic.ResourceProvider = {
	async check(
		olds: CloudflareWorkerProviderOutputs,
		news: CloudflareWorkerProviderInputs,
	): Promise<provider.CheckResult> {
		if (
			news.migrations != null &&
			olds.migrations != null &&
			news.migrations.length > olds.migrations.length &&
			!news.migrations.every((m) =>
				olds.migrations?.some((o) => o.tag === m.tag),
			)
		) {
			return {
				inputs: news,
				failures: [
					{
						property: "migrations",
						reason: "old migrations must not be removed",
					},
				],
			};
		}

		return {
			inputs: news,
		};
	},

	// biome-ignore lint/suspicious/useAwait: needs to be async for pulumi to be happy
	async diff(
		_id: string,
		olds: CloudflareWorkerProviderOutputs,
		news: CloudflareWorkerProviderInputs,
	): Promise<provider.DiffResult> {
		const {
			sha: oldSha,
			tsconfig: _tsconfig,
			main: _main,
			...restOldConfig
		} = olds;
		const { tsconfig, main, sha, ...restNewConfig } = news;
		if (
			JSON.stringify(restOldConfig) === JSON.stringify(restNewConfig) &&
			oldSha === sha
		) {
			return {
				changes: false,
			};
		}

		return {
			changes: true,
		};
	},

	async create(
		inputs: CloudflareWorkerProviderInputs,
	): Promise<provider.CreateResult> {
		const { content, sha, ...rawInputs } = inputs;
		const workerFormData = await createWorkerFormUpload(rawInputs, content);
		const name = inputs.name.replace(/\@/g, "").replace(/\//g, "-");
		const workerRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${inputs.account_id}/workers/scripts/${name}`,
			{
				method: "PUT",
				body: workerFormData,
				headers: {
					// biome-ignore lint/style/useNamingConvention: foreign definition //todo see if cloudflare will take `authorization` instead of `Authorization`
					Authorization: `Bearer ${inputs.apiToken}`,
				},
			},
		);
		if (!workerRes.ok) {
			throw new Error(
				`Failed to create worker: ${await workerRes
					.text()
					.catch(() => "unknown error")}`,
			);
		}

		const routes = JSON.stringify(
			inputs.routes.map((r) => (typeof r === "string" ? { pattern: r } : r)),
		);
		//todo these should be there own pulumi resources probably directly from cloudflare tbh
		const routeRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${inputs.account_id}/workers/scripts/${name}/routes`,
			{
				method: "PUT",
				body: routes,
				headers: {
					// biome-ignore lint/style/useNamingConvention: foreign definition
					Authorization: `Bearer ${inputs.apiToken}`,
					"Content-Type": "application/json",
				},
			},
		);
		if (!routeRes.ok) {
			throw new Error(
				`Failed to create worker router: ${await routeRes
					.text()
					.catch(() => "unknown error")}`,
			);
		}

		// const sha = calculateSha(script);
		return {
			id: inputs.name,
			outs: { ...rawInputs, sha },
		};
	},

	async update(
		_id: string,
		_olds: CloudflareWorkerProviderOutputs,
		news: CloudflareWorkerProviderInputs,
	): Promise<provider.UpdateResult> {
		//todo for now this is the same as create, long term we should make some changes
		//todo - support changing cf account ids
		//todo - support updating just the file content
		//todo - support updating just the config
		//todo - support updating just the routes
		//todo - once queues consumers are supported, support dynamically updating those to
		const accountId = news.account_id;

		//1. put /accounts/{accountId}/workers/scripts/{scriptName}
		const workerFormData = await createWorkerFormUpload(news, news.content);
		const workerRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${news.name}`,
			{
				method: "PUT",
				body: workerFormData,
				headers: {
					// biome-ignore lint/style/useNamingConvention: foreign definition
					Authorization: `Bearer ${news.apiToken}`,
				},
			},
		);
		if (!workerRes.ok) {
			throw new Error(
				`Failed to create worker: ${await workerRes
					.text()
					.then((t) => console.log(t))
					.catch(() => "unknown error")}`,
			);
		}
		//2. put /accounts/{accountId}/workers/scripts/{scriptName}/routes
		const routes = JSON.stringify(
			news.routes
				.filter((r) => !r.custom_domain)
				.map((r) => (typeof r === "string" ? { pattern: r } : r)),
		);
		const routeRes = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${news.name}/routes`,
			{
				method: "PUT",
				body: routes,
				headers: {
					// biome-ignore lint/style/useNamingConvention: foreign definition
					Authorization: `Bearer ${news.apiToken}`,
					"Content-Type": "application/json",
				},
			},
		);
		if (!routeRes.ok) {
			throw new Error(
				`Failed to create worker router: ${await routeRes
					.text()
					.catch(() => "unknown error")}`,
			);
		}

		//3. post /accounts/{account_id}/queues/{queue_id}/consumers todo we aren't
		//todo gonna handle queue consumers until we fully handle
		//todo queues so for the generic worker one we dont need it

		return {
			outs: news as CloudflareWorkerProviderOutputs,
		};
	},
};

export class CloudflareWorker extends pulumi.dynamic.Resource {
	constructor(
		cfConfig: CloudflareWorkerConfig,
		options: CloudflareWorkerOptions = {},
	) {
		//todo see if there is a way for the entire content not to be listed as an input
		const config = new pulumi.Config();
		const content = fs.readFileSync(cfConfig.main, "utf-8");
		const sha = calculateSha(content);
		const apiToken =
			options.apiToken ?? config.requireSecret("cloudflare_api_token");
		super(
			CloudflareWorkerProvider,
			options.nameOverride ?? cfConfig.name,
			{
				...cfConfig,
				sha,
				content,
				apiToken,
			},
			options,
		);
	}
}
