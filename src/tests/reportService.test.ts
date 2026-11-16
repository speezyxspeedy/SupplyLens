import { describe, expect, it } from 'vitest';
import { runProjectAnalysis } from '../services/analysisPipeline';
import { DEFAULT_SETTINGS, discoverProjectFiles } from '../services/fileService';
import {
  escapeHtml,
  generateCsvReport,
  generateJsonReport,
  generatePrintableHtmlReport,
  INVENTORY_DISCLAIMER,
  sanitizeCsvCell,
} from '../services/reportService';
import { RawProjectFile } from '../types';

describe('reportService', () => {
  it('neutralizes spreadsheet formula injection in CSV cells', () => {
    expect(sanitizeCsvCell('=CMD("calc")')).toBe(`"'=CMD(""calc"")"`);
    expect(sanitizeCsvCell('+SUM(A1:A2)')).toBe(`"'+SUM(A1:A2)"`);
    expect(sanitizeCsvCell('-1+1')).toBe(`"'-1+1"`);
    expect(sanitizeCsvCell('@HYPERLINK("http://bad")')).toBe(`"'@HYPERLINK(""http://bad"")"`);
    expect(sanitizeCsvCell('normal-pkg')).toBe(`"normal-pkg"`);
  });

  it('escapes HTML entities in printable HTML reports', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('generates JSON, CSV, and escaped HTML without leaking source files', () => {
    const pkgContent = JSON.stringify({
      name: '=evil<script>alert(1)</script>',
      version: '1.0.0',
      scripts: { postinstall: 'echo should-not-run' },
      dependencies: { 'safe-lib': '^1.0.0' },
    });
    const lockContent = JSON.stringify({
      name: '=evil<script>alert(1)</script>',
      version: '1.0.0',
      lockfileVersion: 3,
      packages: {
        '': {
          name: '=evil<script>alert(1)</script>',
          version: '1.0.0',
          dependencies: { 'safe-lib': '^1.0.0' },
        },
        'node_modules/safe-lib': {
          version: '1.0.2',
          license: '=MIT',
          integrity: 'sha512-xyz',
        },
      },
    });

    const files: RawProjectFile[] = [
      { path: 'p/package.json', name: 'package.json', content: pkgContent, size: pkgContent.length, source: 'file' },
      { path: 'p/package-lock.json', name: 'package-lock.json', content: lockContent, size: lockContent.length, source: 'file' },
      { path: 'p/src/secret.ts', name: 'secret.ts', content: 'const SECRET_KEY = "123";', size: 25, source: 'file' },
    ];

    const discovered = discoverProjectFiles(files, 'p', 'file', DEFAULT_SETTINGS);
    const analysis = runProjectAnalysis({
      rawFiles: discovered.rawFilesMap,
      importSummary: discovered.importSummary,
      selectedManifestPath: 'p/package.json',
    });

    const jsonStr = generateJsonReport(analysis);
    const parsedJson = JSON.parse(jsonStr);
    expect(parsedJson.disclaimer).toBe(INVENTORY_DISCLAIMER);
    expect(parsedJson.packages).toHaveLength(1);
    expect(jsonStr).not.toContain('SECRET_KEY');

    const csvStr = generateCsvReport(analysis);
    expect(csvStr).toContain(`"'=MIT"`);
    expect(csvStr).not.toContain('SECRET_KEY');

    const htmlStr = generatePrintableHtmlReport(analysis);
    expect(htmlStr).not.toContain('<script>alert(1)</script>');
    expect(htmlStr).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(htmlStr).toContain(INVENTORY_DISCLAIMER);
  });
});
