import { printDocument } from "../core/printing/print-document.js";
import { printableContent } from "../core/printing/print-media.js";

export async function printPage({ date, page, sectionCode, title, version }) {
  const panel = document.getElementById(`${page.id}-panel`);
  const content = panel?.querySelector(".document-content");

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
