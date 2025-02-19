import { build } from "@aerofoil/build-tools";
await build(["./src/**/*"], import.meta.dirname);
