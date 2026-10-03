export const FORMAT_NAME = "dynamic-srs-workspace";
export const FORMAT_VERSION = 2;
export const APPLICATION_NAME = "Dynamic SRS Builder";
export const APPLICATION_VERSION = "0.3.0";

export function createWorkspaceSnapshot({
  activePage,
  activeSubpages,
  createdAt,
  id,
  projectContext,
  sections
}) {
  const updatedAt = new Date().toISOString();
  const title = String(projectContext.projectName || "").trim() || "Untitled Dynamic SRS";

  return {
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    application: {
      name: APPLICATION_NAME,
      version: APPLICATION_VERSION
    },
    document: {
      id,
      title,
      createdAt,
      updatedAt,
      activePage,
      activeSubpages,
      sections
    }
  };
}
