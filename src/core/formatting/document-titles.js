export function formatDocumentTitle(projectTitle, documentName, { partial = false } = {}) {
  const project = String(projectTitle || "").trim();
  const document = String(documentName || "Dynamic SRS").trim();
  const qualifiedDocument = partial ? `${document} (Partial)` : document;

  return project ? `${project} — ${qualifiedDocument}` : qualifiedDocument;
}
