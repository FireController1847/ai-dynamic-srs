import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { documentDate } from "../../core/formatting/document-dates.ts";
import { formatDate } from "../../core/formatting/dates.ts";
import { formatDocumentTitle } from "../../core/formatting/document-titles.ts";
import { displayValue, resolveContextValue } from "../../core/records/record-values.ts";
import { PrintDocumentButton } from "../../components/controls/PrintButton.ts";
import { DocumentCoverPage } from "../../components/preview/DocumentCoverPage.ts";
import { PreviewWatermark } from "../../components/preview/PreviewWatermark.ts";
import { calculateEffortBreakdown } from "./calculations.ts";

export const EffortBreakdownPreview = defineComponent({
  components: { DocumentCoverPage, PreviewWatermark, PrintDocumentButton },
  emits: ["print"],
  props: {
    dataModel: { type: Object as PropType<DataModel>, required: true }, isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }, printDateLabel: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true }
  },
  computed: {
    coverMetadataEntries(): MetadataEntry[] {
      return [
        { key: "preparedBy", label: "Prepared by", value: displayValue(this.dataModel.preparedBy) },
        { key: "preparationDate", label: "Date", value: formatDate(documentDate(this.dataModel, "preparationDate")) },
        { key: "version", label: "Version", value: this.version },
        { key: "totalPoints", label: "Total project points", value: this.points(this.model.totalPoints) }
      ];
    },
    model(): ReturnType<typeof calculateEffortBreakdown> { return calculateEffortBreakdown(this.dataModel); },
    projectTitle(): unknown { return this.documentValue("projectName") || ""; },
    version(): unknown { return this.dataModel.version || "0.1"; },
    documentTitle(): string { return formatDocumentTitle(this.projectTitle, this.pageSchema.title || this.pageSchema.label); },
    memberNames(): string[] { return [1, 2, 3, 4, 5].map((number) => this.dataModel[`member${number}Name`] || `Member ${number}`); }
  },
  methods: {
    displayValue, formatDate,
    documentValue(key: string): unknown { return resolveContextValue(this.dataModel, this.projectContext, key); },
    points(value: unknown) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value); },
    percent(value: unknown) { return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)}%`; }
  },
  template: `
    <div :id="pageSchema.id + '-preview'" class="document-preview-section">
      <div class="preview-toolbar">
        <div><p class="section-kicker mb-1">Live responsibility matrix</p><h2 class="h4 mb-1">Preview</h2><p class="text-body-secondary mb-0">Completion and weighted member totals update automatically.</p></div>
        <print-document-button :is-printing="isPrinting" @print="$emit('print', pageSchema.id)"></print-document-button>
      </div>
      <article class="document-preview effort-breakdown-document is-print-target" :aria-label="pageSchema.label + ' document preview'">
        <header class="print-running-header" aria-hidden="true"><span>{{ documentTitle }}</span><span>{{ printDateLabel }}</span></header>
        <div class="document-content">
          <preview-watermark :is-printing="isPrinting"></preview-watermark>
          <document-cover-page
            :document-code="pageSchema.code"
            :document-name="pageSchema.title || pageSchema.label"
            :metadata-entries="coverMetadataEntries"
            :project-title="projectTitle"
          ></document-cover-page>
          <div class="document-body document-body-after-cover">
          <section>
            <h2>1. Responsibility Matrix</h2>
            <p>Each task should total 100%. Member totals weight each allocation percentage by the task's point value.</p>
            <div class="document-table-wrap"><table class="effort-breakdown-table">
              <thead><tr><th scope="col">Task name</th><th scope="col">Points</th><th v-for="(name, index) in memberNames" :key="index" scope="col">{{ name }}</th><th scope="col">Task completion</th></tr></thead>
              <tbody><tr v-for="task in model.tasks" :key="task.id">
                <th scope="row">{{ displayValue(task.taskName) }}</th><td>{{ points(task.points) }}</td>
                <td v-for="(allocation, index) in task.allocations" :key="index">{{ percent(allocation) }}</td>
                <td :class="{ 'effort-total-warning': task.completion !== 100 }">{{ percent(task.completion) }}</td>
              </tr></tbody>
              <tfoot><tr><th scope="row">Member totals</th><td>{{ points(model.totalPoints) }}</td><td v-for="(total, index) in model.memberTotals" :key="index">{{ points(total) }}</td><td>{{ percent(model.completion) }} avg.</td></tr></tfoot>
            </table></div>
          </section>
          <section v-if="dataModel.allocationNotes"><h2>2. Allocation Notes</h2><p class="preserve-lines">{{ dataModel.allocationNotes }}</p></section>
          </div>
        </div>
        <footer class="print-running-footer" aria-hidden="true"><span>{{ projectTitle || "Untitled Dynamic SRS" }}</span><span class="print-page-number">Page </span><span>EB · v{{ version }}</span></footer>
      </article>
    </div>`
});
