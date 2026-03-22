import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  console.log(`Project root: ${projectRoot}`);
  console.log(`Checking for index.html at: ${path.resolve(projectRoot, "client/index.html")}`);
  
  await rm(path.resolve(projectRoot, "dist"), { recursive: true, force: true });

  console.log("building client...");
  try {
    await viteBuild({
      configFile: path.resolve(projectRoot, "vite.config.ts"),
      root: path.resolve(projectRoot, "client"),
      build: {
        outDir: path.resolve(projectRoot, "dist/public"),
        emptyOutDir: true,
      }
    });
  } catch (error) {
    console.error("Vite build failed:");
    console.error(error);
    process.exit(1);
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile(path.resolve(projectRoot, "package.json"), "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: [path.resolve(projectRoot, "server/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(projectRoot, "dist/index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
