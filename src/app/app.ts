import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../core/schema/schema-types.ts';
import type { DataModel, DocumentModel, SchemaNode, CopyRequest, NavigationRequest, PrintRequest } from '../core/schema/schema-types.ts';
import { APPLICATION_VERSION } from "../core/application-version.ts";
import { errorMessage } from "../core/formatting/errors.ts";
import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/index.css";
import { createDocumentDateTracker } from "./document-date-tracker.ts";
import { withFinancialEvidence } from "../features/cost-benefit-analysis/financial-evidence.ts";
import { bootstrapPopover, bootstrapTooltip } from "../core/bootstrap/overlay-directives.ts";
import { preferredScrollBehavior } from "../core/browser/motion.ts";
import { formatDocumentTitle } from "../core/formatting/document-titles.ts";
import { isFormComplete } from "../core/schema/form-completion.ts";
import { createDocumentState } from "../core/schema/state-factory.ts";
import { createWorkspaceSnapshot } from "../core/workspace/workspace-format.ts";
import { clearLastWorkspace, createWorkspaceId, loadLastWorkspace, saveLastWorkspace } from "../core/workspace/workspace-storage.ts";
import { downloadWorkspace, readWorkspaceFile } from "../core/workspace/workspace-files.ts";
import { SubpageWorkspace } from "../components/navigation/SubpageWorkspace.ts";
import { FormSidebarToggle } from "../components/navigation/FormSidebarToggle.ts";
import { PreviewNavigationControl } from "../components/navigation/PreviewNavigationControl.ts";
import { TabCompletionCheck } from "../components/navigation/TabCompletionCheck.ts";
import { DocumentPreview } from "../components/preview/DocumentPreview.ts";
import { DynamicForm, FormProgress } from "../components/forms/FormWorkspace.ts";
import { PageGuide } from "../components/forms/PageGuide.ts";
import { defaultPageId, featureComponents, pages, projectContextStateKey } from "../features/feature-registry.ts";
import { cancelAutosaveTask, scheduleAutosaveTask } from "./autosave-controller.ts";
import { writeClipboard } from "./clipboard.ts";
import { printPage } from "./print-controller.ts";
import { workspaceStateFrom } from "./workspace-controller.ts";

const FORM_SIDEBAR_PREFERENCE_KEY = "dynamic-srs:form-sidebar-visible";

function loadFormSidebarPreference() {
  try {
    return window.localStorage.getItem(FORM_SIDEBAR_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

function saveFormSidebarPreference(visible: boolean) {
  try {
    window.localStorage.setItem(FORM_SIDEBAR_PREFERENCE_KEY, String(visible));
  } catch {
    // The in-memory preference still works when browser storage is unavailable.
  }
}

const documentDates = createDocumentDateTracker(pages);

const app = createApp({
  components: {
    ...featureComponents,
    DocumentPreview,
    DynamicForm,
    FormSidebarToggle,
    FormProgress,
    PageGuide,
    PreviewNavigationControl,
    SubpageWorkspace,
    TabCompletionCheck
  },
  data() {
    const sections = createDocumentState(pages);
    documentDates.reset(sections);
    return {
      applicationVersion: APPLICATION_VERSION,
      activePage: defaultPageId,
      activeSubpages: {} as Record<string, string>,
      pages,
      projectContextStateKey,
      documentSections: sections,
      workspaceId: createWorkspaceId(),
      workspaceCreatedAt: new Date().toISOString(),
      workspaceUpdatedAt: "",
      workspaceStatus: "Autosave ready",
      saveTimerId: null as number | null,
      copyResetTimerId: undefined as ReturnType<typeof setTimeout> | undefined,
      copiedSection: "",
      formSidebarVisible: loadFormSidebarPreference(),
      printingPageId: ""
    };
  },
  computed: {
    projectContext(): DataModel {
      return this.documentSections[this.projectContextStateKey] || {};
    },
    lastSavedLabel(): string {
      if (!this.workspaceUpdatedAt) {
        return "";
      }

      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(this.workspaceUpdatedAt));
    },
    printDateLabel(): string {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
    }
  },
  watch: {
    activePage(pageId: string) {
      this.scheduleAutosave();
      this.$nextTick(() => this.scrollTabIntoView(pageId));
    },
    documentSections: {
      deep: true,
      handler() {
        documentDates.update(this.documentSections);
        this.scheduleAutosave();
      }
    }
  },
  mounted() {
    try {
      const lastWorkspace = loadLastWorkspace();

      if (lastWorkspace) {
        this.applyWorkspace(lastWorkspace);
        this.workspaceStatus = `Restored ${lastWorkspace.document.title}`;
      } else {
        this.persistWip("New workspace saved locally");
      }
    } catch (error) {
      this.workspaceStatus = `Could not restore the last workspace: ${errorMessage(error)}`;
    }
  },
  beforeUnmount() {
    cancelAutosaveTask(this.saveTimerId);
    clearTimeout(this.copyResetTimerId);
  },
  methods: {
    async copyMarkdown({ markdown, title, key }: CopyRequest) {
      try {
        await writeClipboard(withFinancialEvidence(markdown, key, this.documentSections));
        clearTimeout(this.copyResetTimerId);
        this.copiedSection = key;
        this.workspaceStatus = `${title} AI prompt copied as Markdown`;
        this.copyResetTimerId = setTimeout(() => {
          this.copiedSection = "";
        }, 1800);
      } catch (error) {
        this.workspaceStatus = `Copy failed: ${errorMessage(error)}`;
      }
    },
    documentTitleFor(pageId: string) {
      const page = this.pages.find((candidate: SchemaNode) => candidate.id === pageId);
      const sectionTitle = page?.title || page?.label || "Dynamic SRS";
      const titleKey = page?.document?.titleField || "projectName";
      const projectTitle = String(this.documentValueForPage(page, titleKey) || "").trim();

      return formatDocumentTitle(projectTitle, sectionTitle);
    },
    documentValueForPage(page: SchemaNode | undefined, key: string) {
      const pageValue = page ? this.documentSections[page.stateKey]?.[key] : undefined;
      const hasPageValue = pageValue !== null
        && pageValue !== undefined
        && String(pageValue).trim() !== "";

      if (Array.isArray(page?.document?.contextFallbackFields)
        && !page.document.contextFallbackFields.includes(key)) {
        return hasPageValue ? pageValue : undefined;
      }

      return hasPageValue ? pageValue : this.projectContext[key];
    },
    pageIsComplete(page: SchemaNode) {
      if (page.form?.showCompletion === false) {
        return false;
      }

      return isFormComplete(
        page,
        this.documentSections[page.stateKey] || {},
        this.documentSections
      );
    },
    navigateWorkspace({ pageId, anchorId, subpageSelections = {} }: NavigationRequest) {
      if (!this.pages.some((candidate: SchemaNode) => candidate.id === pageId)) {
        return;
      }

      const behavior = preferredScrollBehavior();
      Object.assign(this.activeSubpages, subpageSelections);
      this.activePage = pageId;
      this.scheduleAutosave();
      this.$nextTick(() => {
        const targetId = anchorId || `${pageId}-panel`;
        const scrollWhenMounted = (remainingFrames = 3) => {
          const target = document.getElementById(targetId);

          if (target) {
            Object.values(subpageSelections).forEach((childId) => {
              document.getElementById(`${childId}-subtab`)?.scrollIntoView({
                behavior,
                block: "nearest",
                inline: "center"
              });
            });
            if (!target.hasAttribute("tabindex")) {
              target.setAttribute("tabindex", "-1");
            }
            target.focus({ preventScroll: true });
            target.scrollIntoView({
              behavior,
              block: "start",
              inline: "nearest"
            });
            return;
          }

          if (remainingFrames > 0) {
            window.requestAnimationFrame(() => scrollWhenMounted(remainingFrames - 1));
          }
        };

        window.requestAnimationFrame(() => {
          scrollWhenMounted();
        });
      });
    },
    scrollTabIntoView(pageId: string) {
      document.getElementById(`${pageId}-tab`)?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "nearest",
        inline: "center"
      });
    },
    selectPage(pageId: string, event: Event) {
      this.activePage = pageId;
      (event.currentTarget as HTMLElement).scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "nearest",
        inline: "center"
      });
    },
    selectSubpage({ nodeId, childId }: { nodeId: string; childId: string }) {
      this.activeSubpages[nodeId] = childId;
      this.scheduleAutosave();
    },
    setFormSidebarVisible(visible: boolean) {
      this.formSidebarVisible = Boolean(visible);
      saveFormSidebarPreference(this.formSidebarVisible);
    },
    async printCurrentDocument(request: PrintRequest | string | undefined) {
      if (this.printingPageId) {
        return;
      }

      const printRequest = request && typeof request === "object" ? request : { pageId: request };
      const pageId = printRequest.pageId || this.activePage;
      this.printingPageId = pageId;
      this.persistWip("All changes saved locally");
      this.workspaceStatus = "Preparing paginated document…";

      try {
        await this.$nextTick();

        const page = this.pages.find((candidate: SchemaNode) => candidate.id === pageId);
        if (!page) {
          throw new Error("The active document preview could not be found.");
        }

        await printPage({
          page,
          title: printRequest.title || this.documentTitleFor(pageId),
          date: this.printDateLabel,
          sectionCode: printRequest.sectionCode || page.code,
          version: this.documentValueForPage(page, page.document?.versionField || "version")
        });
        this.workspaceStatus = "Print dialog opened";
      } catch (error) {
        this.workspaceStatus = `Print failed: ${errorMessage(error)}`;
      } finally {
        this.printingPageId = "";
      }
    },
    buildWorkspace() {
      documentDates.update(this.documentSections);
      return createWorkspaceSnapshot({
        activePage: this.activePage,
        activeSubpages: this.activeSubpages,
        createdAt: this.workspaceCreatedAt,
        id: this.workspaceId,
        projectContext: this.projectContext,
        sections: this.documentSections
      });
    },
    applyWorkspace(workspace: import("../core/workspace/workspace-types.ts").WorkspaceSnapshot) {
      const state = workspaceStateFrom(workspace, pages, defaultPageId);
      documentDates.reset(state.documentSections, workspace.document.updatedAt || workspace.document.createdAt || new Date().toISOString());
      Object.assign(this, state);
    },
    scheduleAutosave() {
      this.workspaceStatus = "Saving changes…";
      this.saveTimerId = scheduleAutosaveTask(
        this.saveTimerId,
        () => this.persistWip("All changes saved locally")
      );
    },
    persistWip(statusMessage = "All changes saved locally") {
      try {
        const workspace = this.buildWorkspace();
        saveLastWorkspace(workspace);
        this.workspaceUpdatedAt = workspace.document.updatedAt;
        this.workspaceStatus = statusMessage;
      } catch (error) {
        this.workspaceStatus = `Autosave failed: ${errorMessage(error)}`;
      }
    },
    async importWip(event: Event) {
      const input = event.target as HTMLInputElement;

      try {
        const workspace = await readWorkspaceFile(input.files?.[0]);
        this.applyWorkspace(workspace);
        this.persistWip(`Loaded ${workspace.document.title}`);
      } catch (error) {
        this.workspaceStatus = `Import failed: ${errorMessage(error)}`;
      } finally {
        input.value = "";
      }
    },
    async downloadWip() {
      try {
        const workspace = this.buildWorkspace();
        saveLastWorkspace(workspace);
        this.workspaceStatus = "Compressing workspace…";
        await downloadWorkspace(workspace);
        this.workspaceUpdatedAt = workspace.document.updatedAt;
        this.workspaceStatus = `Downloaded compressed ${workspace.document.title}.dsrs`;
      } catch (error) {
        this.workspaceStatus = `Download failed: ${errorMessage(error)}`;
      }
    },
    newWip() {
      const confirmed = window.confirm("Start a new WIP? Download the current workspace first if you want a separate backup.");

      if (!confirmed) {
        return;
      }

      cancelAutosaveTask(this.saveTimerId);
      clearLastWorkspace();
      this.activePage = defaultPageId;
      this.activeSubpages = {};
      this.workspaceId = createWorkspaceId();
      this.workspaceCreatedAt = new Date().toISOString();
      this.workspaceUpdatedAt = "";
      this.documentSections = createDocumentState(pages);
      documentDates.reset(this.documentSections);
      this.persistWip("New workspace created");
    }
  }
});

app.directive("bs-popover", bootstrapPopover);
app.directive("bs-tooltip", bootstrapTooltip);
Object.entries(featureComponents).forEach(([name, component]) => app.component(name, component));
app.mount("#app");
