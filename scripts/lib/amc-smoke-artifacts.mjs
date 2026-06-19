import { tmpdir } from "node:os";
import { resolve } from "node:path";

export const AMC_SMOKE_ARTIFACT_DIR_NAME = "project-falcon-amc-smoke";

export function amcSmokeTempRoot() {
  return process.env.RUNNER_TEMP || process.env.TMPDIR || tmpdir();
}

export function amcSmokeArtifactDir() {
  return process.env.AMC_SMOKE_ARTIFACT_DIR || resolve(amcSmokeTempRoot(), AMC_SMOKE_ARTIFACT_DIR_NAME);
}

export function amcSmokeArtifactPath(fileName) {
  return resolve(amcSmokeArtifactDir(), fileName);
}
