import type { DataModel } from '../../core/schema/schema-types.ts';

export interface CashFlow extends DataModel {
  populated: boolean; series: number[]; nominalTotal: number; presentValueTotal: number;
}
export interface BenefitCashFlow extends CashFlow {
  baselineAnnual: number; targetAnnual: number; fullAnnualBenefit: number; isIntangible: boolean;
}
export interface PeriodRow {
  [key: string]: number;
  year: number; totalBenefits: number; oneTimeCostTotal: number; ongoingCostTotal: number;
  totalCosts: number; netCashFlow: number; discountFactor: number; presentValueBenefits: number;
  presentValueCosts: number; netPresentValue: number; cumulativeBenefits: number;
  cumulativeCosts: number; cumulativeNetPresentValue: number;
}
export interface FinancialModel {
  periods: number; years: number[]; discountRate: number;
  benefits: BenefitCashFlow[]; oneTimeCosts: CashFlow[]; ongoingCosts: CashFlow[];
  periodRows: PeriodRow[]; totalNominalBenefits: number; totalNominalCosts: number;
  totalPresentValueBenefits: number; totalPresentValueCosts: number;
  netPresentValue: number; roiPercent: number | null;
  breakEven: { value: number | null; label: string }; warnings: string[];
}
