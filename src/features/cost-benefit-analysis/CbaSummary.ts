import type { BenefitCashFlow, CashFlow } from './model-types.ts';
import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { calculate, numberValue } from "./calculations.ts";
import { currencyFormatter } from "./chart-model.ts";
import { CbaTrendChart } from "./CbaTrendChart.ts";

export const CbaModelSummary = defineComponent({
  components: { CbaTrendChart },
  props: {
    dataModel: { type: Object as PropType<DataModel>, required: true }
  },
  computed: {
    model(): ReturnType<typeof calculate> {
      return calculate(this.dataModel);
    }
  },
  methods: {
    currency(value: unknown) {
      return currencyFormatter(this.dataModel.currencyCode).format(numberValue(value));
    },
    percent(value: unknown) {
      return value === null
        ? "Not available"
        : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 }).format(numberValue(value) / 100);
    }
  },
  template: `
    <section class="card border-0 shadow-sm cba-live-model mt-4" aria-labelledby="cba-calculated-model-title">
      <div class="card-body p-4">
        <div class="d-flex flex-wrap gap-3 align-items-start justify-content-between mb-3">
          <div>
            <p class="section-kicker mb-1">Calculated output</p>
            <h3 id="cba-calculated-model-title" class="h5 mb-1">Live financial model</h3>
            <p class="text-body-secondary mb-0">Every value updates automatically from the benefit and cost schedules.</p>
          </div>
          <span class="badge text-bg-light">{{ model.periods }}-year analysis</span>
        </div>

        <dl class="cba-kpi-grid">
          <div><dt>Benefits in today's value (PV)</dt><dd>{{ currency(model.totalPresentValueBenefits) }}</dd></div>
          <div><dt>Costs in today's value (PV)</dt><dd>{{ currency(model.totalPresentValueCosts) }}</dd></div>
          <div><dt>Net value after costs (NPV)</dt><dd :class="{ 'text-danger': model.netPresentValue < 0 }">{{ currency(model.netPresentValue) }}</dd></div>
          <div><dt>Return on investment (ROI)</dt><dd>{{ percent(model.roiPercent) }}</dd></div>
          <div><dt>Discounted break-even</dt><dd>{{ model.breakEven.label }}</dd></div>
        </dl>

        <div v-if="model.warnings.length" class="alert alert-warning mt-3 mb-0" role="status">
          <strong>Model checks need attention.</strong>
          <ul class="mb-0 mt-1"><li v-for="warning in model.warnings" :key="warning">{{ warning }}</li></ul>
        </div>

        <cba-trend-chart
          class="mt-4"
          :currency-code="dataModel.currencyCode"
          id-prefix="cba-live-trend"
          :model="model"
        ></cba-trend-chart>

        <div class="cba-table-scroll mt-4">
          <table class="table table-sm align-middle mb-0">
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
      </div>
    </section>
  `
});
