import { createDocumentDateTracker } from "./document-date-tracker.js";
import { withFinancialEvidence } from "../features/cost-benefit-analysis/financial-evidence.js";
import { bootstrapPopover, bootstrapTooltip } from "../core/bootstrap/overlay-directives.js";
import { preferredScrollBehavior } from "../core/browser/motion.js";
import { formatDocumentTitle } from "../core/formatting/document-titles.js";
import { isFormComplete } from "../core/schema/form-completion.js";
import { createDocumentState } from "../core/schema/state-factory.js";
import { createWorkspaceSnapshot } from "../core/workspace/workspace-format.js";
import { clearLastWorkspace, createWorkspaceId, loadLastWorkspace, saveLastWorkspace } from "../core/workspace/workspace-storage.js";
import { downloadWorkspace, readWorkspaceFile } from "../core/workspace/workspace-files.js";
import { SubpageWorkspace } from "../components/navigation/SubpageWorkspace.js";
import { FormSidebarToggle } from "../components/navigation/FormSidebarToggle.js";
import { PreviewNavigationControl } from "../components/navigation/PreviewNavigationControl.js";
import { TabCompletionCheck } from "../components/navigation/TabCompletionCheck.js";
import { DocumentPreview } from "../components/preview/DocumentPreview.js";
import { DynamicForm, FormProgress } from "../components/forms/FormWorkspace.js";
import { PageGuide } from "../components/forms/PageGuide.js";
import { defaultPageId, featureComponents, pages, projectContextStateKey } from "../features/feature-registry.js";
import { cancelAutosaveTask, scheduleAutosaveTask } from "./autosave-controller.js";
import { writeClipboard } from "./clipboard.js";
import { printPage } from "./print-controller.js";
import { workspaceStateFrom } from "./workspace-controller.js";

const { createApp } = window.Vue;
const FORM_SIDEBAR_PREFERENCE_KEY = "dynamic-srs:form-sidebar-visible";

function loadFormSidebarPreference() {
  try {
    return window.localStorage.getItem(FORM_SIDEBAR_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

function saveFormSidebarPreference(visible) {
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
      activePage: defaultPageId,
      activeSubpages: {},
      pages,
      projectContextStateKey,
      documentSections: sections,
      workspaceId: createWorkspaceId(),
      workspaceCreatedAt: new Date().toISOString(),
      workspaceUpdatedAt: "",
      workspaceStatus: "Autosave ready",
      saveTimerId: null,
      copyResetTimerId: null,
      copiedSection: "",
      formSidebarVisible: loadFormSidebarPreference(),
      printingPageId: ""
    };
  },
  computed: {
    projectContext() {
      return this.documentSections[this.projectContextStateKey];
    },
    lastSavedLabel() {
      if (!this.workspaceUpdatedAt) {
        return "";
      }

      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(this.workspaceUpdatedAt));
    },
    printDateLabel() {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
    }
  },
  watch: {
    activePage(pageId) {
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
      this.workspaceStatus = `Could not restore the last workspace: ${error.message}`;
    }
  },
  beforeUnmount() {
    cancelAutosaveTask(this.saveTimerId);
    clearTimeout(this.copyResetTimerId);
  },
  methods: {
    async copyMarkdown({ markdown, title, key }) {
      try {
        await writeClipboard(withFinancialEvidence(markdown, key, this.documentSections));
        clearTimeout(this.copyResetTimerId);
        this.copiedSection = key;
        this.workspaceStatus = `${title} AI prompt copied as Markdown`;
        this.copyResetTimerId = setTimeout(() => {
          this.copiedSection = "";
        }, 1800);
      } catch (error) {
        this.workspaceStatus = `Copy failed: ${error.message}`;
      }
    },
    documentTitleFor(pageId) {
      const page = this.pages.find(({ id }) => id === pageId);
      const sectionTitle = page?.title || page?.label || "Dynamic SRS";
      const titleKey = page?.document?.titleField || "projectName";
      const projectTitle = String(this.documentValueForPage(page, titleKey) || "").trim();

      return formatDocumentTitle(projectTitle, sectionTitle);
    },
    documentValueForPage(page, key) {
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
    pageIsComplete(page) {
      if (page.form?.showCompletion === false) {
        return false;
      }

      return isFormComplete(
        page,
        this.documentSections[page.stateKey] || {},
        this.documentSections
      );
    },
    navigateWorkspace({ pageId, anchorId, subpageSelections = {} }) {
      if (!this.pages.some(({ id }) => id === pageId)) {
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
    scrollTabIntoView(pageId) {
      document.getElementById(`${pageId}-tab`)?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "nearest",
        inline: "center"
      });
    },
    selectPage(pageId, event) {
      this.activePage = pageId;
      event.currentTarget.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "nearest",
        inline: "center"
      });
    },
    selectSubpage({ nodeId, childId }) {
      this.activeSubpages[nodeId] = childId;
      this.scheduleAutosave();
    },
    setFormSidebarVisible(visible) {
      this.formSidebarVisible = Boolean(visible);
      saveFormSidebarPreference(this.formSidebarVisible);
    },
    async printCurrentDocument(request) {
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

        const page = this.pages.find(({ id }) => id === pageId);
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
        this.workspaceStatus = `Print failed: ${error.message}`;
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
    applyWorkspace(workspace) {
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
        this.workspaceStatus = `Autosave failed: ${error.message}`;
      }
    },
    async importWip(event) {
      const input = event.target;

      try {
        const workspace = await readWorkspaceFile(input.files[0]);
        this.applyWorkspace(workspace);
        this.persistWip(`Loaded ${workspace.document.title}`);
      } catch (error) {
        this.workspaceStatus = `Import failed: ${error.message}`;
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
        this.workspaceStatus = `Download failed: ${error.message}`;
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
