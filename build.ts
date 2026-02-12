import { build } from "bun"

// ESM
await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  naming: "[name].js",
  minify: true,
})

// CJS
await build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "cjs",
  naming: "[name].cjs",
  minify: true,
})

// Generate .d.ts via tsc
const proc = Bun.spawnSync(["bunx", "tsc", "--emitDeclarationOnly"])
if (proc.exitCode !== 0) {
  console.error(new TextDecoder().decode(proc.stderr))
  process.exit(1)
}

console.log("Build complete: ESM + CJS + types")
