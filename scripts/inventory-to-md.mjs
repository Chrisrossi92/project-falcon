// scripts/inventory-to-md.mjs
// Convert the JSON inventory produced by analyze-deps into human‑readable markdown tables.

import fs from "fs/promises";
import path from "path";
import pc from "picocolors";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs");
const INVENTORY_FILE = path.join(OUT_DIR, "inventory.json");

function code(str) {
  return `\`${str}\``;
}

function list(arr, max = 6) {
  if (!arr || arr.length === 0) return "";
  const head = arr.slice(0, max).map(code).join("<br>");
  return arr.length > max ? `${head}<br>…` : head;
}

function propList(props) {
  if (!props || props.length === 0) return "";
  return props.map(p => {
    const req = p.required ? " *(req)*" : "";
    const type = p.type ? `: ${p.type}` : "";
    return `\`${p.name}\`${req}${type}`;
  }).join("<br>");
}

async function main() {
  const raw = await fs.readFile(INVENTORY_FILE, "utf8");
  const inv  = JSON.parse(raw);
  const files = inv.files || [];
  const components = files.filter(f => f.kind === "component").sort((a, b) => a.name.localeCompare(b.name));
  const pages      = files.filter(f => f.kind === "page").sort((a, b) => (a.route || "").localeCompare(b.route || ""));
  const hooks      = files.filter(f => f.kind === "hook").sort((a, b) => a.name.localeCompare(b.name));

  const compMD = [];
  compMD.push("# Components\n");
  compMD.push("| Component | Path | Used By | Imports | Key Props | Status |\n|---|---|---|---|---|---|");
  for (const c of components) {
    compMD.push(`| ${c.name} | ${code(c.path)} | ${list(c.importedBy)} | ${list(c.imports)} | ${propList(c.props)} | \`${c.status}\` |`);
  }

  const pagesMD = [];
  pagesMD.push("# Pages\n");
  pagesMD.push("| Route | File | Uses | Status |\n|---|---|---|---|");
  for (const p of pages) {
    pagesMD.push(`| \`${p.route || ""}\` | ${code(p.path)} | ${list(p.imports)} | \`${p.status}\` |`);
  }

  const hooksMD = [];
  hooksMD.push("# Hooks\n");
  hooksMD.push("| Hook | Path | Imported By | Depends On |\n|---|---|---|---|");
  for (const h of hooks) {
    hooksMD.push(`| ${h.name} | ${code(h.path)} | ${list(h.importedBy)} | ${list(h.imports)} |`);
  }

  const archMD = [];
  archMD.push("# Architecture (Snapshot)\n");
  archMD.push("- **Tech stack:** React + Vite/TS (assumed), Supabase (RPC‑only writes), Tailwind (assumed).\n");
  archMD.push("- **Principles:** Small PRs · Conventional Commits · RLS‑first · RPC‑only writes.\n");
  archMD.push("- **State & Providers:** Document contexts/providers here.\n");
  archMD.push("- **Routing:** Overview of pages and dynamic segments.\n");
  archMD.push("- **Build & Envs:** How to run dev/build/test.\n\n");
  archMD.push("See also: `components.md`, `pages.md`, `hooks.md`.\n");

  await fs.writeFile(path.join(OUT_DIR, "components.md"), compMD.join("\n"), "utf8");
  await fs.writeFile(path.join(OUT_DIR, "pages.md"), pagesMD.join("\n"), "utf8");
  await fs.writeFile(path.join(OUT_DIR, "hooks.md"), hooksMD.join("\n"), "utf8");
  await fs.writeFile(path.join(OUT_DIR, "architecture.md"), archMD.join("\n"), "utf8");
  console.log(pc.green(`✓ Wrote docs/components.md`));
  console.log(pc.green(`✓ Wrote docs/pages.md`));
  console.log(pc.green(`✓ Wrote docs/hooks.md`));
  console.log(pc.green(`✓ Wrote docs/architecture.md`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
