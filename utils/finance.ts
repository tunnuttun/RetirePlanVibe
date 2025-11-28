

import { FinancialPlan, SimulationResult } from '../types';

export const calculateProjections = (plan: FinancialPlan): SimulationResult[] => {
  const currentYear = new Date().getFullYear();
  const results: SimulationResult[] = [];
  const MAX_AGE = 95;

  // 1. Initialize State Vectors
  // Deep copy initial states to avoid mutating the plan
  // We add 'accumulatedValue' to track growth
  let currentAssets = plan.assets.map(a => ({ ...a, accumulatedValue: a.value }));
  let currentDebts = plan.debts.map(d => ({ ...d, remainingBalance: d.value }));
  
  // Find the index of the "Cash" asset to absorb surplus/deficit
  // If no "Cash" found, we use the first asset, or create a virtual wallet if assets is empty
  let cashAssetIndex = currentAssets.findIndex(a => 
    a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('saving')
  );
  if (cashAssetIndex === -1 && currentAssets.length > 0) cashAssetIndex = 0;

  for (let age = plan.currentAge; age <= MAX_AGE; age++) {
    const year = currentYear + (age - plan.currentAge);
    const isRetired = age >= plan.retirementAge;

    // --- A. INCOME ---
    let yearlyIncome = 0;
    plan.incomes.forEach(inc => {
      if (age >= inc.startAge && (inc.endAge === undefined || age <= inc.endAge)) {
        const yearsActive = age - inc.startAge;
        const growthMultiplier = Math.pow(1 + (inc.growthRate / 100), yearsActive);
        let amount = inc.value * growthMultiplier;
        if (inc.frequency === 'monthly') amount *= 12;
        yearlyIncome += amount;
      }
    });

    // --- B. EXPENSES ---
    let yearlyExpenses = 0;
    plan.expenses.forEach(exp => {
      const endAge = exp.endAge ?? MAX_AGE;
      if (age >= exp.startAge && age <= endAge) {
        const yearsActive = age - plan.currentAge;
        const inflationRate = exp.type === 'medical' ? plan.inflation.medical : plan.inflation.general;
        const inflationMultiplier = Math.pow(1 + (inflationRate / 100), yearsActive);
        let amount = exp.value * inflationMultiplier;
        if (exp.frequency === 'monthly') amount *= 12;
        yearlyExpenses += amount;
      }
    });

    // --- C. ASSET GROWTH & CONTRIBUTIONS ---
    let totalContributions = 0;

    currentAssets.forEach(asset => {
      // 1. Organic Growth (Interest) on existing balance
      asset.accumulatedValue *= (1 + (asset.interestRate / 100));

      // 2. Add New Contributions (Invest more)
      // "Cash cannot be invested" rule: We skip contribution calculation if asset is 'Cash'.
      const isCash = asset.name.toLowerCase() === 'cash';
      
      if (!isCash) {
        // Check if within contribution window
        const start = asset.contributionStartAge || plan.currentAge;
        const end = asset.contributionEndAge ?? MAX_AGE;

        if (age >= start && age <= end) {
          const yearsContributing = age - start;
          const incrementMult = Math.pow(1 + (asset.contributionGrowthRate / 100), yearsContributing);
          
          let contribution = asset.contributionAmount * incrementMult;
          if (asset.contributionFrequency === 'monthly') contribution *= 12;

          asset.accumulatedValue += contribution;
          totalContributions += contribution;
        }
      }
    });

    // --- D. DEBT GROWTH & PAYMENTS ---
    let totalDebtPaid = 0;
    
    // Grow Debts
    currentDebts.forEach(debt => {
      if (debt.remainingBalance > 0) {
        debt.remainingBalance *= (1 + (debt.interestRate / 100));
      }
    });

    // Pay Debts
    plan.debtPayments.forEach(pay => {
      const debt = currentDebts.find(d => d.id === pay.debtId);
      if (debt && debt.remainingBalance > 0) {
        const yearsRunning = age - plan.currentAge;
        const incrementMult = Math.pow(1 + (pay.yearlyIncrement / 100), yearsRunning);
        
        let payment = pay.amount * incrementMult;
        if (pay.frequency === 'monthly') payment *= 12;
        payment += pay.extraYearlyAmount;

        const actualPay = Math.min(payment, debt.remainingBalance);
        debt.remainingBalance -= actualPay;
        totalDebtPaid += actualPay;
      }
    });

    // --- E. REBALANCING CASH ---
    // Net Cash Flow = Income - Expenses - Debt Payments - Asset Contributions
    // This represents the "Unallocated Cash" for the year.
    // If Positive: Goes into the "Cash/Savings" asset.
    // If Negative: Withdrawn from the "Cash/Savings" asset.
    
    const netCashFlow = yearlyIncome - yearlyExpenses - totalDebtPaid - totalContributions;

    if (cashAssetIndex !== -1) {
      currentAssets[cashAssetIndex].accumulatedValue += netCashFlow;
    }

    // --- F. SNAPSHOT ---
    const totalAssetValue = currentAssets.reduce((sum, a) => sum + a.accumulatedValue, 0);
    const totalDebtValue = currentDebts.reduce((sum, d) => sum + d.remainingBalance, 0);
    
    // Breakdown for charts
    const assetBreakdown: Record<string, number> = {};
    currentAssets.forEach(a => assetBreakdown[a.name] = a.accumulatedValue);

    const debtBreakdown: Record<string, number> = {};
    currentDebts.forEach(d => debtBreakdown[d.name] = d.remainingBalance);

    results.push({
      age,
      year,
      totalAssets: Math.round(totalAssetValue),
      totalDebt: Math.round(totalDebtValue),
      netWorth: Math.round(totalAssetValue - totalDebtValue),
      totalIncome: Math.round(yearlyIncome),
      totalExpenses: Math.round(yearlyExpenses),
      liquidCash: Math.round(netCashFlow), 
      isRetired,
      assetBreakdown,
      debtBreakdown
    });
  }

  return results;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompactCurrency = (value: number) => {
   return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
};
