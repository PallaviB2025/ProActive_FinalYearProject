const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { execSync } = require('child_process');

const markdownPath = 'C:\\Users\\A\\.gemini\\antigravity-ide\\brain\\83d64b7d-bd6f-4b0f-bf6b-166ec0985397\\deep_audit_report.md';
const outputHtmlPath = 'C:\\Users\\A\\Downloads\\ProActive_Security_Audit_Report.html';
const outputPdfPath = 'C:\\Users\\A\\Downloads\\ProActive_Security_Audit_Report.pdf';

console.log('Reading audit report markdown from:', markdownPath);
const mdContent = fs.readFileSync(markdownPath, 'utf8');

// Custom marked renderer for nicer styling
const renderer = new marked.Renderer();

// Custom heading rendering with anchor and clean styles
renderer.heading = function({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  const id = plainText.toLowerCase().replace(/[^\w]+/g, '-');
  
  if (depth === 1) {
    return `<h1 id="${id}" class="doc-title">${text}</h1>`;
  } else if (depth === 2) {
    return `<h2 id="${id}" class="section-heading">${text}</h2>`;
  } else if (depth === 3) {
    // Check if it's an issue heading like C-1, H-1, M-1, L-1
    const match = plainText.match(/^([CHML]-\d+):\s*(.*)$/);
    if (match) {
      const code = match[1];
      const title = match[2];
      let badgeClass = 'badge-low';
      if (code.startsWith('C-')) badgeClass = 'badge-critical';
      else if (code.startsWith('H-')) badgeClass = 'badge-high';
      else if (code.startsWith('M-')) badgeClass = 'badge-medium';
      
      return `
        <div class="issue-header">
          <span class="issue-badge ${badgeClass}">${code}</span>
          <h3 id="${id}" class="issue-title">${title}</h3>
        </div>
      `;
    }
    return `<h3 id="${id}" class="sub-heading">${text}</h3>`;
  }
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

// Custom table styling
renderer.table = function(header, body) {
  return `<div class="table-container"><table class="audit-table"><thead>${header.header}</thead><tbody>${header.rows}</tbody></table></div>`;
};

marked.use({ renderer, gfm: true, breaks: true });

const parsedHtml = marked.parse(mdContent);

// Full HTML page with styling optimized for screen and print-to-PDF
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ProActive Password Vault — Deep Security & Code Audit Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root {
      --primary: #0f172a;
      --primary-light: #1e293b;
      --accent: #2563eb;
      --text: #1e293b;
      --text-muted: #64748b;
      --bg: #ffffff;
      --card-bg: #f8fafc;
      --border: #e2e8f0;
      
      --critical-bg: #fef2f2;
      --critical-border: #fca5a5;
      --critical-text: #b91c1c;
      --critical-badge: #dc2626;

      --high-bg: #fff7ed;
      --high-border: #fdba74;
      --high-text: #c2410c;
      --high-badge: #ea580c;

      --medium-bg: #fffbeb;
      --medium-border: #fcd34d;
      --medium-text: #b45309;
      --medium-badge: #d97706;

      --low-bg: #f0fdf4;
      --low-border: #86efac;
      --low-text: #15803d;
      --low-badge: #16a34a;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
      background-color: var(--bg);
      line-height: 1.6;
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }

    /* Print Specific Styles */
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }

    @media print {
      body {
        padding: 0;
        max-width: 100%;
        background: transparent;
        font-size: 11.5px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .no-print {
        display: none !important;
      }

      .page-break {
        page-break-before: always;
        break-before: page;
      }

      .section-heading {
        page-break-before: auto;
        break-after: avoid;
      }

      .issue-header, h3, h4 {
        break-after: avoid;
        page-break-after: avoid;
      }

      pre, .audit-table, .metric-grid, .table-container {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      hr {
        margin: 18px 0;
      }
    }

    /* Executive Cover Banner */
    .executive-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 32px 36px;
      border-radius: 12px;
      margin-bottom: 28px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
      border-left: 6px solid #3b82f6;
    }

    .executive-header h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .executive-header .subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 20px;
      font-weight: 400;
    }

    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 12px;
      color: #cbd5e1;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .meta-item strong {
      color: #ffffff;
    }

    /* KPI Metrics Cards */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }

    .metric-card {
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      text-align: center;
      background: var(--card-bg);
    }

    .metric-card.total {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .metric-card.critical {
      background: var(--critical-bg);
      border-color: var(--critical-border);
    }

    .metric-card.high {
      background: var(--high-bg);
      border-color: var(--high-border);
    }

    .metric-card.medium {
      background: var(--medium-bg);
      border-color: var(--medium-border);
    }

    .metric-card.low {
      background: var(--low-bg);
      border-color: var(--low-border);
    }

    .metric-val {
      font-size: 26px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }

    .metric-card.total .metric-val { color: #0f172a; }
    .metric-card.critical .metric-val { color: var(--critical-badge); }
    .metric-card.high .metric-val { color: var(--high-badge); }
    .metric-card.medium .metric-val { color: var(--medium-badge); }
    .metric-card.low .metric-val { color: var(--low-badge); }

    .metric-lbl {
      font-size: 10.5px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* Headings */
    .doc-title {
      display: none; /* Handled by executive header */
    }

    .section-heading {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 32px;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sub-heading {
      font-size: 15px;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #1e293b;
    }

    /* Issue Items */
    .issue-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .issue-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      color: #ffffff;
      letter-spacing: 0.03em;
      display: inline-block;
    }

    .badge-critical { background: var(--critical-badge); }
    .badge-high { background: var(--high-badge); }
    .badge-medium { background: var(--medium-badge); }
    .badge-low { background: var(--low-badge); }

    .issue-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    p {
      margin-bottom: 10px;
      color: #334155;
    }

    strong {
      color: #0f172a;
      font-weight: 600;
    }

    /* Code Blocks */
    pre {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 11.5px;
      line-height: 1.5;
      margin: 10px 0 14px 0;
      border: 1px solid #1e293b;
    }

    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 11px;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }

    /* Links */
    a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Tables */
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 16px 0;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    .audit-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      border-bottom: 2px solid var(--border);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .audit-table td {
      padding: 7px 10px;
      border-bottom: 1px solid var(--border);
      color: #334155;
    }

    .audit-table tr:last-child td {
      border-bottom: none;
    }

    .audit-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Lists */
    ol, ul {
      margin-left: 20px;
      margin-bottom: 14px;
      color: #334155;
    }

    li {
      margin-bottom: 4px;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 20px 0;
    }

    /* Download / Print CTA bar for web view */
    .action-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .print-btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>

  <div class="action-banner no-print">
    <div>
      <strong>📥 Downloadable PDF Ready:</strong> You can print this report directly to PDF or download the pre-compiled PDF at <code>${outputPdfPath}</code>.
    </div>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="executive-header">
    <h1>🔍 ProActive Password Vault</h1>
    <div class="subtitle">Comprehensive Security Architecture & Full-Stack Code Audit Report</div>
    <div class="meta-bar">
      <div class="meta-item">📅 <strong>Date:</strong> September 24, 2026</div>
      <div class="meta-item">🛡️ <strong>Analyst:</strong> Antigravity AI (Deep Review)</div>
      <div class="meta-item">📦 <strong>Scope:</strong> API, Web App, Chrome Extension (MV3), Shared Packages</div>
      <div class="meta-item">📋 <strong>Classification:</strong> Confidential / Security Audit</div>
    </div>
  </div>

  <div class="metric-grid">
    <div class="metric-card critical">
      <div class="metric-val">6</div>
      <div class="metric-lbl">Critical</div>
    </div>
    <div class="metric-card high">
      <div class="metric-val">8</div>
      <div class="metric-lbl">High</div>
    </div>
    <div class="metric-card medium">
      <div class="metric-val">9</div>
      <div class="metric-lbl">Medium</div>
    </div>
    <div class="metric-card low">
      <div class="metric-val">9</div>
      <div class="metric-lbl">Low</div>
    </div>
    <div class="metric-card total">
      <div class="metric-val">32</div>
      <div class="metric-lbl">Total Findings</div>
    </div>
  </div>

  <main>
    ${parsedHtml}
  </main>

  <footer style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
    ProActive Password Vault — Security & Code Audit Report • Generated on September 24, 2026 • 32 Findings Documented
  </footer>

</body>
</html>
`;

fs.writeFileSync(outputHtmlPath, fullHtml, 'utf8');
console.log('Styled HTML written to:', outputHtmlPath);

// Print to PDF using Headless Edge
const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
console.log('Rendering PDF via Headless Microsoft Edge...');

const { spawnSync } = require('child_process');
const res = spawnSync(edgeExe, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--run-all-compositor-stages-before-draw',
  `--print-to-pdf=${outputPdfPath}`,
  outputHtmlPath
], { stdio: 'inherit' });

if (fs.existsSync(outputPdfPath)) {
  const stats = fs.statSync(outputPdfPath);
  console.log(`✅ SUCCESS: PDF successfully created!`);
  console.log(`Path: ${outputPdfPath}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
} else {
  console.error('❌ Error: PDF output file was not found at:', outputPdfPath);
  process.exit(1);
}
