
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INPUTS = 'INPUTS',
}

export type InflationType = 'general' | 'medical';
export type Frequency = 'monthly' | 'yearly';
export type Language = 'en' | 'th';
export type CurrencyCode = 'USD' | 'THB';

export interface BaseItem {
  id: string;
  name: string;
  value: number; // Current Principal / Base Value
  interestRate: number; // % Annual Return
}

export interface AssetItem extends BaseItem {
  // Contribution / Investment Plan for this specific asset
  contributionAmount: number;
  contributionFrequency: Frequency;
  contributionStartAge: number;
  contributionEndAge?: number;
  contributionGrowthRate: number; // % yearly increase of the contribution amount
}

export interface CashFlowItem extends BaseItem {
  frequency: Frequency;
  startAge: number;
  endAge?: number; 
  growthRate: number; 
  type?: InflationType; 
}

export interface DebtItem extends BaseItem {
  // value is the principal
}

export interface PayoffStrategy {
  id: string;
  debtId: string; 
  frequency: Frequency;
  amount: number;
  extraYearlyAmount: number;
  yearlyIncrement: number; 
}

export interface FinancialPlan {
  currentAge: number;
  retirementAge: number;
  maxAge: number;
  currency: CurrencyCode;
  inflation: {
    general: number;
    medical: number;
  };
  assets: AssetItem[];
  debts: DebtItem[];
  incomes: CashFlowItem[];
  expenses: CashFlowItem[];
  debtPayments: PayoffStrategy[];
}

export interface SimulationResult {
  age: number;
  year: number;
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalDebtPayments: number;
  liquidCash: number;
  cashBalance: number;
  isRetired: boolean;
  assetBreakdown: Record<string, number>; 
  debtBreakdown: Record<string, number>;
  incomeBreakdown: Record<string, number>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const DEFAULT_PLAN: FinancialPlan = {
  currentAge: 30,
  retirementAge: 60,
  maxAge: 90,
  currency: 'USD',
  inflation: {
    general: 3.0,
    medical: 5.0,
  },
  assets: [
    { 
      id: 'a1', name: 'Cash', value: 50000, interestRate: 0.5,
      contributionAmount: 0, contributionFrequency: 'monthly', contributionStartAge: 30, contributionGrowthRate: 0 
    },
    { 
      id: 'a2', name: 'Stocks', value: 10000, interestRate: 8.0,
      contributionAmount: 500, contributionFrequency: 'monthly', contributionStartAge: 30, contributionGrowthRate: 0 
    },
    { 
      id: 'a3', name: 'Funds', value: 15000, interestRate: 5.0,
      contributionAmount: 200, contributionFrequency: 'monthly', contributionStartAge: 30, contributionGrowthRate: 0 
    },
    { 
      id: 'a4', name: 'Retirement Funds', value: 20000, interestRate: 6.0,
      contributionAmount: 300, contributionFrequency: 'monthly', contributionStartAge: 30, contributionGrowthRate: 0 
    },
    { 
      id: 'a5', name: 'House', value: 150000, interestRate: 3.0,
      contributionAmount: 0, contributionFrequency: 'monthly', contributionStartAge: 30, contributionGrowthRate: 0 
    },
  ],
  debts: [
    { id: 'd1', name: 'House Loan', value: 120000, interestRate: 4.5 },
    { id: 'd2', name: 'Car Loan', value: 15000, interestRate: 5.0 },
  ],
  incomes: [
    { id: 'inc1', name: 'Salary', value: 4000, interestRate: 0, frequency: 'monthly', startAge: 30, endAge: 60, growthRate: 3 },
  ],
  expenses: [
    { id: 'exp1', name: 'Food', value: 400, interestRate: 0, frequency: 'monthly', startAge: 30, growthRate: 0, type: 'general' },
    { id: 'exp2', name: 'Transportation', value: 150, interestRate: 0, frequency: 'monthly', startAge: 30, growthRate: 0, type: 'general' },
    { id: 'exp3', name: 'Utilities', value: 100, interestRate: 0, frequency: 'monthly', startAge: 30, growthRate: 0, type: 'general' },
    { id: 'exp4', name: 'Tax', value: 5000, interestRate: 0, frequency: 'yearly', startAge: 30, growthRate: 0, type: 'general' },
    { id: 'exp5', name: 'Travels', value: 2000, interestRate: 0, frequency: 'yearly', startAge: 30, growthRate: 0, type: 'general' },
  ],
  debtPayments: [
    { id: 'pay1', debtId: 'd1', frequency: 'monthly', amount: 900, extraYearlyAmount: 0, yearlyIncrement: 0 },
    { id: 'pay2', debtId: 'd2', frequency: 'monthly', amount: 400, extraYearlyAmount: 0, yearlyIncrement: 0 },
  ],
};
