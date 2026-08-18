const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const unitPath = path.join(__dirname, '../coverage/unit/coverage-final.json');
const e2ePath = path.join(__dirname, '../coverage/e2e/coverage-final.json');

for (const p of [unitPath, e2ePath]) {
  if (!fs.existsSync(p)) {
    console.error(`Faltando ${p} — rode "pnpm test:cov" e "pnpm test:e2e:cov" antes de mesclar.`);
    process.exit(1);
  }
}

const map = libCoverage.createCoverageMap({});
map.merge(JSON.parse(fs.readFileSync(unitPath, 'utf8')));
map.merge(JSON.parse(fs.readFileSync(e2ePath, 'utf8')));

const outputDir = path.join(__dirname, '../coverage/merged');
const context = libReport.createContext({ dir: outputDir, coverageMap: map });
for (const reporter of ['text', 'html', 'lcov']) {
  reports.create(reporter).execute(context);
}
console.log(`\nCoverage mesclado (unit + e2e) escrito em ${outputDir}/index.html`);
