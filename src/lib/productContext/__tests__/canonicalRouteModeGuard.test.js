import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fg from "fast-glob";

const PROJECT_ROOT = process.cwd();

const ALLOWED_FILES = new Set([
  "src/lib/productContext/productLinks.js",
  "src/lib/productContext/productRoutes.js",
]);

const FORBIDDEN_CANONICAL_ROUTE_OPT_INS = [
  {
    label: "useCanonicalRoutes true",
    pattern: /\buseCanonicalRoutes\s*:\s*true\b/,
  },
  {
    label: "routeMode canonical",
    pattern: /\brouteMode\s*:\s*["']canonical["']/,
  },
];

function formatMatch({ file, lineNumber, line, label }) {
  return `${file}:${lineNumber} ${label}: ${line.trim()}`;
}

describe("canonical route mode guard", () => {
  it("keeps canonical product route mode out of live source callers", async () => {
    const files = await fg("src/**/*.{js,jsx,ts,tsx}", {
      cwd: PROJECT_ROOT,
      ignore: [
        "src/lib/productContext/__tests__/**",
        ...Array.from(ALLOWED_FILES),
      ],
    });

    const violations = [];

    await Promise.all(
      files.map(async (file) => {
        const source = await readFile(path.join(PROJECT_ROOT, file), "utf8");
        source.split(/\r?\n/).forEach((line, index) => {
          FORBIDDEN_CANONICAL_ROUTE_OPT_INS.forEach(({ label, pattern }) => {
            if (pattern.test(line)) {
              violations.push(formatMatch({
                file,
                lineNumber: index + 1,
                line,
                label,
              }));
            }
          });
        });
      }),
    );

    expect(violations).toEqual([]);
  });
});
