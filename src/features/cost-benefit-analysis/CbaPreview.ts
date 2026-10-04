import type { BenefitCashFlow, CashFlow } from './model-types.ts';
import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { MarkdownText } from "../../components/preview/MarkdownText.ts";
import { documentDate } from "../../core/formatting/document-dates.ts";
import { formatDate as formatDocumentDate } from "../../core/formatting/dates.ts";
import { formatDocumentTitle } from "../../core/formatting/document-titles.ts";
import { displayValue as fallbackValue, hasValue as hasContent, resolveContextValue } from "../../core/records/record-values.ts";
import { PrintDocumentButton } from "../../components/controls/PrintButton.ts";
import { DocumentCoverPage } from "../../components/preview/DocumentCoverPage.ts";
import { PreviewWatermark } from "../../components/preview/PreviewWatermark.ts";
import { calculate, numberValue } from "./calculations.ts";
import { currencyFormatter } from "./chart-model.ts";
import { CbaTrendChart } from "./CbaTrendChart.ts";

export const CbaPreview = defineComponent({
  components: { MarkdownText, CbaTrendChart, DocumentCoverPage, PreviewWatermark, PrintDocumentButton },
  emits: ["print"],
  props: {
    dataModel: { type: Object as PropType<DataModel>, required: true },
    isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    printDateLabel: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true }
  },
  computed: {
    coverMetadataEntries(): MetadataEntry[] {
      return [
        { key: "analysisDate", label: "Analysis date", value: this.formatDate(this.documentValue("analysisDate")) },
        { key: "preparedBy", label: "Prepared by", value: this.displayValue(this.documentValue("preparedBy")) },
        { key: "analysisPeriod", label: "Analysis period", value: `${this.model.periods} years` },
        {
          key: "discountRate",
          label: "Discount rate",
          value: this.dataModel.discountRate === "" ? "Not provided (0% used)" : `${Number(this.dataModel.discountRate || 0).toFixed(2)}%`
        },
        { key: "currencyCode", label: "Currency", value: this.dataModel.currencyCode || "USD" },
        { key: "version", label: "Version", value: this.version }
      ].filter(item => !['analysisDate', 'preparedBy'].includes(item.key) || hasContent(this.documentValue(item.key)));
    },
    model(): ReturnType<typeof calculate> {
      return calculate(this.dataModel);
    },
    projectTitle(): unknown {
      return this.documentValue(this.pageSchema.document?.titleField || "projectName") || "";
    },
    version(): unknown {
      return this.documentValue(this.pageSchema.document?.versionField || "version") || "0.1";
    },
    documentTitle(): string {
      return formatDocumentTitle(this.projectTitle, this.pageSchema.title || this.pageSchema.label);
    },
    quantifiedBenefits(): BenefitCashFlow[] {
      return this.model.benefits.filter((item) => item.populated && !item.isIntangible);
    },
    intangibleBenefitRecords(): BenefitCashFlow[] {
      return this.model.benefits.filter((item) => item.populated && item.isIntangible);
    },
    populatedOneTimeCosts(): CashFlow[] {
      return this.model.oneTimeCosts.filter((item) => item.populated);
    },
    populatedOngoingCosts(): CashFlow[] {
      return this.model.ongoingCosts.filter((item) => item.populated);
    },
    estimateDetails(): { key: string; label: string; value: unknown }[] {
      return [
        ...this.model.benefits.map(item => ({ ...item, referenceId: `CBA-BEN-${String(item.id).padStart(3, '0')}` })),
        ...this.model.oneTimeCosts.map(item => ({ ...item, referenceId: `CBA-OTC-${String(item.id).padStart(3, '0')}` })),
        ...this.model.ongoingCosts.map(item => ({ ...item, referenceId: `CBA-OGC-${String(item.id).padStart(3, '0')}` }))
      ].filter(item => item.populated && (item.assumptions || item.sourceIds || (!item.isIntangible && item.description)));
    },
    populatedSources(): DataModel[] {
      return (this.dataModel.sources || []).filter((item) => !item._retired && !item.retired && (hasContent(item.item) || hasContent(item.sourceName) || hasContent(item.reference)));
    }
  },
  methods: {
    currency(value: unknown) {
      return currencyFormatter(this.dataModel.currencyCode).format(numberValue(value));
    },
    documentValue(key: string): unknown {
      if (key === "analysisDate") return documentDate(this.dataModel, key);
      return resolveContextValue(this.dataModel, this.projectContext, key);
    },
    displayValue(value: unknown) {
      return fallbackValue(value);
    },
    formatDate(value: unknown) {
      return formatDocumentDate(value);
    },
    percent(value: unknown) {
      return value === null
        ? "Not available"
        : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 }).format(value / 100);
    }
  },
  template: `
    <div :id="pageSchema.id + '-preview'" class="document-preview-section">
      <div class="preview-toolbar">
        <div>
          <p class="section-kicker mb-1">Live financial document</p>
          <h2 class="h4 mb-1">Preview</h2>
          <p class="text-body-secondary mb-0">Schedules and financial results update automatically.</p>
        </div>
        <print-document-button
          :is-printing="isPrinting"
          @print="$emit('print', pageSchema.id)"
        ></print-document-button>
      </div>

      <article class="document-preview cba-document is-print-target" :aria-label="pageSchema.label + ' document preview'">
        <header class="print-running-header" aria-hidden="true">
          <span>{{ documentTitle }}</span>
          <span>{{ printDateLabel }}</span>
        </header>

        <div class="document-content cba-document-content" :class="{ 'document-compact': pageSchema.compactPreview }">
          <preview-watermark :is-printing="isPrinting"></preview-watermark>
          <document-cover-page
            :document-code="pageSchema.code"
            :document-name="pageSchema.title || pageSchema.label"
            :metadata-entries="coverMetadataEntries"
            :project-title="projectTitle"
          ></document-cover-page>

          <div class="document-body document-body-after-cover">
          <section>
            <h2>1. Financial model and summary</h2>
            <dl class="cba-document-kpis">
              <div><dt>Nominal benefits</dt><dd>{{ currency(model.totalNominalBenefits) }}</dd></div>
              <div><dt>Nominal costs</dt><dd>{{ currency(model.totalNominalCosts) }}</dd></div>
              <div><dt>Benefits in today's value (PV)</dt><dd>{{ currency(model.totalPresentValueBenefits) }}</dd></div>
              <div><dt>Costs in today's value (PV)</dt><dd>{{ currency(model.totalPresentValueCosts) }}</dd></div>
              <div><dt>Net value after costs (NPV)</dt><dd>{{ currency(model.netPresentValue) }}</dd></div>
              <div><dt>Return on investment (ROI)</dt><dd>{{ percent(model.roiPercent) }}</dd></div>
              <div><dt>Discounted break-even</dt><dd>{{ model.breakEven.label }}</dd></div>
              <div><dt>Recommendation</dt><dd>{{ displayValue(dataModel.economicRecommendation) }}</dd></div>
            </dl>

            <cba-trend-chart
              class="cba-document-chart"
              :currency-code="dataModel.currencyCode"
              id-prefix="cba-document-trend"
              :model="model"
            ></cba-trend-chart>

            <div class="document-table-wrap">
              <table class="cba-summary-table">
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Benefits</th>
                    <th scope="col">Costs</th>
                    <th scope="col">Net cash flow</th>
                    <th scope="col">Discount factor</th>
                    <th scope="col">Benefits in today's value (PV)</th>
                    <th scope="col">Costs in today's value (PV)</th>
                    <th scope="col">Running net value (NPV)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in model.periodRows" :key="row.year">
                    <th scope="row">Year {{ row.year }}</th>
                    <td>{{ currency(row.totalBenefits) }}</td>
                    <td>{{ currency(row.totalCosts) }}</td>
                    <td>{{ currency(row.netCashFlow) }}</td>
                    <td>{{ row.discountFactor.toFixed(6) }}</td>
                    <td>{{ currency(row.presentValueBenefits) }}</td>
                    <td>{{ currency(row.presentValueCosts) }}</td>
                    <td>{{ currency(row.cumulativeNetPresentValue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <template v-if="dataModel.financialInterpretation"><h3>Decision basis and key uncertainty</h3>
              <markdown-text :value="dataModel.financialInterpretation"></markdown-text></template>
            <template v-if="dataModel.modelAssumptions"><h3>Model assumptions</h3>
              <markdown-text :value="dataModel.modelAssumptions"></markdown-text></template>
            <template v-if="model.warnings.length">
              <h3>1.3 Model checks requiring attention</h3>
              <ul><li v-for="warning in model.warnings" :key="warning">{{ warning }}</li></ul>
            </template>
          </section>

          <section>
            <h2>2. Expected benefit calculations</h2>
            <div class="document-table-wrap">
              <table class="cba-wide-table">
                <thead>
                  <tr>
                    <th scope="col">ID / Benefit</th>
                    <th scope="col">Baseline annual value</th>
                    <th scope="col">Target annual value</th>
                    <th scope="col">Full annual benefit</th>
                    <th v-for="year in model.years" :key="year" scope="col">Year {{ year }}</th>
                    <th scope="col">Total in today's value (PV)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in quantifiedBenefits" :key="item.id">
                    <th scope="row">CBA-BEN-{{ String(item.id).padStart(3, '0') }} · {{ displayValue(item.name) }}</th>
                    <td>{{ currency(item.baselineAnnual) }}</td>
                    <td>{{ currency(item.targetAnnual) }}</td>
                    <td>{{ currency(item.fullAnnualBenefit) }}</td>
                    <td v-for="year in model.years" :key="year">{{ currency(item.series[year]) }}</td>
                    <td>{{ currency(item.presentValueTotal) }}</td>
                  </tr>
                  <tr v-if="!quantifiedBenefits.length"><td :colspan="model.years.length + 5" class="document-empty">No quantified benefits provided.</td></tr>
                </tbody>
              </table>
            </div>
            <h3 v-if="intangibleBenefitRecords.length">2.1 Benefits not expressed in money</h3>
            <ul v-if="intangibleBenefitRecords.length">
              <li v-for="item in intangibleBenefitRecords" :key="item.id"><strong>{{ displayValue(item.name) }}:</strong> <markdown-text :value="item.description"></markdown-text></li>
            </ul>

          </section>

          <section>
            <h2>3. Cost schedules</h2>
            <h3>3.1 One-time costs</h3>
            <div class="document-table-wrap">
              <table>
                <thead><tr><th scope="col">ID / Cost</th><th scope="col">Occurrence</th><th scope="col">Amount</th><th scope="col">Amount in today's value (PV)</th><th scope="col">Source IDs</th></tr></thead>
                <tbody>
                  <tr v-for="(item, index) in populatedOneTimeCosts" :key="item.id">
                    <th scope="row">CBA-OTC-{{ String(item.id).padStart(3, '0') }} · {{ displayValue(item.name) }}</th>
                    <td>Year {{ item.occurrenceYear }}</td><td>{{ currency(item.amount) }}</td><td>{{ currency(item.presentValueTotal) }}</td><td>{{ displayValue(item.sourceIds) }}</td>
                  </tr>
                  <tr v-if="!populatedOneTimeCosts.length"><td colspan="5" class="document-empty">No one-time costs provided.</td></tr>
                </tbody>
              </table>
            </div>

            <h3>3.2 Ongoing costs</h3>
            <div class="document-table-wrap">
              <table class="cba-wide-table">
                <thead>
                  <tr><th scope="col">ID / Cost</th><th scope="col">Schedule</th><th v-for="year in model.years" :key="year" scope="col">Year {{ year }}</th><th scope="col">Total in today's value (PV)</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in populatedOngoingCosts" :key="item.id">
                    <th scope="row">CBA-OGC-{{ String(item.id).padStart(3, '0') }} · {{ displayValue(item.name) }}</th>
                    <td>{{ displayValue(item.scheduleType) }}</td><td v-for="year in model.years" :key="year">{{ currency(item.series[year]) }}</td><td>{{ currency(item.presentValueTotal) }}</td>
                  </tr>
                  <tr v-if="!populatedOngoingCosts.length"><td :colspan="model.years.length + 3" class="document-empty">No ongoing costs provided.</td></tr>
                </tbody>
              </table>
            </div>
            <template v-if="dataModel.intangibleCosts"><h3>3.3 Nonfinancial drawbacks</h3>
              <markdown-text :value="dataModel.intangibleCosts"></markdown-text></template>
          </section>

          <section>
            <h2>4. Estimate basis and sources</h2>
            <dl v-if="estimateDetails.length">
              <template v-for="item in estimateDetails" :key="item.referenceId">
                <dt>{{ item.referenceId }} — {{ item.name }}</dt>
                <dd><markdown-text v-if="item.description && !item.isIntangible" :value="item.description"></markdown-text>
                  <markdown-text v-if="item.assumptions" :value="item.assumptions"></markdown-text>
                  <p v-if="item.sourceIds">Sources: {{ item.sourceIds }}</p></dd>
              </template>
            </dl>
            <div v-if="populatedSources.length" class="document-source-list">
              <article v-for="item in populatedSources" :key="item.id">
                <strong>CBA-SRC-{{ String(item.id).padStart(3, '0') }}<template v-if="item.item"> · {{ item.item }}</template>:</strong>
                <span v-if="item.sourceType"> {{ item.sourceType }}.</span>
                <span v-if="item.sourceName"> {{ item.sourceName }}.</span>
                <span v-if="item.asOfDate"> As of {{ formatDate(item.asOfDate) }}.</span>
                <span v-if="item.reference"> {{ item.reference }}</span>
                <markdown-text v-if="item.notes" :value="item.notes"></markdown-text>
              </article>
            </div>
          </section>
          </div>
        </div>

        <footer class="print-running-footer" aria-hidden="true">
          <span>{{ projectTitle || "Untitled Dynamic SRS" }}</span>
          <span class="print-page-number">Page </span>
          <span>{{ pageSchema.code }} · v{{ version }}</span>
        </footer>
      </article>
    </div>
  `
});
