import { BaseItem, DEFAULT_PLAN, FinancialPlan, Frequency, InflationType } from '../types';

export interface NumberLimits {
  min: number;
  max: number;
  integer?: boolean;
}

export const AGE_LIMITS: NumberLimits = { min: 0, max: 130, integer: true };
export const RATE_LIMITS: NumberLimits = { min: -100, max: 1000 };
export const AMOUNT_LIMITS: NumberLimits = { min: 0, max: Number.MAX_SAFE_INTEGER };
export const BALANCE_LIMITS: NumberLimits = { ...AMOUNT_LIMITS, min: -AMOUNT_LIMITS.max };

export function isAllowedNumber(value: unknown, limits: NumberLimits): value is number {
  return typeof value === 'number' && Number.isFinite(value) &&
    value >= limits.min && value <= limits.max && (!limits.integer || Number.isInteger(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readPlan(input: unknown): { plan: FinancialPlan; warnings: string[] } {
  if (!isRecord(input)) throw new TypeError('Expected a retirement plan object');

  const value = input;
  const warnings = new Set<string>();

  function readNumber(input: unknown, fallback: number, limits: NumberLimits, field: string) {
    if (isAllowedNumber(input, limits)) return input;
    warnings.add(field);
    return fallback;
  }

  function endAge(input: unknown, field: string) {
    if (input == null || input === 0) return undefined;
    if (isAllowedNumber(input, AGE_LIMITS)) return input;
    warnings.add(field);
    return undefined;
  }

  function frequency(input: unknown, field: string): Frequency {
    if (input === 'monthly' || input === 'yearly') return input;
    warnings.add(field);
    return 'monthly';
  }

  function readList<K extends keyof FinancialPlan, T extends { id: string }>(
    key: K,
    fallback: T[],
    parse: (input: Record<string, unknown>) => T | undefined,
  ) {
    const items = value[key];
    if (!Array.isArray(items)) {
      warnings.add(key);
      return fallback;
    }

    const result: T[] = [];
    const seen = new Set<string>();
    for (const input of items) {
      const item = isRecord(input) ? parse(input) : undefined;
      if (!item || seen.has(item.id)) {
        warnings.add(key);
        continue;
      }
      seen.add(item.id);
      result.push(item);
    }
    return result;
  }

  const readBaseItem = (input: Record<string, unknown>, field: string): BaseItem | undefined => {
    if (typeof input.id !== 'string' || !input.id || typeof input.name !== 'string') return;
    const isAsset = field === 'assets';
    const interestRate = field === 'incomes' || field === 'expenses' ? input.interestRate ?? 0 : input.interestRate;
    return {
      id: input.id,
      name: input.name,
      value: readNumber(input.value, 0, isAsset ? BALANCE_LIMITS : AMOUNT_LIMITS, field),
      interestRate: readNumber(interestRate, 0, RATE_LIMITS, field),
    };
  };

  const currentAge = readNumber(value.currentAge, DEFAULT_PLAN.currentAge, AGE_LIMITS, 'currentAge');
  const retirementAge = readNumber(value.retirementAge, DEFAULT_PLAN.retirementAge, AGE_LIMITS, 'retirementAge');
  const maxAge = readNumber(value.maxAge, Math.max(DEFAULT_PLAN.maxAge, currentAge), { ...AGE_LIMITS, min: currentAge }, 'maxAge');
  const currency = value.currency === 'THB' || value.currency === 'USD' ? value.currency : DEFAULT_PLAN.currency;
  if (currency !== value.currency) warnings.add('currency');

  const savedInflation = isRecord(value.inflation) ? value.inflation : {};
  const inflation = {
    general: readNumber(savedInflation.general, DEFAULT_PLAN.inflation.general, RATE_LIMITS, 'inflation.general'),
    medical: readNumber(savedInflation.medical, DEFAULT_PLAN.inflation.medical, RATE_LIMITS, 'inflation.medical'),
  };

  const assets = readList('assets', DEFAULT_PLAN.assets, input => {
    const base = readBaseItem(input, 'assets');
    if (!base) return;
    return {
      ...base,
      contributionAmount: readNumber(input.contributionAmount, 0, AMOUNT_LIMITS, 'assets'),
      contributionFrequency: frequency(input.contributionFrequency, 'assets'),
      contributionStartAge: readNumber(input.contributionStartAge, currentAge, AGE_LIMITS, 'assets'),
      contributionEndAge: endAge(input.contributionEndAge, 'assets'),
      contributionGrowthRate: readNumber(input.contributionGrowthRate, 0, RATE_LIMITS, 'assets'),
    };
  });
  const debts = readList('debts', DEFAULT_PLAN.debts, input => readBaseItem(input, 'debts'));

  function readCashFlows(key: 'incomes' | 'expenses') {
    return readList(key, DEFAULT_PLAN[key], input => {
      const base = readBaseItem(input, key);
      if (!base) return;
      const type: InflationType | undefined = input.type === 'medical' || input.type === 'general' ? input.type : undefined;
      if (input.type != null && type === undefined) warnings.add(key);
      return {
        ...base,
        frequency: frequency(input.frequency, key),
        startAge: readNumber(input.startAge, currentAge, AGE_LIMITS, key),
        endAge: endAge(input.endAge, key),
        growthRate: readNumber(input.growthRate, 0, RATE_LIMITS, key),
        type,
      };
    });
  }

  const debtIds = new Set(debts.map(debt => debt.id));
  const debtPayments = readList('debtPayments', DEFAULT_PLAN.debtPayments.filter(payment => debtIds.has(payment.debtId)), input => {
    if (typeof input.id !== 'string' || !input.id || typeof input.debtId !== 'string' || !debtIds.has(input.debtId)) return;
    return {
      id: input.id,
      debtId: input.debtId,
      frequency: frequency(input.frequency, 'debtPayments'),
      amount: readNumber(input.amount, 0, AMOUNT_LIMITS, 'debtPayments'),
      extraYearlyAmount: readNumber(input.extraYearlyAmount, 0, AMOUNT_LIMITS, 'debtPayments'),
      yearlyIncrement: readNumber(input.yearlyIncrement, 0, RATE_LIMITS, 'debtPayments'),
    };
  });

  return {
    plan: { currentAge, retirementAge, maxAge, currency, inflation, assets, debts, incomes: readCashFlows('incomes'), expenses: readCashFlows('expenses'), debtPayments },
    warnings: [...warnings],
  };
}
