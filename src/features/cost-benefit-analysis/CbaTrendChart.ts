import type { BenefitCashFlow, CashFlow } from './model-types.ts';
import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import type { calculate } from './calculations.ts';
import { buildChart, currencyFormatter } from "./chart-model.ts";

export const CbaTrendChart = defineComponent({
  props: {
    currencyCode: { type: String, default: "USD" },
    idPrefix: { type: String, required: true },
    model: { type: Object as PropType<ReturnType<typeof calculate>>, required: true }
  },
  computed: {
    chart(): ReturnType<typeof buildChart> {
      return buildChart(this.model);
    }
  },
  methods: {
    compactCurrency(value: unknown) {
      const options = this.currencyCode && this.currencyCode !== "Other"
        ? { style: "currency", currency: this.currencyCode, notation: "compact", maximumFractionDigits: 1 }
        : { notation: "compact", maximumFractionDigits: 1 };
      return new Intl.NumberFormat(undefined, options).format(value);
    },
    currency(value: unknown) {
      return currencyFormatter(this.currencyCode).format(value);
    }
  },
  template: `
    <figure class="cba-chart-card">
      <figcaption>
        <strong>Present-value cash-flow trend</strong>
        <span>Compares each year's benefits and costs in today's value with the running net result.</span>
      </figcaption>
      <div class="cba-chart-legend" aria-hidden="true">
        <span class="benefits">Benefits in today's value</span>
        <span class="costs">Costs in today's value</span>
        <span class="net">Cumulative net value</span>
      </div>
      <svg
        class="cba-chart"
        :viewBox="'0 0 ' + chart.width + ' ' + chart.height"
        role="img"
        :aria-labelledby="idPrefix + '-title ' + idPrefix + '-description'"
      >
        <title :id="idPrefix + '-title'">Present-value benefits, costs, and cumulative net value by year</title>
        <desc :id="idPrefix + '-description'">A line chart generated from the current financial model. Exact values are available in the accompanying table.</desc>
        <g class="cba-chart-grid">
          <g v-for="tick in chart.ticks" :key="tick.y">
            <line :x1="chart.margins.left" :x2="chart.margins.left + chart.plotWidth" :y1="tick.y" :y2="tick.y"></line>
            <text :x="chart.margins.left - 10" :y="tick.y + 4" text-anchor="end">{{ compactCurrency(tick.value) }}</text>
          </g>
          <line class="zero-line" :x1="chart.margins.left" :x2="chart.margins.left + chart.plotWidth" :y1="chart.zeroY" :y2="chart.zeroY"></line>
          <g v-for="item in chart.years" :key="item.year">
            <line :x1="item.x" :x2="item.x" :y1="chart.margins.top" :y2="chart.margins.top + chart.plotHeight"></line>
            <text :x="item.x" :y="chart.height - 14" text-anchor="middle">Year {{ item.year }}</text>
          </g>
        </g>
        <g v-for="series in chart.series" :key="series.key" class="cba-chart-series" :class="series.className">
          <polyline :points="series.points"></polyline>
          <circle v-for="marker in series.markers" :key="marker.year" :cx="marker.x" :cy="marker.y" r="3">
            <title>Year {{ marker.year }}: {{ series.label }} {{ currency(marker.value) }}</title>
          </circle>
        </g>
      </svg>
    </figure>
  `
});
