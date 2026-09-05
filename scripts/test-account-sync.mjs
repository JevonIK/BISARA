// Transpile only the storage/sync modules for Node's test runner; no browser or new dependency needed.
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const directory = await mkdtemp(path.join(tmpdir(), 'bisara-sync-test-'));
const sources = [
  'lib/scoring.ts',
  'lib/progress-storage.ts',
  'lib/account-cache.ts',
  'lib/api-client.ts',
  'lib/account-session.ts',
  'tests/account-sync.test.ts',
];
for (const source of sources) {
  const result = ts.transpileModule(await readFile(source, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });
  const code = result.outputText.replace(
    /(['"])@\/lib\/([^'"]+)\1/g,
    "'./$2.mjs'",
  );
  await writeFile(
    path.join(directory, path.basename(source).replace(/\.ts$/, '.mjs')),
    code,
  );
}
const result = spawnSync(
  process.execPath,
  ['--test', path.join(directory, 'account-sync.test.mjs')],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
