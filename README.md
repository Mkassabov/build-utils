# DO NOT USE

This was a hastily thrown together as part of our demo monorepo for a new arch. This should not be used in its current state (and likely can't be).
Most cloudflare relevant things are in src/cloudflare.

At the time of writing this readme, this code was made ~6 months ago and hasn't been touched since.

**It's probably outdated, and cloudflare likely has better ways of doing most of this stuff**

## Some notes
- the main entrypoint for this is `build/generateConfig.ts`. Our custom config files export the output of `generateConfig`.
  - this result then gets used as part of the local build step to generate a `wrangler.toml`, as well as by the pulumi provider to generate the code and formdata that then uses the wrangler internal api
- `UnwrapGeneratorBindings` is also exposed to allow easy access to typesafe bindings for all of the
- Some variation of this is used in production at ~6 of our partners (they forked this and maintain it themselves). We will likely open source this and fully start using it when we fully move our product over to cloudflare

## Sample Setup
assume `config` is the output of `generateConfig()` 

### config.ts
This files sets up the config for an authentication micro service. It exposes 3 things
1. `config` => a generator function used to generate downstream configs (wrangler.toml, formdata for api etc)
2. `ConfigBindings` => preconfigured types for the cloudflare bindings based off of the config
3. `authService` => a service binding that can be passed to other cf worker configs so they can use this service via cloudflare's service-bindings rpc 

```typescript
import path from "node:path";
import { env } from "@228-fund/build-utils/cloudflare/bindings";
import { service } from "@228-fund/build-utils/cloudflare/bindings/lib";
import {
  type UnwrapGeneratorBindings,
  generateConfig,
} from "@228-fund/build-utils/cloudflare/generateConfig";
import { secrets as pscalePrimarySecrets } from "@Project/primary-planetscale/connection/details";
import afEnv from "@aerofoil/core/env";
import type EntryPoint from "~/index";

export const config = generateConfig(
  "@Project/auth", // packageJson.name,
  "./src/index.ts",
  [{ pattern: "api.project-url.com/auth/*", zone: "project-url.com" }],
  [
    env("primary_planetscale_host", pscalePrimarySecrets.host),
    env("primary_planetscale_username", pscalePrimarySecrets.username),
    env("primary_planetscale_password", pscalePrimarySecrets.password),
    env("waitlist_secret_key", "NWcSGKwhYpgVUOPOI0wDIfwdbo8ZyUc4Sh70"),
  ],
  {
    accountId: (await afEnv.getMetaValue("cloudflare_account_id")) as string,
    tsconfig: "./tsconfig.json",
    outDir: path.resolve(import.meta.dirname, "dist"),
  },
);
export type ConfigBindings = UnwrapGeneratorBindings<typeof config>;
export const authService = service<EntryPoint>({
  service: config().name,
});
```

### build.ts
running this file with `tsx build.ts --watch --start` would then update the wrangler.toml and start wrangler.
Running this file with `tsx build.ts` or `tsx build.ts --production` should be run before calling pulumi's deploy

```typescript
import { build } from "@228-fund/build-utils/cloudflare/build";
import { config } from "config";
import packageJson from "~/../package.json";
await build({
  config: await config(process.argv.includes("--production")),
  rootDir: import.meta.dirname,
  wranglerOptions: { port: 1024 },
});
```
