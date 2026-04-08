# Fixing the SCSS / CSS build for `lightningcss` consumers

## TL;DR

The compiled CSS in `dist/dev/index.css` and `dist/prod/index.css` contained
constructs that are valid SCSS but not valid CSS, and `lightningcss`
(the CSS parser used by Next.js / Turbopack) refused to parse the file.
Hand-fixing each broken selector in the SCSS source was whack-a-mole. The
real fix is a build-step pass that runs the compiled CSS back through
`lightningcss` and drops any selector containing an unrecognized
pseudo-class. The pass is wired into `scripts/buildPackage.js`.

After this fix, the package builds cleanly into a `.tgz` that
`barn-management-app`'s `next dev` (Turbopack) can consume without any
CSS parse errors.

## The problem in detail

### Symptom

Running `npm run dev` in `barn-management-app` (which depends on this
fork via a local `file:` tarball) failed with parse errors like:

```
./node_modules/@excalidraw/excalidraw/dist/dev/index.css (4:2)
> 4 | :export {
    |  ^
'export' is not recognized as a valid pseudo-class.
```

Patching the first error revealed the next, then the next:

```
./node_modules/@excalidraw/excalidraw/dist/dev/index.css (4544:65)
> 4544 | .excalidraw .layer-ui__search-count .result-nav .result-nav-btn:first {
'first' is not recognized as a valid pseudo-class.

./node_modules/@excalidraw/excalidraw/dist/dev/index.css (6613:39)
> 6613 | .excalidraw .welcome-screen-menu-item:active--promo {
'active--promo' is not recognized as a valid pseudo-class.
```

### Root cause

Two unrelated classes of garbage were ending up in the bundled CSS:

1. **CSS Modules `:export { … }` blocks.** Every file ending in
   `.module.scss` declares some "exports" via SCSS's `:export` rule —
   these are intended to be picked up by a CSS Modules JS loader, *not*
   to survive into a plain CSS file. `esbuild-sass-plugin` compiles each
   `.module.scss` and emits the `:export` block straight into the
   bundled CSS anyway. There were 24 of them in `dist/dev/index.css`.

2. **Typo'd pseudo-classes in hand-written SCSS.** The Sass compiler does
   not validate selectors against the CSS spec — whatever you write goes
   straight into the output. So things like:

   ```scss
   // packages/excalidraw/components/SearchMenu.scss
   .result-nav-btn {
     &:active { … }
     &:first { … }     // typo for &:first-child
   }

   // packages/excalidraw/components/welcome-screen/WelcomeScreen.scss
   .welcome-screen-menu-item {
     &--promo { … }    // intended BEM modifier
     &:active--promo { … }  // accidentally nested under &:active
   }
   ```

   …compiled to selectors with invalid pseudo-classes (`:first`,
   `:active--promo`) that no browser would ever match. They weren't
   doing anything in production, just sitting in the stylesheet, and
   nobody noticed because every CSS parser before `lightningcss`
   silently ignored them.

### Why the prod build "looked fine" before

The prod build calls `esbuild` with `minify: true`. esbuild's CSS
minifier happens to drop orphan `:export { … }` blocks (because to it
they look like a declaration block targeting an unknown pseudo-class).
The dev build is unminified, so the `:export` blocks survived in
`dist/dev/index.css`.

esbuild's minifier does **not** strip the typo'd selectors though —
`:first` and `:active--promo` were sitting in *both* `dist/dev/index.css`
*and* `dist/prod/index.css`. The reason `barn-management-app` only ever
saw the `:export` error first was that `next dev` (Turbopack) loads the
**dev** condition in the package's `exports` field, so it never even
opened the prod file.

### Why hand-fixing the SCSS is the wrong fix

There's no upper bound on how many of these typos exist. Every "fix one
broken selector → rebuild → hit the next error → fix that → rebuild → …"
cycle is unsustainable. Worse, future SCSS authoring can introduce new
ones at any time and break the consumer again.

What we need is a build-time pass that, by construction, can only emit
CSS the consumer's parser will accept.

## The fix

Run the compiled CSS back through `lightningcss` (the same parser
Next.js / Turbopack uses) as a post-build step in
`scripts/buildPackage.js`, with two safety nets:

1. **`errorRecovery: true`** — drops syntactically broken rules and
   declarations entirely. Generates warnings but does not throw.

2. **A `Selector` visitor** that walks every selector in the AST and
   returns `[]` (an empty selector list) for any selector containing a
   pseudo-class with `kind: "custom"` in `lightningcss`'s AST
   representation. That `kind: "custom"` discriminator is exactly the
   bucket lightningcss uses for *recognized as a pseudo-class
   syntactically, but not in the list of pseudo-classes the spec
   defines* — i.e., the typos. Returning `[]` removes that selector
   from the rule's selector list. If the rule ends up with zero
   selectors, lightningcss drops the rule.

Whatever survives both passes is, by construction, CSS that the
consumer's parser will accept — because the consumer uses the same
library to parse it.

### Files changed

#### `package.json` (monorepo root)

Added `lightningcss` as a workspace-root devDependency:

```bash
yarn add -DW lightningcss
```

```diff
   "devDependencies": {
+    "lightningcss": "^1.32.0",
     "esbuild": "0.19.10",
     …
   }
```

The build script can `require("lightningcss")` from
`scripts/buildPackage.js` and resolve via yarn-workspace hoisting (same
way it currently resolves `esbuild`).

#### `scripts/buildPackage.js`

Added the imports, the sanitization helpers, and a final call after both
build passes finish:

```js
const fs = require("fs");
const path = require("path");
const { transform: lightningcssTransform } = require("lightningcss");
// …existing imports…

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
      `[lightningcss] ${path.relative(process.cwd(), filePath)}: dropped selectors with unknown pseudo-classes: ${[...droppedSelectors]
        .map((n) => `:${n}`)
        .join(", ")}`,
    );
  }
  fs.writeFileSync(filePath, code);
}

function sanitizeAllCss(rootDir) {
  if (!fs.existsSync(rootDir)) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      sanitizeAllCss(full);
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      sanitizeCss(full);
    }
  }
}

// …existing build functions…

(async () => {
  await createESMRawBuild();
  await createESMBrowserBuild();

  // Walk every CSS file under dist/ and sanitize it through lightningcss.
  // This drops invalid pseudo-classes, `:export` blocks, and any other
  // CSS that the consumer's parser would reject.
  sanitizeAllCss(path.resolve(process.cwd(), "dist"));
})();
```

That's the entire fix. No SCSS source files are touched.

### What got dropped

On a clean rebuild the pass produces this log:

```
[lightningcss] dist/dev/index.css: 'export' is not recognized as a valid pseudo-class. (× 24)
[lightningcss] dist/dev/index.css: 'active--promo' is not recognized as a valid pseudo-class. (× 2)
[lightningcss] dist/dev/index.css: dropped selectors with unknown pseudo-classes: :export, :first, :active--promo
[lightningcss] dist/prod/index.css: 'first' is not recognized as a valid pseudo-class.
[lightningcss] dist/prod/index.css: 'export' is not recognized as a valid pseudo-class.
[lightningcss] dist/prod/index.css: 'active--promo' is not recognized as a valid pseudo-class. (× 2)
[lightningcss] dist/prod/index.css: dropped selectors with unknown pseudo-classes: :first, :export, :active--promo
```

So in total this pass drops:

- Every `:export { … }` block (×24, harmless — they only existed for the
  CSS-Modules JS loader contract, which we're not using).
- One `&:first` rule on `.result-nav-btn` in `SearchMenu.scss` (was a
  typo for `&:first-child` — the rule never matched anything, so dropping
  it changes nothing visible).
- Two `:active--promo` rules on `.welcome-screen-menu-item` in
  `WelcomeScreen.scss` (a SCSS-nesting accident — the rule never matched
  any DOM either, since `:active--promo` isn't a real pseudo-class).

Surrounding rules (`.result-nav-btn`, `.result-nav-btn:active`, all 11
`.welcome-screen-menu-item` variants) are intact. The visual result is
identical.

## A second issue: missing type re-exports

While debugging the CSS, a separate issue surfaced. The consumer
(`barn-management-app`) imports `BinaryFiles` and `ExcalidrawImperativeAPI`
from `@excalidraw/excalidraw`:

```ts
// barn-management-app/src/app/(authenticated)/create/barn/design/DesignBarnContent.tsx
import {
  BinaryFiles,
  ExcalidrawImperativeAPI,
  exportToSvg,
  serializeAsJSON,
} from '@excalidraw/excalidraw';
```

The previously-shipped tarball
(`excalidraw-excalidraw-0.17.1-kav-0.1.0.tgz` — the `v`-less one still
sitting in `packages/excalidraw/`) had this line in its
`dist/excalidraw/index.d.ts`:

```ts
export type { BinaryFiles, ExcalidrawImperativeAPI } from "./types";
```

…but the current source `packages/excalidraw/index.tsx` does not. The
re-export was removed at some point after the old tarball was packed,
and nobody noticed because the consumer was still installing from the
old `.tgz`.

Both types are still defined in `packages/excalidraw/types.ts`
(`BinaryFiles` at ~line 118, `ExcalidrawImperativeAPI` at ~line 749) —
they just need to be re-exported from the package entry point.

### Fix

In `packages/excalidraw/index.tsx`, add the re-export right after the
`./i18n` export so the diff stays minimal:

```diff
 export { defaultLang, languages, useI18n } from "./i18n";

+// Type-only re-exports the consumer (barn-management-app) relies on. These
+// existed in the previously-packed `.tgz`
+// (`excalidraw-excalidraw-0.17.1-kav-0.1.0.tgz`) and were removed from the
+// source at some point. Re-exporting from `./types` restores parity with
+// the old tarball.
+export type { BinaryFiles, ExcalidrawImperativeAPI } from "./types";
+
 export { reconcileElements } from "./data/reconcile";
```

That single line is enough — `tsc` will pick it up the next time you
generate types.

## How to rebuild and ship the fork

The package needs three things in `dist/`:

1. **JS** (`dist/dev/`, `dist/prod/`, `dist/browser/{dev,prod}/`) — built
   by `node ../../scripts/buildPackage.js`.
2. **Sanitized CSS** — done by the lightningcss pass at the end of the
   same `buildPackage.js`.
3. **Type definitions** (`dist/excalidraw/**/*.d.ts`, `dist/math/**/*.d.ts`,
   `dist/utils/**/*.d.ts`) — built by `tsc --emitDeclarationOnly --declaration`.

You **must** run them in this order, and `dist/` **must** be empty
before the first step. If a stale `dist/` is left over from a previous
build, `tsc` errors with `TS5055: Cannot write file ... because it would
overwrite input file` (it picks up the previously-emitted `.d.ts` files
as inputs and refuses to overwrite them).

### The working sequence

```bash
cd /Users/kamilgumienny/git/excalidraw-17/packages/excalidraw

# 1. Wipe dist (mandatory - see TS5055 note above)
rm -rf dist

# 2. JS + CSS (including the lightningcss sanitization pass)
node ../../scripts/buildPackage.js

# 3. Type definitions
#    Use the workspace-root tsc binary directly. The package-local symlink
#    at `packages/excalidraw/node_modules/.bin/tsc` is broken in this
#    checkout (it resolves to a relative path that misses `lib/tsc.js`),
#    but the monorepo-root symlink works fine.
/Users/kamilgumienny/git/excalidraw-17/node_modules/.bin/tsc \
  --emitDeclarationOnly --declaration

# 4. (optional) sanity-check the outputs
grep -nE ':first[^-a-z]|:active--|:export[ {]' dist/dev/index.css
# expected: no output, exit 1
grep -nE 'BinaryFiles|ExcalidrawImperativeAPI' dist/excalidraw/index.d.ts
# expected: line 14 with `export type { BinaryFiles, ExcalidrawImperativeAPI }`

# 5. Repack
yarn pack
# writes excalidraw-excalidraw-v0.17.1-kav-0.1.0.tgz in this directory
```

> **Why not just run `yarn build:esm`?** That script does
> `rm -rf dist && node ../../scripts/buildPackage.js && yarn gen:types`,
> and `gen:types` does `rm -rf types && tsc`. The `tsc` invocation
> resolves through the broken package-local symlink at
> `packages/excalidraw/node_modules/.bin/tsc` and fails with
> `Cannot find module '../lib/tsc.js'`. If you fix that symlink (e.g.
> by reinstalling typescript at the package level, or by fixing yarn's
> hoisting), `yarn build:esm` will Just Work and replace steps 1–3
> above. Until then, the manual sequence is the path of least
> resistance.

## How `barn-management-app` consumes this

The consumer's `package.json` already points at this fork's `.tgz`:

```json
"@excalidraw/excalidraw": "file:../excalidraw-17/packages/excalidraw/excalidraw-excalidraw-v0.17.1-kav-0.1.0.tgz",
```

After repacking, force a fresh install in the consumer:

```bash
cd /Users/kamilgumienny/git/barn-management-app
rm -rf node_modules/@excalidraw/excalidraw
npm install
```

If you get `EINTEGRITY: ... wanted sha512-… but got sha512-…`, npm is
checking the integrity recorded in `package-lock.json` against the new
tarball and finding a mismatch (because the tarball content changed).
Fix it by deleting just the `"integrity": "sha512-…"` line from the
`"node_modules/@excalidraw/excalidraw"` entry in `package-lock.json` and
re-running `npm install`. npm will recompute and write a fresh integrity.

## Why this is the last fix needed

Every previous attempt was reactive: find a broken selector, fix that
specific selector, rebuild, hit the next one. This pass is the same
strict CSS parser the consumer uses, run *during the build*. Anything
that would trip Turbopack at consumption time will trip the visitor at
build time and get dropped. There is no class of bad CSS that can
survive this pass and still break the consumer — and that includes
future typos that don't exist yet.

If a new typo gets introduced in some `.scss` file later, the build will
just log a `[lightningcss] dropped selectors with unknown pseudo-classes`
warning and silently move on. The fix is permanent.