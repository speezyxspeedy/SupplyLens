import React, { useMemo, useState } from 'react';
import { Download, FileCode, FileSpreadsheet, FileText, Info, Printer } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  generateCsvReport,
  generateJsonReport,
  generatePrintableHtmlReport,
  INVENTORY_DISCLAIMER,
} from '../../services/reportService';
import { EmptyState } from '../common/EmptyState';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ReportsView: React.FC = () => {
  const { analysis } = useProject();
  const [previewFormat, setPreviewFormat] = useState<'json' | 'csv' | 'html'>('json');

  const jsonOutput = useMemo(
    () => (analysis ? generateJsonReport(analysis) : ''),
    [analysis],
  );
  const csvOutput = useMemo(
    () => (analysis ? generateCsvReport(analysis) : ''),
    [analysis],
  );
  const htmlOutput = useMemo(
    () => (analysis ? generatePrintableHtmlReport(analysis) : ''),
    [analysis],
  );

  if (!analysis) {
    return (
      <EmptyState
        title="No Project Loaded for Report Export"
        description="Import a Node.js project or load the demo project to generate JSON, CSV, or printable HTML dependency inventories."
      />
    );
  }

  const safeSlug = analysis.projectName.replace(/[^a-zA-Z0-9._-]+/g, '_');

  const handlePrintIframe = () => {
    const iframe = document.getElementById('supplylens-print-frame') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          SBOM-Style Dependency Inventory Export
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Generate machine-readable component inventories locally with formula-injection protection and HTML escaping.
        </p>
      </div>

      {/* Non-certification Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="font-medium leading-relaxed">{INVENTORY_DISCLAIMER}</p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <FileCode className="h-5 w-5 text-emerald-500" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              JSON Inventory
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Structured snapshot containing package records, dependency edges, duplicate groups, unresolved refs, and health findings.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `${safeSlug}-dependency-inventory.json`,
                jsonOutput,
                'application/json;charset=utf-8',
              )
            }
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <FileSpreadsheet className="h-5 w-5 text-cyan-500" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              CSV Spreadsheet
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Spreadsheet-safe table with OWASP formula-injection neutralization (<code className="font-mono">=</code>, <code className="font-mono">+</code>, <code className="font-mono">-</code>, <code className="font-mono">@</code> escaped).
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `${safeSlug}-dependency-inventory.csv`,
                csvOutput,
                'text/csv;charset=utf-8',
              )
            }
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            <h2 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Printable HTML
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standalone escaped HTML report ready for archiving or printing to PDF directly from your browser.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `${safeSlug}-dependency-inventory.html`,
                  htmlOutput,
                  'text/html;charset=utf-8',
                )
              }
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewFormat('html');
                setTimeout(handlePrintIframe, 100);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Preview Tabs */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-950 p-1">
            {(['json', 'csv', 'html'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setPreviewFormat(fmt)}
                className={`rounded px-3 py-1 text-xs font-medium uppercase transition-colors ${
                  previewFormat === fmt
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Report Preview</span>
        </div>

        {previewFormat === 'html' ? (
          <iframe
            id="supplylens-print-frame"
            title="SupplyLens Printable HTML Preview"
            sandbox="allow-modals"
            srcDoc={htmlOutput}
            className="w-full h-[460px] bg-white"
          />
        ) : (
          <pre className="p-4 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-auto max-h-[460px] whitespace-pre">
            {previewFormat === 'json' ? jsonOutput : csvOutput}
          </pre>
        )}
      </section>
    </div>
  );
};
