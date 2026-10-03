import { hasValue as hasContent } from "../../core/records/record-values.js";

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerValue(value, fallback = 0) {
  return Math.round(numberValue(value, fallback));
}

function sum(values) {
  return values.reduce((total, value) => total + numberValue(value), 0);
}

function periodSeries(periods, callback) {
  return Array.from({ length: periods + 1 }, (_, year) => callback(year));
}

function calculateBenefit(item, periods, discountFactor) {
  const isIntangible = item.benefitType === "Intangible or non-monetized";
  const baselineAnnual = numberValue(item.baselineQuantity)
    * numberValue(item.baselineUnitValue)
    * (numberValue(item.baselineFactor, 100) / 100);
  const targetAnnual = numberValue(item.targetQuantity)
    * numberValue(item.targetUnitValue)
    * (numberValue(item.targetFactor, 100) / 100);
  const directAnnual = numberValue(item.directAnnualBenefit);
  const fullAnnualBenefit = item.calculationMethod === "Direct annual benefit"
    ? directAnnual
    : item.benefitDirection === "Baseline less target"
      ? baselineAnnual - targetAnnual
      : targetAnnual - baselineAnnual;
  const startYear = Math.max(1, integerValue(item.startYear, 1));
  const targetYear = Math.max(startYear, integerValue(item.targetYear, periods));

  const series = periodSeries(periods, (year) => {
    if (year === 0 || isIntangible) {
      return 0;
    }

    if (item.realizationPattern === "Custom yearly amounts") {
      return numberValue(Array.isArray(item.annualValues) ? item.annualValues[year - 1] : 0);
    }

    if (year < startYear) {
      return 0;
    }

    if (item.realizationPattern === "Full benefit from start year") {
      return fullAnnualBenefit;
    }

    const rampPeriods = Math.max(1, targetYear - startYear + 1);
    const realizedPeriods = Math.min(rampPeriods, year - startYear + 1);
    return fullAnnualBenefit * (realizedPeriods / rampPeriods);
  });

  return {
    ...item,
    baselineAnnual,
    targetAnnual,
    fullAnnualBenefit,
    isIntangible,
    populated: hasContent(item.name) || hasContent(item.description) || series.some((value) => value !== 0),
    series,
    nominalTotal: sum(series),
    presentValueTotal: sum(series.map((value, year) => value / discountFactor(year)))
  };
}

function calculateOneTimeCost(item, periods, discountFactor) {
  const amount = Math.max(0, numberValue(item.amount));
  const occurrenceYear = integerValue(item.occurrenceYear, 0);
  const series = periodSeries(periods, (year) => year === occurrenceYear ? amount : 0);

  return {
    ...item,
    populated: hasContent(item.name) || amount !== 0,
    series,
    nominalTotal: sum(series),
    presentValueTotal: sum(series.map((value, year) => value / discountFactor(year)))
  };
}

function calculateOngoingCost(item, periods, discountFactor) {
  const amount = Math.max(0, numberValue(item.amount));
  const startYear = Math.max(1, integerValue(item.startYear, 1));
  const endYear = Math.max(startYear, integerValue(item.endYear, periods));
  const recurrenceInterval = Math.max(1, integerValue(item.recurrenceInterval, 1));
  const annualGrowthRate = numberValue(item.annualGrowthRate) / 100;

  const series = periodSeries(periods, (year) => {
    if (year === 0) {
      return 0;
    }

    if (item.scheduleType === "Custom yearly amounts") {
      return Math.max(0, numberValue(Array.isArray(item.annualValues) ? item.annualValues[year - 1] : 0));
    }

    if (year < startYear) {
      return 0;
    }

    if (item.scheduleType === "Recurring interval") {
      return (year - startYear) % recurrenceInterval === 0 ? amount : 0;
    }

    if (year > endYear) {
      return 0;
    }

    if (item.scheduleType === "Annual growth") {
      return amount * ((1 + annualGrowthRate) ** (year - startYear));
    }

    return amount;
  });

  return {
    ...item,
    populated: hasContent(item.name) || amount !== 0 || series.some((value) => value !== 0),
    series,
    nominalTotal: sum(series),
    presentValueTotal: sum(series.map((value, year) => value / discountFactor(year)))
  };
}

function calculateBreakEven(periodRows, totalPresentValueCosts) {
  if (totalPresentValueCosts <= 0) {
    return { value: null, label: "Not applicable — no quantified costs" };
  }

  for (let index = 1; index < periodRows.length; index += 1) {
    const previous = periodRows[index - 1];
    const current = periodRows[index];

    if (previous.cumulativeNetPresentValue < 0 && current.cumulativeNetPresentValue >= 0 && current.netPresentValue > 0) {
      const fraction = Math.min(1, Math.abs(previous.cumulativeNetPresentValue) / current.netPresentValue);
      const value = Math.max(0, current.year - 1 + fraction);
      return { value, label: `${value.toFixed(2)} years` };
    }

    if (index === 1
      && previous.cumulativeNetPresentValue === 0
      && current.cumulativeNetPresentValue >= 0
      && current.presentValueBenefits > 0
      && current.presentValueCosts > 0) {
      const value = Math.min(1, current.presentValueCosts / current.presentValueBenefits);
      return { value, label: `${value.toFixed(2)} years (within Year 1)` };
    }
  }

  const finalRow = periodRows.at(-1);
  if (finalRow?.cumulativeNetPresentValue >= 0) {
    return { value: 0, label: "Immediate within the modeled period" };
  }

  return { value: null, label: "Beyond the analysis period" };
}

function calculate(dataModel) {
  const periods = Math.min(10, Math.max(1, integerValue(dataModel.analysisYears, 5)));
  const discountRate = Math.max(-0.99, numberValue(dataModel.discountRate, 0) / 100);
  const beginningOfYear = dataModel.timingConvention === "Beginning of each year";
  const discountFactor = (year) => {
    const exponent = year === 0 ? 0 : beginningOfYear ? year - 1 : year;
    return (1 + discountRate) ** exponent;
  };

  const benefits = (dataModel.benefits || []).filter(item => !item._retired && !item.retired).map((item) => calculateBenefit(item, periods, discountFactor));
  const oneTimeCosts = (dataModel.oneTimeCosts || []).filter(item => !item._retired && !item.retired).map((item) => calculateOneTimeCost(item, periods, discountFactor));
  const ongoingCosts = (dataModel.ongoingCosts || []).filter(item => !item._retired && !item.retired).map((item) => calculateOngoingCost(item, periods, discountFactor));
  let cumulativeBenefits = 0;
  let cumulativeCosts = 0;
  let cumulativeNetPresentValue = 0;

  const periodRows = periodSeries(periods, (year) => {
    const totalBenefits = sum(benefits.map((item) => item.series[year]));
    const oneTimeCostTotal = sum(oneTimeCosts.map((item) => item.series[year]));
    const ongoingCostTotal = sum(ongoingCosts.map((item) => item.series[year]));
    const totalCosts = oneTimeCostTotal + ongoingCostTotal;
    const factor = discountFactor(year);
    const presentValueBenefits = totalBenefits / factor;
    const presentValueCosts = totalCosts / factor;
    const netCashFlow = totalBenefits - totalCosts;
    const netPresentValue = presentValueBenefits - presentValueCosts;
    cumulativeBenefits += presentValueBenefits;
    cumulativeCosts += presentValueCosts;
    cumulativeNetPresentValue += netPresentValue;

    return {
      year,
      totalBenefits,
      oneTimeCostTotal,
      ongoingCostTotal,
      totalCosts,
      netCashFlow,
      discountFactor: factor,
      presentValueBenefits,
      presentValueCosts,
      netPresentValue,
      cumulativeBenefits,
      cumulativeCosts,
      cumulativeNetPresentValue
    };
  });

  const totalNominalBenefits = sum(periodRows.map((row) => row.totalBenefits));
  const totalNominalCosts = sum(periodRows.map((row) => row.totalCosts));
  const totalPresentValueBenefits = sum(periodRows.map((row) => row.presentValueBenefits));
  const totalPresentValueCosts = sum(periodRows.map((row) => row.presentValueCosts));
  const netPresentValue = totalPresentValueBenefits - totalPresentValueCosts;
  const roiPercent = totalPresentValueCosts > 0
    ? (netPresentValue / totalPresentValueCosts) * 100
    : null;
  const warnings = [];

  if (!hasContent(dataModel.discountRate)) {
    warnings.push("No discount rate is confirmed; present-value calculations currently use 0%.");
  }
  if (!benefits.some((item) => item.populated && !item.isIntangible && item.nominalTotal !== 0)) {
    warnings.push("No quantified benefit cash flows are currently included.");
  }
  if (totalNominalCosts === 0) {
    warnings.push("No quantified costs are currently included, so ROI and break-even cannot be evaluated.");
  }
  for (const item of oneTimeCosts.filter((cost) => cost.populated && integerValue(cost.occurrenceYear) > periods)) {
    warnings.push(`${item.name || "A one-time cost"} occurs after the selected analysis period and is excluded from totals.`);
  }
  for (const item of benefits.filter((benefit) => benefit.populated && integerValue(benefit.startYear, 1) > periods)) {
    warnings.push(`${item.name || "A benefit"} begins after the selected analysis period and contributes no modeled value.`);
  }
  for (const item of ongoingCosts.filter((cost) => cost.populated && integerValue(cost.startYear, 1) > periods)) {
    warnings.push(`${item.name || "An ongoing cost"} begins after the selected analysis period and is excluded from totals.`);
  }

  return {
    periods,
    years: Array.from({ length: periods }, (_, index) => index + 1),
    discountRate,
    benefits,
    oneTimeCosts,
    ongoingCosts,
    periodRows,
    totalNominalBenefits,
    totalNominalCosts,
    totalPresentValueBenefits,
    totalPresentValueCosts,
    netPresentValue,
    roiPercent,
    breakEven: calculateBreakEven(periodRows, totalPresentValueCosts),
    warnings
  };
}

export { calculate, numberValue };
