import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { DocumentPreview } from "../preview/DocumentPreview.ts";
import { preferredScrollBehavior } from "../../core/browser/motion.ts";
import { DynamicForm, FormProgress } from "../forms/FormWorkspace.ts";
import { PageGuide } from "../forms/PageGuide.ts";
import { completion, hasCompletionCriteria, isFormComplete } from "../../core/schema/form-completion.ts";
import { documentOutlineIndex } from "../../core/schema/schema-tree.ts";
import { asDataModel } from "../../core/schema/data-models.ts";
import { PreviewNavigationControl } from "./PreviewNavigationControl.ts";
import { TabCompletionCheck } from "./TabCompletionCheck.ts";
import { FormSidebarToggle } from "./FormSidebarToggle.ts";
import { WorkflowStageOverview } from "./WorkflowStageOverview.ts";

export const SubpageNode = defineComponent({
  name: "SubpageNode",
  components: { DocumentPreview, DynamicForm, FormProgress, FormSidebarToggle, PageGuide, PreviewNavigationControl, TabCompletionCheck, WorkflowStageOverview },
  emits: ["copy-markdown", "navigate-workspace", "print", "select-subpage", "set-form-sidebar-visible"],
  props: {
    activeSubpages: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<DataModel>, required: true },
    depth: { type: Number, default: 0 },
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    formSidebarVisible: { type: Boolean, default: true },
    nodeSchema: { type: Object as PropType<SchemaNode>, required: true },
    parentSchema: { type: Object as PropType<SchemaNode | null>, default: null },
    isPrinting: { type: Boolean, default: false },
    printDateLabel: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true },
    rootPageId: { type: String, required: true },
    rootPageSchema: { type: Object as PropType<SchemaNode>, required: true },
    sectionPath: { type: Array as PropType<number[]>, default: () => [] }
  },
  data() {
    return {
      activeChildId: ""
    };
  },
  computed: {
    activeChild(): SchemaNode | undefined {
      return this.nodeSchema.subpages?.find(({ id }) => id === this.activeChildId)
        || this.nodeSchema.subpages?.[0];
    },
    activeChildData(): DataModel {
      return this.activeChild ? asDataModel(this.dataModel[this.activeChild.stateKey]) : {};
    },
    activeChildPath(): number[] {
      const childIndex = this.nodeSchema.subpages?.findIndex(({ id }) => id === this.activeChild?.id) ?? -1;
      return childIndex >= 0 ? [...this.sectionPath, childIndex + 1] : this.sectionPath;
    },
    nodeCompletion(): number {
      return completion(this.nodeSchema, this.dataModel, this.documentModel);
    },
    nodeHasCompletion(): boolean {
      return hasCompletionCriteria(this.nodeSchema);
    },
    nodePositionLabel(): string | undefined {
      const sequence = this.nodeSchema.workflow?.sequence;
      const total = this.parentSchema?.subpages?.length;
      if (!sequence || !total) {
        return this.nodeSchema.code;
      }

      const kind = this.nodeSchema.workflow?.kind === "phase" ? "Phase" : "Stage";
      return `${kind} ${sequence} of ${total} · ${this.nodeSchema.code}`;
    },
    persistedChildId(): string {
      const savedChildId = this.activeSubpages[this.nodeSchema.id];
      if (this.nodeSchema.subpages?.some(({ id }) => id === savedChildId)) {
        return savedChildId;
      }

      return this.nodeSchema.defaultSubpageId || this.nodeSchema.subpages?.[0]?.id || "";
    },
    previewSectionContext(): SectionContext | null {
      const targetKey = this.nodeSchema.documentTargets?.[0];
      const target = targetKey
        ? documentOutlineIndex(this.rootPageSchema.document?.outline).get(targetKey)
        : null;

      if (target) {
        return {
          documentTitle: this.rootPageSchema.title,
          number: target.number || "",
          partial: true,
          title: target.title
        };
      }

      if (this.nodeSchema.workflow) {
        return null;
      }

      if (!this.sectionPath.length) {
        return null;
      }

      return {
        documentTitle: this.rootPageSchema.title,
        number: this.sectionPath.join("."),
        partial: true,
        title: this.nodeSchema.title
      };
    }
  },
  watch: {
    persistedChildId: {
      immediate: true,
      handler(childId: string) {
        this.activeChildId = childId;
        if (!childId) {
          return;
        }

        this.$nextTick(() => {
          window.requestAnimationFrame(() => {
            document.getElementById(`${childId}-subtab`)?.scrollIntoView({
              behavior: "auto",
              block: "nearest",
              inline: "center"
            });
          });
        });
      }
    }
  },
  methods: {
    childIsComplete(child: SchemaNode) {
      if (child.form?.showCompletion === false) {
        return false;
      }

      return isFormComplete(child, asDataModel(this.dataModel[child.stateKey]), this.documentModel);
    },
    moveTab(offset: number) {
      const subpages = this.nodeSchema.subpages || [];
      if (!subpages.length) return;
      const currentIndex = subpages.findIndex(({ id }) => id === this.activeChildId);
      const nextIndex = (currentIndex + offset + subpages.length) % subpages.length;
      this.updateActiveChild(subpages[nextIndex].id);
      this.$nextTick(() => {
        const tab = document.getElementById(`${this.activeChildId}-subtab`);
        tab?.focus();
        tab?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "nearest", inline: "center" });
      });
    },
    selectChild(childId: string, event: Event) {
      this.updateActiveChild(childId);
      (event.currentTarget as HTMLElement | null)?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "nearest", inline: "center" });
    },
    updateActiveChild(childId: string) {
      this.activeChildId = childId;
      this.$emit("select-subpage", { nodeId: this.nodeSchema.id, childId });
    }
  },
  template: `
    <div class="subpage-node" :class="'subpage-depth-' + depth">
      <template v-if="nodeSchema.subpages?.length">
        <header v-if="depth > 0" class="subpage-level-heading">
          <div>
            <p class="section-kicker mb-1">{{ nodePositionLabel }}</p>
            <h3 class="h5 mb-1">{{ nodeSchema.title }}</h3>
            <p class="small text-body-secondary mb-0">{{ nodeSchema.description }}</p>
          </div>
          <div v-if="nodeHasCompletion" class="subpage-level-progress" aria-label="Phase completion">
            <strong>{{ nodeCompletion }}%</strong>
            <span>complete</span>
          </div>
        </header>

        <nav class="subpage-tabs-shell" :aria-label="nodeSchema.title + ' sections'" tabindex="0">
          <div class="nav nav-tabs subpage-tabs" role="tablist">
          <button
            v-for="child in nodeSchema.subpages"
            :id="child.id + '-subtab'"
            :key="child.id"
            class="nav-link"
            :class="{ active: activeChildId === child.id, 'is-form-complete': childIsComplete(child) }"
            type="button"
            role="tab"
            :aria-controls="child.id + '-subpanel'"
            :aria-selected="activeChildId === child.id"
            :tabindex="activeChildId === child.id ? 0 : -1"
            @click="selectChild(child.id, $event)"
            @keydown.left.prevent="moveTab(-1)"
            @keydown.right.prevent="moveTab(1)"
          >
            <span v-if="child.workflow?.sequence" class="workflow-tab-index">{{ String(child.workflow.sequence).padStart(2, '0') }}</span>
            <span :class="{ 'tab-label-complete': childIsComplete(child) }">{{ child.label }}</span>
            <tab-completion-check v-if="childIsComplete(child)"></tab-completion-check>
          </button>
          </div>
        </nav>

        <section
          :id="activeChild.id + '-subpanel'"
          class="subpage-panel"
          role="tabpanel"
          :aria-labelledby="activeChild.id + '-subtab'"
        >
          <subpage-node
            :key="activeChild.id"
            :active-subpages="activeSubpages"
            :node-schema="activeChild"
            :parent-schema="nodeSchema"
            :data-model="activeChildData"
            :document-model="documentModel"
            :document-schemas="documentSchemas"
            :root-page-id="rootPageId"
            :root-page-schema="rootPageSchema"
            :section-path="activeChildPath"
            :project-context="projectContext"
            :print-date-label="printDateLabel"
            :is-printing="isPrinting"
            :copied-section="copiedSection"
            :form-sidebar-visible="formSidebarVisible"
            :depth="depth + 1"
            @copy-markdown="$emit('copy-markdown', $event)"
            @navigate-workspace="$emit('navigate-workspace', $event)"
            @print="$emit('print', $event)"
            @select-subpage="$emit('select-subpage', $event)"
            @set-form-sidebar-visible="$emit('set-form-sidebar-visible', $event)"
          ></subpage-node>
        </section>
      </template>

      <template v-else-if="nodeSchema.sections?.length">
        <preview-navigation-control
          v-if="nodeSchema.previewComponent !== false"
          :form-id="nodeSchema.id + '-form-top'"
          :target-id="nodeSchema.id + '-preview'"
        >
          <form-sidebar-toggle
            v-if="!nodeSchema.form?.fullWidth && !formSidebarVisible"
            :visible="formSidebarVisible"
            @toggle="$emit('set-form-sidebar-visible', $event)"
          ></form-sidebar-toggle>
        </preview-navigation-control>
        <div :id="nodeSchema.id + '-form-top'" class="row g-4 form-workspace-row">
          <aside
            v-if="!nodeSchema.form?.fullWidth"
            class="col-lg-3 form-sidebar-column"
            :class="{ 'is-collapsed': !formSidebarVisible }"
            :aria-hidden="!formSidebarVisible"
          >
            <div class="card border-0 shadow-sm sticky-lg-top section-summary">
              <div class="card-body">
                <div class="form-sidebar-heading">
                  <p class="section-kicker mb-2">{{ nodeSchema.code }}</p>
                  <form-sidebar-toggle
                    :visible="formSidebarVisible"
                    @toggle="$emit('set-form-sidebar-visible', $event)"
                  ></form-sidebar-toggle>
                </div>
                <h3 class="h5">{{ nodeSchema.title }}</h3>
                <p class="small text-body-secondary">{{ nodeSchema.description }}</p>
                <form-progress
                  v-if="nodeSchema.form?.showCompletion !== false || nodeSchema.ai?.showInterview"
                  :page-schema="nodeSchema"
                  :data-model="dataModel"
                  :document-model="documentModel"
                  :document-schemas="documentSchemas"
                  :copied-section="copiedSection"
                  @copy-markdown="$emit('copy-markdown', $event)"
                ></form-progress>
                <nav class="section-links mt-4" :aria-label="nodeSchema.title + ' form sections'">
                  <a v-for="section in nodeSchema.sections" :key="section.key" :href="'#' + nodeSchema.id + '-' + section.id">{{ section.title }}</a>
                </nav>
              </div>
            </div>
          </aside>
          <div
            class="form-content-column"
            :class="nodeSchema.form?.fullWidth || !formSidebarVisible ? 'col-12' : 'col-lg-9'"
          >
            <page-guide :page-schema="nodeSchema"></page-guide>
            <form-progress
              v-if="nodeSchema.form?.fullWidth && (nodeSchema.form?.showCompletion !== false || nodeSchema.ai?.showInterview)"
              :page-schema="nodeSchema"
              :data-model="dataModel"
              :document-model="documentModel"
              :document-schemas="documentSchemas"
              :copied-section="copiedSection"
              @copy-markdown="$emit('copy-markdown', $event)"
            ></form-progress>
            <component
              :is="nodeSchema.formComponent || 'dynamic-form'"
              :page-schema="nodeSchema"
              :data-model="dataModel"
              :document-model="documentModel"
              :document-schemas="documentSchemas"
              :copied-section="copiedSection"
              @copy-markdown="$emit('copy-markdown', $event)"
              @navigate-workspace="$emit('navigate-workspace', $event)"
            ></component>
          </div>
        </div>
        <component
          v-if="nodeSchema.previewComponent !== false"
          :is="nodeSchema.previewComponent || 'document-preview'"
          :page-schema="nodeSchema"
          :document-config="rootPageSchema.document"
          :data-model="dataModel"
          :document-model="documentModel"
          :document-schemas="documentSchemas"
          :project-context="projectContext"
          :print-date-label="printDateLabel"
          :is-printing="isPrinting"
          :print-page-id="rootPageId"
          :section-context="previewSectionContext"
          @print="$emit('print', $event)"
        ></component>
      </template>

      <workflow-stage-overview
        v-else-if="nodeSchema.workflow?.kind === 'stage'"
        :node-schema="nodeSchema"
        :parent-schema="parentSchema"
        :root-schema="rootPageSchema"
      ></workflow-stage-overview>

      <div v-else class="card border-0 shadow-sm subpage-placeholder">
        <div class="card-body p-4 p-md-5">
          <div class="d-flex flex-wrap gap-3 align-items-start justify-content-between">
            <div>
              <p class="section-kicker mb-2">{{ nodeSchema.code }}</p>
              <h3 class="h4">{{ nodeSchema.title }}</h3>
              <p class="text-body-secondary mb-0">{{ nodeSchema.description }}</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span class="badge text-bg-light">Contributes to the full SRS</span>
            </div>
          </div>
          <p class="subpage-placeholder-note mb-0">This workspace is ready for schema-defined forms, shared-record references, file uploads, AI prompts, preview, and document output.</p>
        </div>
      </div>
    </div>
  `
});

export const SubpageWorkspace = defineComponent({
  components: { SubpageNode },
  emits: ["copy-markdown", "navigate-workspace", "print", "select-subpage", "set-form-sidebar-visible"],
  props: {
    activeSubpages: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<DataModel>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    formSidebarVisible: { type: Boolean, default: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    isPrinting: { type: Boolean, default: false },
    printDateLabel: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true }
  },
  template: `
    <div class="subpage-workspace">
      <header class="subpage-workspace-heading">
        <p class="section-kicker mb-1">{{ pageSchema.workspace?.kicker || pageSchema.code + ' workspace' }}</p>
        <h2 class="h4 mb-1">{{ pageSchema.workspace?.title || pageSchema.title }}</h2>
        <p class="text-body-secondary mb-0">{{ pageSchema.workspace?.summary || pageSchema.description }}</p>
        <p v-if="pageSchema.workspace?.note" class="subpage-workspace-note mb-0">{{ pageSchema.workspace.note }}</p>
      </header>
      <subpage-node
        :active-subpages="activeSubpages"
        :node-schema="pageSchema"
        :data-model="dataModel"
        :document-model="documentModel"
        :document-schemas="documentSchemas"
        :root-page-id="pageSchema.id"
        :root-page-schema="pageSchema"
        :section-path="[]"
        :project-context="projectContext"
        :print-date-label="printDateLabel"
        :is-printing="isPrinting"
        :copied-section="copiedSection"
        :form-sidebar-visible="formSidebarVisible"
        @copy-markdown="$emit('copy-markdown', $event)"
        @navigate-workspace="$emit('navigate-workspace', $event)"
        @print="$emit('print', $event)"
        @select-subpage="$emit('select-subpage', $event)"
        @set-form-sidebar-visible="$emit('set-form-sidebar-visible', $event)"
      ></subpage-node>
    </div>
  `
});
