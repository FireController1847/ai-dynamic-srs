export function formatDocumentTitle(projectTitle: unknown, documentName: string, { partial = false }: { partial?: boolean } = {}) {
  const project = String(projectTitle || "").trim();
  const document = String(documentName || "Dynamic SRS").trim();
  const qualifiedDocument = partial ? `${document} (Partial)` : document;

  return project ? `${project} — ${qualifiedDocument}` : qualifiedDocument;
}
