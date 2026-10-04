import type { FinancialModel } from './model-types.ts';
function currencyFormatter(code: unknown) {
  if (code === "Other") {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(code || "USD"),
      maximumFractionDigits: 2
    });
  } catch {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  }
}

function buildChart(model: FinancialModel) {
  const width = 760;
  const height = 300;
  const margins = { top: 18, right: 22, bottom: 42, left: 82 };
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;
  const definitions = [
    { key: "presentValueBenefits", label: "Benefits in today's value", className: "benefits" },
    { key: "presentValueCosts", label: "Costs in today's value", className: "costs" },
    { key: "cumulativeNetPresentValue", label: "Cumulative net value", className: "net" }
  ];
  const values = model.periodRows.flatMap((row) => definitions.map(({ key }) => row[key]));
  let minimum = Math.min(0, ...values);
  let maximum = Math.max(0, ...values);

  if (minimum === maximum) {
    maximum = minimum + 1;
  } else {
    const padding = (maximum - minimum) * 0.08;
    minimum -= padding;
    maximum += padding;
  }

  const range = maximum - minimum;
  const x = (index: number) => margins.left + ((model.periodRows.length === 1 ? 0 : index / (model.periodRows.length - 1)) * plotWidth);
  const y = (value: number) => margins.top + (((maximum - value) / range) * plotHeight);
  const series = definitions.map((definition) => ({
    ...definition,
    points: model.periodRows.map((row, index) => `${x(index).toFixed(2)},${y(row[definition.key]).toFixed(2)}`).join(" "),
    markers: model.periodRows.map((row, index) => ({ x: x(index), y: y(row[definition.key]), value: row[definition.key], year: row.year }))
  }));
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = maximum - ((range * index) / 4);
    return { value, y: y(value) };
  });

  return {
    width,
    height,
    margins,
    plotWidth,
    plotHeight,
    zeroY: y(0),
    series,
    ticks,
    years: model.periodRows.map((row, index) => ({ year: row.year, x: x(index) }))
  };
}

export { buildChart, currencyFormatter };
