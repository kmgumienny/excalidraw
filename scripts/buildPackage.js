const fs = require("fs");
const path = require("path");
const { build } = require("esbuild");
const { sassPlugin } = require("esbuild-sass-plugin");
const { externalGlobalPlugin } = require("esbuild-plugin-external-global");
const { transform: lightningcssTransform } = require("lightningcss");

// The compiled CSS contains constructs that are valid SCSS but not valid
// CSS — `:export { ... }` blocks emitted by `esbuild-sass-plugin` for every
// `*.module.scss`, plus a handful of typo'd pseudo-classes in hand-written
// SCSS (`:first` for `:first-child`, `:active--promo`, etc.). Modern CSS
// parsers (lightningcss, used by Next.js / Turbopack) reject all of these
// and refuse to parse the file.
//
// We run the build output back through lightningcss with two safety nets:
//   1. `errorRecovery: true` — drops syntactically invalid rules.
//   2. A `Selector` visitor that drops any selector containing an
//      unrecognized pseudo-class (`{ type: "pseudo-class", kind: "custom" }`
//      in the lightningcss AST). That covers the typo'd selectors that
//      parse cleanly but reference pseudo-classes that don't exist, plus
//      `:export` blocks (parsed as a custom pseudo-class targeting the
//      bare `:export`).
//
// Whatever survives is, by construction, something the consumer's parser
// will also accept — lightningcss is the parser Next.js / Turbopack uses.
function sanitizeCss(filePath) {
  const original = fs.readFileSync(filePath);
  const droppedSelectors = new Set();
  const { code, warnings } = lightningcssTransform({
    filename: filePath,
    code: original,
    errorRecovery: true,
    minify: false,
    visitor: {
      Selector(selector) {
        for (const component of selector) {
          if (
            component &&
            component.type === "pseudo-class" &&
            component.kind === "custom"
          ) {
            droppedSelectors.add(component.name);
            return [];
          }
        }
      },
    },
  });
  if (warnings && warnings.length) {
    for (const w of warnings) {
      console.warn(
        `[lightningcss] ${path.relative(process.cwd(), filePath)}: ${w.message}`,
      );
    }
  }
  if (droppedSelectors.size > 0) {
    console.warn(
      `[lightningcss] ${path.relative(process.cwd(), filePath)}: dropped selectors with unknown pseudo-classes: ${[...droppedSelectors].map((n) => `:${n}`).join(", ")}`,
    );
  }
  fs.writeFileSync(filePath, code);
}

function sanitizeAllCss(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return;
  }
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      sanitizeAllCss(full);
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      sanitizeCss(full);
    }
  }
}

// Will be used later for treeshaking
//const fs = require("fs");
// const path = require("path");

// function getFiles(dir, files = []) {
//   const fileList = fs.readdirSync(dir);
//   for (const file of fileList) {
//     const name = `${dir}/${file}`;
//     if (
//       name.includes("node_modules") ||
//       name.includes("config") ||
//       name.includes("package.json") ||
//       name.includes("main.js") ||
//       name.includes("index-node.ts") ||
//       name.endsWith(".d.ts")
//     ) {
//       continue;
//     }

//     if (fs.statSync(name).isDirectory()) {
//       getFiles(name, files);
//     } else if (
//       !(
//         name.match(/\.(sa|sc|c)ss$/) ||
//         name.match(/\.(woff|woff2|eot|ttf|otf)$/) ||
//         name.match(/locales\/[^/]+\.json$/)
//       )
//     ) {
//       continue;
//     } else {
//       files.push(name);
//     }
//   }
//   return files;
// }

const browserConfig = {
  entryPoints: ["index.tsx"],
  bundle: true,
  format: "esm",
  plugins: [
    sassPlugin(),
    externalGlobalPlugin({
      react: "React",
      "react-dom": "ReactDOM",
    }),
  ],
  splitting: true,
  loader: {
    ".woff2": "file",
  },
};
const createESMBrowserBuild = async () => {
  // Development unminified build with source maps
  await build({
    ...browserConfig,
    outdir: "dist/browser/dev",
    sourcemap: true,
    chunkNames: "excalidraw-assets-dev/[name]-[hash]",
    assetNames: "excalidraw-assets-dev/[name]-[hash]",
    define: {
      "import.meta.env": JSON.stringify({ DEV: true }),
    },
  });

  // production minified build without sourcemaps
  await build({
    ...browserConfig,
    outdir: "dist/browser/prod",
    minify: true,
    chunkNames: "excalidraw-assets/[name]-[hash]",
    assetNames: "excalidraw-assets/[name]-[hash]",
    define: {
      "import.meta.env": JSON.stringify({ PROD: true }),
    },
  });
};

// const BASE_PATH = `${path.resolve(`${__dirname}/..`)}`;
// const filesinExcalidrawPackage = [
//   ...getFiles(`${BASE_PATH}/packages/excalidraw`),
//   `${BASE_PATH}/packages/utils/export.ts`,
//   `${BASE_PATH}/packages/utils/bbox.ts`,
//   ...getFiles(`${BASE_PATH}/public/fonts`),
// ];

// const filesToTransform = filesinExcalidrawPackage.filter((file) => {
//   return !(
//     file.includes("/__tests__/") ||
//     file.includes(".test.") ||
//     file.includes("/tests/") ||
//     file.includes("example")
//   );
// });

const rawConfigCommon = {
  bundle: true,
  format: "esm",
  plugins: [sassPlugin()],
  assetNames: "[dir]/[name]-[hash]",
  loader: {
    ".json": "copy",
    ".woff2": "file",
  },
  packages: "external",
  // chunks are always external, so they are not bundled within and get build separately
  external: ["*.chunk"],
};

const rawConfigIndex = {
  ...rawConfigCommon,
  entryPoints: ["index.tsx"],
};

const rawConfigChunks = {
  ...rawConfigCommon,
  // create a separate chunk for each
  entryPoints: ["**/*.chunk.ts"],
};

function buildDev(chunkConfig) {
  const config = {
    ...chunkConfig,
    sourcemap: true,
    define: {
      "import.meta.env": JSON.stringify({ DEV: true }),
    },
    outdir: "dist/dev",
  };

  return build(config);
}

function buildProd(chunkConfig) {
  const config = {
    ...chunkConfig,
    minify: true,
    define: {
      "import.meta.env": JSON.stringify({ PROD: true }),
    },
    outdir: "dist/prod",
  };

  return build(config);
}

const createESMRawBuild = async () => {
  // development unminified build with source maps
  await buildDev(rawConfigIndex);
  await buildDev(rawConfigChunks);

  // production minified buld without sourcemaps
  await buildProd(rawConfigIndex);
  await buildProd(rawConfigChunks);
};

// otherwise throws "ERROR: Could not resolve "./subset-worker.chunk"
(async () => {
  await createESMRawBuild();
  await createESMBrowserBuild();

  // Walk every CSS file under dist/ and sanitize it through lightningcss.
  // This drops invalid pseudo-classes, `:export` blocks, and any other
  // CSS that the consumer's parser would reject.
  sanitizeAllCss(path.resolve(process.cwd(), "dist"));
})();
