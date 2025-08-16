// scripts/analyze-deps.mjs
// Falcon — Repo Inventory & Dependency Scanner (RLS-first, read-only)
//
// This script scans the `src` folder for JavaScript and TypeScript files and records import relationships,
// exported symbols, inferred component types, routes, and other metadata. It writes the resulting
// inventory to `docs/inventory.json`. You can customise the heuristics as needed.

import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import pc from "picocolors";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "src");
const OUT_DIR  = path.join(ROOT, "docs");
const OUT_JSON = path.join(OUT_DIR, "inventory.json");
const exts = ["js", "jsx", "ts", "tsx"];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isPascal(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

function isHookName(name) {
  return /^use[A-Z0-9].*/.test(name);
}

// Guess the kind of module based on its path and exported names
function guessKind(filePath, exportsSet) {
  const p = toPosix(filePath);
  if (p.includes("/pages/")) return "page";
  if (p.includes("/hooks/") || [...exportsSet].some(isHookName)) return "hook";
  if (p.includes("/context/")) return "context";
  if (p.includes("/providers/") || p.toLowerCase().includes("provider")) return "provider";
  if (p.includes("/services/") || p.includes("/api/")) return "service";
  if (p.includes("/utils/") || p.includes("/lib/")) return "util";
  if (p.includes("/schemas/") || p.includes("/types/")) return "schema";
  if (p.includes("/components/")) return "component";
  return "module";
}

// Extract route from file path if under `src/pages`
function extractRoute(filePath) {
  const p = toPosix(filePath);
  if (!p.includes("/src/pages/")) return null;
  const rel = p.split("/src/pages/")[1];
  const base = rel.replace(/\.(jsx?|tsx?)$/, "");
  const route = "/" + base
    .replace(/index$/i, "")
    .replace(/\[([^\]]+)\]/g, ":$1")
    .replace(/\/+/g, "/")
    .toLowerCase();
  return route === "//" || route === "/" ? "/" : route;
}

// Determine status based on comments
function detectStatus(source) {
  if (/@deprecated|\/\/\s*DEAD|\/\*\s*DEAD/i.test(source)) return "dead";
  if (/TODO|WIP|FIXME/.test(source)) return "wip";
  return "stable";
}

// Parse a file and extract imports and exports using Babel
function parseFile(code, filename) {
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "decorators-legacy",
        "dynamicImport",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "objectRestSpread",
        "optionalChaining",
        "nullishCoalescingOperator"
      ]
    });
    const imports = new Set();
    const exports = new Set();
    const props   = [];
    let probableComponent = false;

    traverse(ast, {
      ImportDeclaration({ node }) {
        if (node.source?.value) {
          imports.add(node.source.value);
        }
      },
      ExportNamedDeclaration({ node }) {
        if (node.declaration) {
          if (node.declaration.declarations) {
            node.declaration.declarations.forEach(d => {
              if (d.id?.name) exports.add(d.id.name);
            });
          } else if (node.declaration.id?.name) {
            exports.add(node.declaration.id.name);
          }
        }
        if (node.specifiers) {
          node.specifiers.forEach(s => {
            if (s.exported?.name) exports.add(s.exported.name);
          });
        }
      },
      ExportDefaultDeclaration({ node }) {
        exports.add("default");
        const d = node.declaration;
        if (d?.type === "FunctionDeclaration" && d.id?.name && isPascal(d.id.name)) {
          probableComponent = true;
        }
      },
      FunctionDeclaration({ node }) {
        if (node.id?.name && isPascal(node.id.name)) {
          probableComponent = true;
        }
      }
    });
    return { imports: [...imports], exports: [...exports], props, probableComponent };
  } catch (e) {
    console.warn(pc.yellow(`Parse error in ${filename}: ${e.message}`));
    return { imports: [], exports: [], props: [], probableComponent: false };
  }
}

async function main() {
  console.log(pc.cyan("▶ Falcon audit: scanning source files…"));
  const files = await fg(exts.map(ext => `src/**/*.${ext}`), { cwd: ROOT, absolute: true });
  const inventory = [];
  const importEdges = [];

  for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    const code = await fs.readFile(abs, "utf8");
    const { imports, exports, props, probableComponent } = parseFile(code, rel);
    const kind  = probableComponent && !rel.includes("/hooks/") ? "component" : guessKind(rel, new Set(exports));
    const route = extractRoute(rel);
    const status = detectStatus(code);
    const name  = exports.find(isPascal) || path.basename(rel).replace(/\.(jsx?|tsx?)$/, "");
    inventory.push({
      path: rel,
      name,
      kind,
      exports,
      props,
      imports,
      importedBy: [],
      route,
      status,
      tests: { hasTest: false, path: null },
      storybook: { hasStory: false }
    });
    imports.forEach(spec => importEdges.push({ from: rel, to: spec }));
  }

  // Compute reverse imports
  const byPath = new Map(inventory.map(f => [f.path, f]));
  importEdges.forEach(edge => {
    const target = byPath.get(edge.to);
    if (target) target.importedBy.push(edge.from);
  });

  // Summarise counts by kind
  const countsByKind = inventory.reduce((acc, f) => {
    acc[f.kind] = (acc[f.kind] || 0) + 1;
    return acc;
  }, {});

  const out = {
    generatedAt: new Date().toISOString(),
    root: toPosix(ROOT),
    files: inventory,
    summary: { total: inventory.length, countsByKind }
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2), "utf8");
  console.log(pc.green(`✓ Wrote ${OUT_JSON}`));
  console.log(pc.green(`Found ${inventory.length} files in inventory.`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
