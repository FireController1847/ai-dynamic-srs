import type { DataModel, DocumentModel, SchemaNode, CopyRequest, NavigationRequest, PrintRequest } from '../core/schema/schema-types.ts';
import { printDocument } from "../core/printing/print-document.ts";
import { printableContent } from "../core/printing/print-media.ts";

export async function printPage({ date, page, sectionCode, title, version }: { date: string; page: SchemaNode; sectionCode?: string; title: string; version: unknown }) {
  const panel = document.getElementById(`${page.id}-panel`);
  const content = panel?.querySelector<HTMLElement>(".document-content");

  if (!content) {
    throw new Error("The active document preview could not be found.");
  }

  await printDocument({
    title,
    date,
    version: version || "0.1",
    sectionCode: sectionCode || page.code,
    contentHtml: await printableContent(content)
  });
}
