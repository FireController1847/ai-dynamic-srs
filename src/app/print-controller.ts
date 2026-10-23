import type { DataModel, DocumentModel, SchemaNode, CopyRequest, NavigationRequest, PrintRequest } from '../core/schema/schema-types.ts';
import { printDocument } from "../core/printing/print-document.ts";
import { printableContent } from "../core/printing/print-media.ts";

export async function printPage({ date, page, sectionCode, title, version, contentHtml }: { date: string; page: SchemaNode; sectionCode?: string; title: string; version: unknown; contentHtml?: string }) {
  // A paged Phase 7 preview contains only one small slice. Its complete print
  // output is composed incrementally and supplied explicitly by that preview.
  if (contentHtml !== undefined) {
    await printDocument({ title, date, version: version || "0.1", sectionCode: sectionCode || page.code, contentHtml, pagination: "browser" });
    return;
  }
  const panel = document.getElementById(`${page.id}-panel`);
  // Phase 7 owns the complete document; select its output explicitly even if
  // other working previews are present in the SRS workspace.
  const assembledContent = panel?.querySelector<HTMLElement>(".srs-assembly-preview .document-content");
  const content = assembledContent || panel?.querySelector<HTMLElement>(".document-content");

  if (!content) {
    throw new Error("The active document preview could not be found.");
  }

  await printDocument({
    title,
    date,
    version: version || "0.1",
    sectionCode: sectionCode || page.code,
    contentHtml: await printableContent(content),
    pagination: assembledContent ? "browser" : "paged"
  });
}
