import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");

describe("Supabase migration version hygiene", () => {
  it("uses each timestamp version only once", () => {
    const migrationFiles = readdirSync(migrationsDir)
      .filter((fileName) => /^\d{14}_.+\.sql$/.test(fileName))
      .sort();

    const filesByVersion = new Map();
    for (const fileName of migrationFiles) {
      const version = fileName.slice(0, 14);
      filesByVersion.set(version, [...(filesByVersion.get(version) || []), fileName]);
    }

    const duplicates = [...filesByVersion.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([version, files]) => `${version}: ${files.join(", ")}`);

    expect(duplicates).toEqual([]);
  });
});
