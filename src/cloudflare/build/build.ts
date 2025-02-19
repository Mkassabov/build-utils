import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { build as afBuild } from "@aerofoil/build-tools";
import {
	clearOldOutput,
	jsonImportAssertion,
	runAfterFirstBuildPlugin,
	timing,
	timingWatch,
	typeGeneration,
} from "@aerofoil/build-tools/plugins";
import { type NonNullableJsonValue, jsonToToml } from "@aerofoil/json-to-toml";
import { TerminalServer } from "@aerofoil/logger/terminals/server";
import {
	type BuildOptions,
	type Plugin,
	context,
	build as esBuild,
} from "esbuild";
import path from "pathe";
import type { CloudflareWorkerConfig } from "~/cloudflare/workerConfigTypes";
const logger = new TerminalServer();

function smartRouter(
	config: CloudflareWorkerConfig,
	outDir: string,
	useLocal?: string,
) {
	return {
		name: "@228-fund/cloudflare-builder:smart-route",
		setup(build) {
			build.onEnd(async () => {
				const route =
					useLocal ??
					config.routes[0]?.pattern.replace(/[/*?]+$/, "") ??
					`${config.name}.workers.dev`;
				await fs.writeFile(
					path.resolve(outDir, "routes.js"),
					`export default "${route}";`,
				);
				await fs.writeFile(
					path.resolve(outDir, "routes.d.ts"),
					`declare const _default: "${route}";\nexport default _default;`,
				);
			});
		},
	} satisfies Plugin;
}

const ROOT_ESBUILD_OPTIONS = {
	bundle: true,
	minify: true,
	format: "esm",
	target: "esnext",
	legalComments: "none",
	plugins: [],
	mainFields: ["module", "main"],
	platform: "browser",
	external: ["cloudflare:workers"],
} satisfies BuildOptions;

export async function build<T extends CloudflareWorkerConfig>(options: {
	config: T;
	rootDir: string;
	configPath?: string;
	wranglerOptions?: Record<string, string>;
	outDir?: string;
	entryPoints?: string[];
	esBuildOptions?: Omit<BuildOptions, "plugins">;
	esBuildPlugins?: (
		plugins: NonNullable<BuildOptions["plugins"]>,
	) => NonNullable<BuildOptions["plugins"]>;
	watchTimeThresholds?: readonly [number, number];
}) {
	const start = process.argv.includes("--start");
	const watch = process.argv.includes("--watch");

	const outDir = path.resolve(options.rootDir, options.outDir ?? "./dist");
	const pathToWranglerToml = path.resolve(outDir, "wrangler.toml");
	const generatePlugins = options?.esBuildPlugins ?? ((plugins) => plugins);

	const entrypoints =
		options.entryPoints ??
		(options.config.$afEntry
			? [path.resolve(options.rootDir, options.config.$afEntry)]
			: [options.config.main]);

	if (watch) {
		const ctx = await context({
			entryPoints: entrypoints,
			outfile: options.config.main,
			tsconfig: options.config.tsconfig,
			...ROOT_ESBUILD_OPTIONS,
			...options?.esBuildOptions,
			plugins: generatePlugins([
				...ROOT_ESBUILD_OPTIONS.plugins,
				{
					name: "cf-worker:remove-wrangler-bar",
					setup(build) {
						let isFirstBuild = true;
						build.onStart(() => {
							if (isFirstBuild) {
								isFirstBuild = false;
							} else {
								//* the wrangler bar is 3 lines, so we remove it here
								process.stdout.write("\x1B[3F");
								process.stdout.write("\x1B[0J");
							}
						});
					},
				},
				smartRouter(
					options.config,
					outDir,
					`localhost:${options?.wranglerOptions?.port ?? "8787"}`,
				),
				{
					name: "cf-worker:generate-toml",
					setup(build) {
						let isFirstBuild = true;
						build.onEnd(() => {
							if (isFirstBuild) {
								isFirstBuild = false;
								const {
									$cfBindingsObject: bindings,
									tsconfig,
									...restConfig
								} = options.config;
								restConfig.$afEntry = undefined;
								if (restConfig.vars?.$routeParser != null) {
									restConfig.vars.$routeParser =
										restConfig.vars.$routeParser.replace(/\\/g, "\\\\");
								}
								const toml = jsonToToml(
									restConfig as Record<string, NonNullableJsonValue>,
								);
								fs.writeFile(pathToWranglerToml, toml);
							}
						});
					},
				},
				runAfterFirstBuildPlugin(() => {
					if (start) {
						const commandOptions = Object.entries(
							options.wranglerOptions ?? {},
						).flatMap(([key, value]) => {
							return [`--${key}`, value ?? ""];
						});

						const wrangler = spawn(
							"npx wrangler",
							["dev", "--config", pathToWranglerToml, ...commandOptions],
							{ stdio: "inherit", shell: true },
						);

						process.on("SIGINT", () => {
							wrangler?.kill();
						});
						process.on("SIGTERM", () => {
							wrangler?.kill();
						});
					}
				}),
				timingWatch({ name: "Bundle", logger }),
				{
					name: "cf-worker:wrangler-spacer",
					setup(build) {
						let isFirstBuild = true;
						build.onEnd(() => {
							if (isFirstBuild) {
								isFirstBuild = false;
							} else {
								//* we add 3 clear lines so that wrangler doesn't wipe our logs thinking it's the wrangler bar
								process.stdout.write("\n\n\n");
							}
						});
					},
				},
			]),
		});
		await ctx.watch();
	} else {
		const configPath = path.resolve(
			options.rootDir,
			options.configPath ?? "./config.ts",
		);
		await afBuild([configPath], options.rootDir, {
			esBuildPlugins: () => [
				clearOldOutput(outDir),
				jsonImportAssertion(),
				typeGeneration({
					rootPath: options.rootDir,
					tsConfigPath: path.resolve(options.rootDir, "./tsconfig.json"),
					outDir,
					entrypoints: [configPath],
				}),
				{
					name: "@228-fund/cloudflare-builder:import-meta-shim",
					setup(build) {
						build.onEnd(async () => {
							const configJsPath = path
								.resolve(outDir, options.configPath ?? "./config.ts")
								.replace(/\.ts$/, ".js");
							const configJs = await fs.readFile(configJsPath, "utf-8");
							const contents = `import.meta.dirname="${path.dirname(configPath)}";\nimport.meta.filename="${configPath}";\n${configJs}`;
							await fs.writeFile(configJsPath, contents);
						});
					},
				},
			],
		});
		await esBuild({
			entryPoints: entrypoints,
			outfile: options.config.main,
			tsconfig: options.config.tsconfig,
			...ROOT_ESBUILD_OPTIONS,
			...options?.esBuildOptions,
			plugins: generatePlugins([
				...ROOT_ESBUILD_OPTIONS.plugins,
				smartRouter(options.config, outDir),
				...(options.config.tsconfig != null
					? [
							typeGeneration({
								rootPath: options.rootDir,
								tsConfigPath: path.resolve(
									options.rootDir,
									options.config.tsconfig,
								),
								outDir,
								entrypoints,
							}),
						]
					: []),
				timing({ name: "Bundle", logger }),
			]),
		});
	}
}
