export interface PrintDocumentOptions { title: string; date: string; version: unknown; sectionCode?: string; contentHtml: string; }
const MARKDOWN_STYLES_URL = new URL("assets/print/markdown.css", document.baseURI).href;
const COMPACT_STYLES_URL = new URL("assets/print/compact-documents.css", document.baseURI).href;
const PAGED_SCRIPT_URL = new URL("assets/paged.polyfill.js", document.baseURI).href;

  function escapeHtml(value: unknown) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssString(value: unknown) {
    return String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("\n", " ")
      .replaceAll("\r", " ");
  }

  function createPrintHtml({ title, date, version, sectionCode, contentHtml, readyMessage }: PrintDocumentOptions & { readyMessage: string }) {
    const safeTitle = escapeHtml(title);
    const headerTitle = cssString(title);
    const headerDate = cssString(date);
    const footerVersion = cssString(`${sectionCode} · v${version}`);
    const pagedScript = escapeHtml(PAGED_SCRIPT_URL);

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
    <style>
      @page {
        size: letter portrait;
        margin: 0.78in 0.72in 0.72in;

        @top-left {
          content: "${headerTitle}";
          color: #285b88;
          font: 8pt Arial, sans-serif;
        }

        @top-right {
          content: "${headerDate}";
          color: #4d718f;
          font: 8pt Arial, sans-serif;
        }

        @bottom-left {
          content: "Dynamic SRS Builder";
          color: #4d718f;
          font: 8pt Arial, sans-serif;
        }

        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
          color: #285b88;
          font: 8pt Arial, sans-serif;
        }

        @bottom-right {
          content: "${footerVersion}";
          color: #285b88;
          font: 8pt Arial, sans-serif;
        }
      }

      :root {
        --document-ink: #28323c;
        --document-blue: #285b88;
        --document-blue-secondary: #4d718f;
        --document-teal: #3f7775;
        --document-gold: #b9823a;
        --document-surface: #f4f7fa;
        --document-border: #d5dee8;
        --document-heading-font: Cambria, "Times New Roman", Times, serif;
        --document-body-font: Arial, "Helvetica Neue", sans-serif;
      }
      * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #fff; color: var(--document-ink); }
      body { font: 11pt/1.5 var(--document-body-font); font-variant-numeric: lining-nums; }
      .document-content { position: relative; }
      .document-figure { margin: 0.2in 0; break-inside: avoid; }
      .document-figure figcaption { margin-top: 0.08in; color: #4d718f; font-size: 9pt; }
      .document-diagram img, .document-diagram svg { display: block; max-width: 100%; max-height: 7in; margin: auto; object-fit: contain; }
      .document-diagram img { width: auto; height: auto; }
      .document-record-meta .document-record-meta-wide { grid-column: 1 / -1; }
      .document-record-with-figure .document-record-meta { display: block; padding-left: 0; }
      .document-record-with-figure .document-record-meta > div { margin-bottom: 0.08in; }
      .document-watermark {
        position: fixed;
        z-index: 2;
        top: 45%;
        left: 50%;
        color: #444;
        font: 700 66pt/1 Arial, sans-serif;
        letter-spacing: 0.12em;
        opacity: 0.075;
        pointer-events: none;
        transform: translate(-50%, -50%) rotate(-28deg);
        white-space: nowrap;
      }
      .document-cover-page {
        display: flex;
        min-height: 9.45in;
        flex-direction: column;
        justify-content: flex-start;
        margin: 0;
        padding: 0.72in 0.5in 0.35in;
        background: #fff;
        break-after: page;
        page-break-after: always;
        text-align: left;
      }
      .document-cover-heading { margin: 1.05in 0 0; padding-top: 0.35in; border-top: 3px solid var(--document-blue); }
      .document-cover-code {
        margin: 0 0 0.8rem;
        color: #617386;
        font: 700 8pt/1.2 Arial, sans-serif;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }
      .document-cover-page h1 {
        max-width: 6.1in;
        margin: 0;
        color: var(--document-blue);
        font: 700 30pt/1.1 var(--document-heading-font);
        font-variant-numeric: lining-nums;
      }
      .document-cover-for { margin: 1.15rem 0 0.9rem; color: #657382; font-size: 12pt; font-style: italic; }
      .document-cover-page h2 {
        max-width: 5.8in;
        margin: 0;
        padding: 0;
        border: 0;
        color: var(--document-ink);
        font: 700 22pt/1.15 var(--document-heading-font);
        font-variant-numeric: lining-nums;
      }
      .document-cover-meta {
        display: grid;
        width: 100%;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem 1.6rem;
        margin: auto 0 0;
      }
      .document-cover-meta div {
        min-width: 0;
        padding: 0.5rem 0 0.2rem;
        border-top: 1px solid #aebfce;
      }
      .document-cover-meta dt {
        color: var(--document-blue);
        font: 700 7.5pt/1.2 Arial, sans-serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .document-cover-meta dd { margin: 0.15rem 0 0; }
      .document-body-after-cover { margin: 0; padding: 0; border: 0; }
      .document-body-after-cover > section:first-child { margin-top: 0; }
      .document-title-block {
        margin-bottom: 2rem;
        padding-bottom: 1.35rem;
        border-bottom: 2px solid var(--document-blue);
        box-shadow: inset 0 -1px 0 var(--document-gold);
      }
      .document-type { margin: 0 0 0.45rem; color: var(--document-gold); font: 700 8.5pt/1.2 Arial, sans-serif; letter-spacing: 0.11em; text-transform: uppercase; }
      h1 { string-set: document-title content(text); margin: 0; color: var(--document-blue); font: 700 24pt/1.15 var(--document-heading-font); font-variant-numeric: lining-nums; }
      .document-subtitle { margin: 0.6rem 0 0; color: var(--document-blue-secondary); font-size: 13pt; }
      .document-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem 1.5rem; margin: 1.25rem 0 0; }
      .document-meta dt { color: var(--document-blue); font: 700 8pt/1.2 Arial, sans-serif; letter-spacing: 0.05em; text-transform: uppercase; }
      .document-meta dd { margin: 0.1rem 0 0; }
      section { margin-top: 1.7rem; }
      h2 { margin: 0 0 0.75rem; padding-bottom: 0.25rem; border-bottom: 1px solid #9fbad2; color: var(--document-blue); font: 700 16pt/1.25 var(--document-heading-font); font-variant-numeric: lining-nums; break-after: avoid-page; page-break-after: avoid; }
      h3 { margin: 1.05rem 0 0.3rem; color: var(--document-blue-secondary); font: 700 12pt/1.25 var(--document-body-font); font-variant-numeric: lining-nums; break-after: avoid-page; page-break-after: avoid; }
      h4 { margin: 0.9rem 0 0.25rem; color: var(--document-ink); font: 700 10.5pt/1.25 var(--document-body-font); font-variant-numeric: lining-nums; break-after: avoid-page; page-break-after: avoid; }
      h5, h6 { margin: 0.8rem 0 0.2rem; color: var(--document-ink); font: 700 10pt/1.25 var(--document-body-font); font-variant-numeric: lining-nums; break-after: avoid-page; page-break-after: avoid; }
      .document-heading-group { break-inside: avoid; page-break-inside: avoid; }
      .document-heading-group h2 + h3, .document-heading-group h3 + h4, .document-heading-group h4 + h5, .document-heading-group h5 + h6 { margin-top: 0.55rem; }
      .document-context-section + section { margin-top: 1rem; }
      p { margin: 0 0 0.75rem; }
      ul { margin: 0.3rem 0 0.8rem; padding-left: 1.3rem; }
      blockquote { margin: 1rem 0 0; padding: 0.35rem 0.55rem 0.35rem 0.85rem; border-left: 3px solid var(--document-blue-secondary); background: var(--document-surface); color: #454a4f; font-style: italic; }
      .preserve-lines { white-space: pre-line; }
      .document-empty { color: #666; font-style: italic; }
      .document-table-wrap { overflow: visible; break-inside: auto; page-break-inside: auto; }
      .document-record-list { margin: 0.65rem 0 1rem; }
      .document-record { padding: 0.65rem 0; border-bottom: 1px solid var(--document-border); }
      .document-record:first-child { padding-top: 0; }
      .document-record:last-child { padding-bottom: 0; border-bottom: 0; }
      .document-record-heading {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.6rem;
        align-items: start;
        break-after: avoid;
      }
      .document-record-id { color: var(--document-blue); font-weight: 700; white-space: nowrap; }
      .document-record-primary { margin: 0; }
      .document-record-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.3rem 0.9rem;
        margin: 0.45rem 0 0;
        padding-left: 5rem;
        font-size: 9.5pt;
      }
      .document-record-meta > div { min-width: 0; break-inside: avoid; }
      .document-record-meta .document-record-meta-wide { grid-column: 1 / -1; }
      .document-record-meta dt, .document-record-meta dd { display: inline; margin: 0; }
      .document-record-meta dt { font-weight: 700; }
      .document-record-meta dt::after { content: ": "; }
      .document-nested-records { display: grid; gap: 0.55rem; margin: 0; padding-left: 1.2rem; }
      .document-nested-records > li { break-inside: avoid; }
      .document-nested-records > li > strong { display: block; margin-bottom: 0.25rem; font-size: 8.5pt; }
      .document-nested-records dl { display: grid; gap: 0.2rem; margin: 0; }
      .document-nested-records dl > div {
        display: grid;
        grid-template-columns: minmax(6.5rem, 0.32fr) minmax(0, 1fr);
        gap: 0.45rem;
      }
      .document-nested-records dt, .document-nested-records dd { margin: 0; }
      .cba-document-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem; margin: 0.65rem 0 1rem; }
      .cba-document-kpis div { padding: 0.35rem 0.4rem; border: 1px solid var(--document-border); border-top: 3px solid var(--document-blue); background: var(--document-surface); }
      .cba-document-kpis dt { color: var(--document-blue); font: 700 7pt/1.2 Arial, sans-serif; letter-spacing: 0.04em; text-transform: uppercase; }
      .cba-document-kpis dd { margin: 0.1rem 0 0; font-size: 9.5pt; font-weight: 700; }
      .cba-chart-card {
        margin: 0.75rem 0 1rem;
        padding: 0.55rem;
        border: 1px solid var(--document-border);
        break-inside: avoid;
        font-family: Arial, sans-serif;
      }
      .cba-chart-card figcaption strong, .cba-chart-card figcaption span { display: block; }
      .cba-chart-card figcaption strong { font-size: 9pt; }
      .cba-chart-card figcaption span { margin-top: 0.1rem; color: #555; font-size: 7.5pt; }
      .cba-chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem 0.8rem;
        margin: 0.45rem 0 0.1rem;
        color: #555;
        font-size: 7pt;
      }
      .cba-chart-legend span::before {
        display: inline-block;
        width: 0.8rem;
        height: 0.14rem;
        margin-right: 0.25rem;
        border-radius: 999px;
        background: currentColor;
        content: "";
        vertical-align: middle;
      }
      .cba-chart-legend .benefits, .cba-chart-series.benefits { color: var(--document-blue); }
      .cba-chart-legend .costs, .cba-chart-series.costs { color: var(--document-gold); }
      .cba-chart-legend .net, .cba-chart-series.net { color: var(--document-teal); }
      .cba-chart { display: block; width: 100%; height: auto; max-height: 2.75in; overflow: visible; }
      .cba-chart-grid line { stroke: #d2d6dc; stroke-width: 1; }
      .cba-chart-grid .zero-line { stroke: #777; stroke-width: 1.5; }
      .cba-chart-grid text { fill: #555; font-size: 10px; }
      .cba-chart-series polyline {
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 3;
      }
      .cba-chart-series.costs polyline { stroke-dasharray: 8 5; }
      .cba-chart-series.net polyline { stroke-width: 4; }
      .cba-chart-series circle { fill: #fff; stroke: currentColor; stroke-width: 2; }
      table { width: 100%; border-collapse: collapse; margin: 0.65rem 0 1rem; break-inside: auto; page-break-inside: auto; font-size: 9.5pt; }
      th, td { padding: 0.4rem 0.45rem; border: 1px solid var(--document-border); hyphens: none; overflow-wrap: normal; text-align: left; vertical-align: top; word-break: normal; }
      th { font-weight: 700; }
      thead th { background: var(--document-blue); color: #fff; }
      tbody th { background: #edf2f7; color: var(--document-blue); }
      tbody tr:nth-child(even) td { background: var(--document-surface); color: var(--document-ink); }
      tbody tr:nth-child(even) th { background: #e4edf5; color: var(--document-blue); }
      .cba-document-content table { font-variant-numeric: tabular-nums; }
      .cba-document-content table th:not(:first-child), .cba-document-content table td:not(:first-child) { text-align: right; }
      .cba-document-content .cba-wide-table { font-size: 7pt; }
      .cba-document-content .cba-wide-table th, .cba-document-content .cba-wide-table td { padding: 0.25rem 0.28rem; }
      .effort-breakdown-table tfoot th, .effort-breakdown-table tfoot td { background: var(--document-surface); color: var(--document-ink); font-weight: 700; }
      .notes-document-entry { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--document-border); }
      .notes-document-entry:first-of-type { margin-top: 0; padding-top: 0; border-top: 0; }
      .notes-document-entry-heading { display: flex; gap: 0.75rem; align-items: flex-start; justify-content: space-between; }
      .notes-document-entry-heading h3 { margin-top: 0.1rem; }
      .notes-document-id { margin: 0; color: #555; font: 700 8pt/1.2 Arial, sans-serif; letter-spacing: 0.05em; }
      .notes-document-status { flex: 0 0 auto; padding: 0.15rem 0.4rem; border: 1px solid #888; border-radius: 999px; font: 700 7.5pt/1.2 Arial, sans-serif; }
      .notes-document-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.25rem 0.8rem; margin: 0.4rem 0 0.7rem; padding: 0.5rem; border: 1px solid var(--document-border); background: var(--document-surface); font-size: 8.5pt; }
      .notes-document-meta-wide { grid-column: 1 / -1; }
      .notes-document-meta dt, .notes-document-meta dd { display: inline; margin: 0; }
      .notes-document-meta dt { font-weight: 700; }
      .notes-document-meta dt::after { content: ": "; }
      .notes-document-body { margin: 0.7rem 0 0.9rem; }
      .notes-document-subsection { margin-top: 0.75rem; }
      .notes-document-subsection h4 { margin: 0 0 0.3rem; font-size: 10.5pt; break-after: avoid; }
      .notes-reference-list { margin-top: 0.2rem; }
      .notes-reference-list li + li { margin-top: 0.35rem; }
      .notes-reference-list span { display: block; }
      .notes-reference-list strong + span { display: inline; }
      .notes-reference-locator { overflow-wrap: anywhere; }
      .notes-edit-history { font-size: 8pt; }
      .notes-document-list { padding-left: 1.25rem; }
      .notes-document-item { padding: 0 0 0.7rem 0.1rem; }
      .notes-document-item + .notes-document-item { padding-top: 0.7rem; border-top: 1px solid var(--document-border); }
      .notes-document-item > p:first-child { margin-bottom: 0.15rem; }
      .notes-posted-at { margin-left: 0.35rem; color: #666; font: 7.5pt/1.2 Arial, sans-serif; white-space: nowrap; }
      .notes-document-item-meta { color: #666; font: 7.5pt/1.3 Arial, sans-serif; }
      .notes-document-supporting { margin: 0.45rem 0 0.2rem; padding-left: 0.65rem; border-left: 2px solid var(--document-blue-secondary); font-size: 8.5pt; }
      .notes-document-supporting > strong { font: 700 7.5pt/1.2 Arial, sans-serif; text-transform: uppercase; }
      .notes-edit-list { margin-bottom: 0; }
      thead { display: table-header-group; break-inside: avoid; page-break-inside: avoid; }
      tfoot { break-inside: avoid; page-break-inside: avoid; }
      tbody, tbody tr { break-inside: auto; page-break-inside: auto; }
      thead tr, tfoot tr { break-inside: avoid; page-break-inside: avoid; }
      .pagedjs_pages { background: #fff !important; }
      .pagedjs_page { margin: 0 !important; box-shadow: none !important; }

      @media print {
        .pagedjs_pages { display: block !important; }
        .pagedjs_page { break-after: page; }
      }
    </style>
    <link rel="stylesheet" href="${escapeHtml(COMPACT_STYLES_URL)}">
    <link rel="stylesheet" href="${escapeHtml(MARKDOWN_STYLES_URL)}">
    <script>
      window.PagedConfig = {
        after() {
          window.parent.postMessage({ type: "${readyMessage}" }, "*");
        }
      };
    </script>
    <script src="${pagedScript}"></script>
  </head>
  <body>${contentHtml}</body>
</html>`;
  }

  export function printDocument(options: PrintDocumentOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const readyMessage = `dynamic-srs-print-ready-${token}`;
      const iframe = document.createElement("iframe");
      let timeoutId: number;

      iframe.title = "Printable SRS document";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "8.5in";
      iframe.style.height = "11in";
      iframe.style.border = "0";

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener("message", handleReady);
        iframe.remove();
      };

      const handleReady = (event: MessageEvent<unknown>) => {
        if (event.source !== iframe.contentWindow || (event.data as { type?: string } | null)?.type !== readyMessage) {
          return;
        }

        window.removeEventListener("message", handleReady);
        window.clearTimeout(timeoutId);
        iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      };

      window.addEventListener("message", handleReady);
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("The printable document could not be paginated."));
      }, 15000);

      iframe.srcdoc = createPrintHtml({ ...options, readyMessage });
      document.body.append(iframe);
    });
  }
