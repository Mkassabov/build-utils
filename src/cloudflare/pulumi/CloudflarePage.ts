import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import type { PagesProjectDeploymentConfigsProduction } from "@pulumi/cloudflare/types/input";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

type CloudflareWorkerConfiguration = {
	name: string;
	directory: string;
	configurations?: PagesProjectDeploymentConfigsProduction;
};

interface CloudflarePageOptions extends pulumi.ComponentResourceOptions {
	apiToken?: pulumi.Input<string>;
	nameOverride?: string;
}

interface FileContainer {
	path: string;
	hash: string;
	sizeInBytes: number;
	contentType: string;
}

export class CloudflarePage extends pulumi.ComponentResource {
	constructor(
		cfConfig: CloudflareWorkerConfiguration,
		options?: CloudflarePageOptions,
	) {
		const config = new pulumi.Config();
		const branch = config.require("$branch");
		const name =
			`${branch}-${cfConfig.name.replace(/@/g, "").replaceAll("/", "-")}`.toLowerCase();
		super(
			"pkg:index:CloudflarePagesDeployment",
			options?.nameOverride ?? name,
			{},
			options,
		);
		const accountId = config.require("cloudflare_account_id");
		const apiToken =
			options?.apiToken ?? config.requireSecret("cloudflare_api_token");

		// Create a new Pages project
		const pagesProject = new cloudflare.PagesProject(
			name,
			{
				accountId: accountId,
				name: name,
				productionBranch: branch,
				deploymentConfigs: {
					production: cfConfig.configurations,
				},
				buildConfig: {
					buildCaching: true,
				},
			},
			{
				parent: this,
				provider: new cloudflare.Provider(`${name}-provider`, {
					apiToken: apiToken,
				}),
			},
		);

		// Deploy the project
		this.deployProject(cfConfig.directory, accountId, name, apiToken);

		this.registerOutputs({
			pagesProject: pagesProject,
		});
	}

	private deployProject(
		directory: string,
		accountId: string,
		projectName: string,
		apiToken: pulumi.Output<string>,
	) {
		return pulumi
			.all([accountId, projectName, apiToken])
			.apply(
				async ([resolvedAccountId, resolvedProjectName, resolvedApiToken]) => {
					const fileMap = await this.validateFiles(directory);
					const jwt = await this.getUploadToken(
						resolvedAccountId,
						resolvedProjectName,
						resolvedApiToken,
					);
					await this.uploadFiles(fileMap, jwt);
				},
			);
	}

	private async validateFiles(
		directory: string,
	): Promise<Map<string, FileContainer>> {
		const fileMap = new Map<string, FileContainer>();
		const files = fs.readdirSync(directory);

		for (const file of files) {
			const filePath = path.join(directory, file);
			const stats = fs.statSync(filePath);

			if (stats.isFile()) {
				const content = fs.readFileSync(filePath);
				const hash = crypto.createHash("sha256").update(content).digest("hex");

				fileMap.set(file, {
					path: filePath,
					hash: hash,
					sizeInBytes: stats.size,
					contentType: this.getContentType(file),
				});
			}
		}

		return fileMap;
	}

	private getContentType(filename: string): string {
		// Implement content type detection based on file extension
		// This is a simplified version, you might want to expand it
		const ext = path.extname(filename).toLowerCase();
		switch (ext) {
			case ".html":
				return "text/html";
			case ".css":
				return "text/css";
			case ".js":
				return "application/javascript";
			case ".json":
				return "application/json";
			case ".png":
				return "image/png";
			case ".jpg":
			case ".jpeg":
				return "image/jpeg";
			default:
				return "application/octet-stream";
		}
	}

	private async getUploadToken(
		accountId: string,
		projectName: string,
		apiToken: string,
	): Promise<string> {
		const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/upload-token`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get upload token: ${response.statusText}`);
		}

		const data = await response.json();
		return data.result.jwt;
	}

	private async uploadFiles(fileMap: Map<string, FileContainer>, jwt: string) {
		const url = "https://api.cloudflare.com/client/v4/pages/assets/upload";

		for (const [filename, file] of fileMap) {
			const content = fs.readFileSync(file.path, "base64");

			const payload = {
				files: [
					{
						key: file.hash,
						value: content,
						metadata: {
							contentType: file.contentType,
						},
						base64: true,
					},
				],
			};

			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to upload file ${filename}: ${response.statusText}`,
				);
			}
		}
	}
}
