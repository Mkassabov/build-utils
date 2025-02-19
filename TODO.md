# Todo List
- [ ] make group in linear for this library
- [ ] extract tsconfig settings to its own library that this imports
- [ ] write documentation
- [ ] changesets
- [ ] proper support for cf custom domain routes

## short term
- single command build pipeline

## Cloudflare Pages build.ts
### SolidStart Pages
- have an app.config.ts that defines solid-start params
- have no way of defining cloudflare params
- `pnpm dev` runs vinix's dev server, not on cloudflare pages so their may be incompatibilities
	-  only way to simulate environment is using `vinxi build & npx wrangler pages dev dist/`
## astro pages
- have an astro.config.mjs that defines astro params
- have no way of defining cloudflare params
- pnpm dev` runs astro's dev server, not on cloudflare pages so their may be incompatibilities
	- only way to simulate environment is using `astro build & npx wrangler pages dev dist/`