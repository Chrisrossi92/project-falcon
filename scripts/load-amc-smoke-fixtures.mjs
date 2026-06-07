import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const projectName = process.env.SUPABASE_LOCAL_PROJECT || 'project-falcon';
const dbContainer = `supabase_db_${projectName}`;
const fixturePath = resolve(repoRoot, 'supabase/manual/20260606_amc_full_mvp_smoke_fixture.sql');
const artifactDir = process.env.AMC_SMOKE_ARTIFACT_DIR || '/private/tmp/project-falcon-amc-smoke';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    input: options.input,
    env: { ...process.env, ...options.env },
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stdout.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    process.exit(result.status ?? 1);
  }

  return result;
}

function writeDisposablePdf(fileName, title) {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 68 >>
stream
BT /F1 12 Tf 72 720 Td (${title}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000221 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
339
%%EOF
`;

  writeFileSync(resolve(artifactDir, fileName), pdf);
}

mkdirSync(artifactDir, { recursive: true });
writeDisposablePdf('amc-smoke-report.pdf', 'AMC smoke disposable report PDF');
writeDisposablePdf('amc-smoke-invoice.pdf', 'AMC smoke disposable invoice PDF');

const sql = readFileSync(fixturePath, 'utf8');
const result = run(
  'docker',
  [
    'exec',
    '-i',
    dbContainer,
    'env',
    'PGPASSWORD=postgres',
    'psql',
    '-h',
    '127.0.0.1',
    '-U',
    'supabase_admin',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
  ],
  { capture: true, input: sql },
);

process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
console.log(`Disposable smoke PDFs written to ${artifactDir}`);
