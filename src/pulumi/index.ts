import { CloudflarePage } from "~/cloudflare/pulumi/CloudflarePage";
import { CloudflareWorker } from "~/cloudflare/pulumi/CloudflareWorker";

export const fund228 = {
	cloudflare: {
		// biome-ignore lint/style/useNamingConvention: intentional choice
		Worker: CloudflareWorker,
		// biome-ignore lint/style/useNamingConvention: intentional choice
		Page: CloudflarePage,
	},
};

export default fund228;
