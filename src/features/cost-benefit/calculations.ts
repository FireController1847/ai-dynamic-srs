import type { CostBenefitAnalysis, FinancialBenefit, FinancialCost } from './model.ts';

export interface FinancialYear {
  year: number;
  benefits: number;
  costs: number;
  net: number;
  presentBenefits: number;
  presentCosts: number;
  presentNet: number;
  cumulativeNet: number;
  cumulativePresentNet: number;
}
export interface FinancialSummary {
  totalBenefits: number;
  totalCosts: number;
  netCashFlow: number;
  presentBenefits: number;
  presentCosts: number;
  npv: number;
  roiPercent: number | null;
  benefitCostRatio: number | null;
  paybackYear: number | null;
}
export interface FinancialProjection {
  years: FinancialYear[];
  summary: FinancialSummary | null;
  missing: string[];
  error: string;
}

/** A blank financial driver is unknown, not an implicit zero-dollar estimate. */
export function estimatedAnnualBenefit(item: FinancialBenefit): number | null {
  if (!item.name.trim()) return null;
  if (item.method === 'annual') return item.annualAmount;
  if (item.units === null || item.valuePerUnit === null || item.changePercent === null) return null;
  const result = item.units * item.valuePerUnit * item.changePercent / 100;
  return Number.isFinite(result) ? result : null;
}
export function costComplete(item: FinancialCost): boolean {
  return !!item.name.trim() && item.amount !== null &&
    (item.timing !== 'periodic' || item.intervalYears !== null);
}
export function benefitInYear(item: FinancialBenefit, year: number, horizon: number): number {
  const amount = estimatedAnnualBenefit(item);
  if (amount === null || year === 0) return 0;
  return item.profile === 'ramp' ? amount * year / horizon : amount;
}
export function costInYear(item: FinancialCost, year: number): number {
  if (!costComplete(item)) return 0;
  const amount = item.amount as number;
  if (item.timing === 'upfront') return year === 0 ? amount : 0;
  if (year < item.firstYear) return 0;
  if (item.timing === 'scheduled') return year === item.firstYear ? amount : 0;
  if (item.timing === 'annual') return amount;
  return (year - item.firstYear) % (item.intervalYears as number) === 0 ? amount : 0;
}

/**
 * Time 0 = the initial investment (undiscounted).
 * Years 1..N = end-of-year benefits and operating/periodic expenses.
 * PV(year) = cash flow / (1 + discountRatePercent / 100)^year.
 * ROI is nominal (undiscounted); payback is the first full year with
 * nonnegative cumulative nominal cash flow, not a fractional-year promise.
 */
export function calculateProjection(analysis: CostBenefitAnalysis): FinancialProjection {
  const missing: string[] = [];
  if (analysis.projectionYears === null) missing.push('Projection period');
  if (analysis.discountRatePercent === null) missing.push('Discount rate');
  for (const item of analysis.benefits) {
    if (estimatedAnnualBenefit(item) === null) missing.push('Benefit: ' + (item.name || '(unnamed)'));
  }
  for (const item of analysis.costs) {
    if (!costComplete(item)) missing.push('Cost: ' + (item.name || '(unnamed)'));
  }
  if (!analysis.benefits.length && !analysis.costs.length) missing.push('At least one benefit or cost');
  if (analysis.projectionYears === null) return { years: [], summary: null, missing, error: '' };

  const rate = analysis.discountRatePercent === null ? 0 : analysis.discountRatePercent / 100;
  const projected: FinancialYear[] = [];
  let cumNet = 0;
  let cumPresent = 0;
  let totalBenefits = 0;
  let totalCosts = 0;
  let presentBenefits = 0;
  let presentCosts = 0;
  let paybackYear: number | null = null;
  for (let year = 0; year <= analysis.projectionYears; year += 1) {
    const benefits = year === 0 ? 0 :
      analysis.benefits.reduce((sum, item) => sum + benefitInYear(item, year, analysis.projectionYears as number), 0);
    const costs = analysis.costs.reduce((sum, item) => sum + costInYear(item, year), 0);
    const divisor = Math.pow(1 + rate, year);
    const net = benefits - costs;
    const pvBenefits = benefits / divisor;
    const pvCosts = costs / divisor;
    const pvNet = pvBenefits - pvCosts;
    cumNet += net;
    cumPresent += pvNet;
    totalBenefits += benefits;
    totalCosts += costs;
    presentBenefits += pvBenefits;
    presentCosts += pvCosts;
    const values = [benefits, costs, divisor, net, pvBenefits, pvCosts, pvNet, cumNet, cumPresent];
    if (values.some(value => !Number.isFinite(value)) || divisor === 0) {
      return { years: [], summary: null, missing, error: 'Financial inputs exceed the numeric range supported by the calculator.' };
    }
    projected.push({
      year, benefits, costs, net, presentBenefits: pvBenefits, presentCosts: pvCosts,
      presentNet: pvNet, cumulativeNet: cumNet, cumulativePresentNet: cumPresent,
    });
    if (year > 0 && paybackYear === null && cumNet >= 0) paybackYear = year;
  }
  // Partial line items and omitted discount assumptions must not generate a feasibility verdict.
  const complete = missing.length === 0;
  const summary = complete ? {
    totalBenefits, totalCosts, netCashFlow: totalBenefits - totalCosts,
    presentBenefits, presentCosts, npv: presentBenefits - presentCosts,
    roiPercent: totalCosts > 0 ? (totalBenefits - totalCosts) / totalCosts * 100 : null,
    benefitCostRatio: presentCosts > 0 ? presentBenefits / presentCosts : null,
    paybackYear,
  } : null;
  return { years: projected, summary, missing, error: '' };
}
