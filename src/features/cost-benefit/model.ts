import type { JsonValue, PortableRecord } from '../../core/workspace/dsrs-format.ts';

export const CBA_KIND = 'cba.analysis';
export const CBA_ID = 'main';

export type BenefitMethod = 'annual' | 'drivers';
export type BenefitProfile = 'level' | 'ramp';
export type CostTiming = 'upfront' | 'annual' | 'scheduled' | 'periodic';

export interface FinancialBenefit extends Record<string, JsonValue> {
  id: string;
  name: string;
  method: BenefitMethod;
  // A direct annual estimate, or annual volume × unit impact × change %.
  annualAmount: number | null;
  units: number | null;
  valuePerUnit: number | null;
  changePercent: number | null;
  profile: BenefitProfile;
  source: string;
  explanation: string;
}

export interface FinancialCost extends Record<string, JsonValue> {
  id: string;
  name: string;
  timing: CostTiming;
  amount: number | null;
  // Upfront occurs at year 0. Other schedules start at a specified projection year.
  firstYear: number;
  intervalYears: number | null;
  source: string;
  explanation: string;
}

export interface CostBenefitAnalysis extends Record<string, JsonValue> {
  version: 1;
  projectionYears: number | null;
  discountRatePercent: number | null;
  currency: string;
  preparedBy: string;
  date: string;
  notes: string;
  benefits: FinancialBenefit[];
  costs: FinancialCost[];
}

export function emptyAnalysis(): CostBenefitAnalysis {
  return {
    version: 1, projectionYears: null, discountRatePercent: null,
    currency: 'USD', preparedBy: '', date: '', notes: '',
    benefits: [], costs: [],
  };
}

export function copyAnalysis(value: CostBenefitAnalysis): CostBenefitAnalysis {
  return { ...value, benefits: value.benefits.map(item => ({ ...item })),
    costs: value.costs.map(item => ({ ...item })) };
}

export function newBenefit(): FinancialBenefit {
  return {
    id: crypto.randomUUID(), name: '', method: 'annual', annualAmount: null,
    units: null, valuePerUnit: null, changePercent: null, profile: 'level',
    source: '', explanation: '',
  };
}

export function newCost(): FinancialCost {
  return {
    id: crypto.randomUUID(), name: '', timing: 'upfront',
    amount: null, firstYear: 1, intervalYears: null, source: '', explanation: '',
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nullableNonnegative(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}
function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}
function date(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
function entryIdentity(value: Record<string, unknown>): boolean {
  return typeof value.id === 'string' && value.id.trim() !== '' &&
    typeof value.name === 'string' && typeof value.source === 'string' &&
    typeof value.explanation === 'string';
}
function benefit(value: unknown): value is FinancialBenefit {
  return object(value) && entryIdentity(value) &&
    (value.method === 'annual' || value.method === 'drivers') &&
    (value.profile === 'level' || value.profile === 'ramp') &&
    nullableNonnegative(value.annualAmount) && nullableNonnegative(value.units) &&
    nullableNonnegative(value.valuePerUnit) && nullableNonnegative(value.changePercent);
}
function cost(value: unknown): value is FinancialCost {
  return object(value) && entryIdentity(value) &&
    ['upfront', 'annual', 'scheduled', 'periodic'].includes(String(value.timing)) &&
    nullableNonnegative(value.amount) && nonnegativeInteger(value.firstYear) &&
    (value.intervalYears === null || nonnegativeInteger(value.intervalYears));
}

/** Malformed imported or stored analyses are rejected, never reset behind the user's back. */
export function parseAnalysis(value: unknown): CostBenefitAnalysis {
  if (!object(value) || value.version !== 1 ||
    (value.projectionYears !== null && !nonnegativeInteger(value.projectionYears)) ||
    (value.discountRatePercent !== null && !(typeof value.discountRatePercent === 'number' &&
      Number.isFinite(value.discountRatePercent) && value.discountRatePercent > -100)) ||
    typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency) ||
    typeof value.preparedBy !== 'string' || !date(value.date) ||
    typeof value.notes !== 'string' ||
    !Array.isArray(value.benefits) || !value.benefits.every(benefit) ||
    !Array.isArray(value.costs) || !value.costs.every(cost)) {
    throw new Error('The saved Cost-Benefit Analysis cannot be read safely.');
  }
  const ids = [...value.benefits, ...value.costs].map(item => item.id);
  if (ids.length !== new Set(ids).size) {
    throw new Error('The saved Cost-Benefit Analysis has duplicate line item IDs.');
  }
  return copyAnalysis(value as unknown as CostBenefitAnalysis);
}

export function analysisRecord(value: CostBenefitAnalysis): PortableRecord {
  return { kind: CBA_KIND, id: CBA_ID, data: value };
}
