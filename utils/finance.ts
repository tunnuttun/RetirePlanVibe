

import { CashFlowItem, FinancialPlan, SimulationResult } from '../types';

// Helper to identify illiquid assets that shouldn't be automatically sold for expenses
const isIlliquid = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('house') || n.includes('home') || n.includes('condo') || 
         n.includes('property') || n.includes('land') || 
         n.includes('real estate') ||
         n.includes('car') || n.includes('vehicle');
};

export function getCashAssetIndex(assets: FinancialPlan['assets']) {
  return assets.findIndex(asset => {
    const name = asset.name.toLowerCase();
    return name.includes('cash') || name.includes('saving');
  });
}

export function isCashFlowActive(item: CashFlowItem, age: number, defaultEndAge: number) {
  return age >= item.startAge && age <= (item.endAge || defaultEndAge);
}

export const calculateProjections = (plan: FinancialPlan): SimulationResult[] => {
  const currentYear = new Date().getFullYear();
  const results: SimulationResult[] = [];
  const maxAge = plan.maxAge;

  // 1. Initialize State Vectors
  // Deep copy initial states to avoid mutating the plan
  const currentAssets = plan.assets.map(a => ({ ...a, accumulatedValue: a.value }));
  const currentDebts = plan.debts.map(d => ({ ...d, remainingBalance: d.value }));

  const cashAsset = currentAssets[getCashAssetIndex(plan.assets)];
  let cashBalance = cashAsset?.accumulatedValue ?? 0;

  for (let age = plan.currentAge; age <= maxAge; age++) {
    const year = currentYear + (age - plan.currentAge);
    const isRetired = age >= plan.retirementAge;

    // --- A. INCOME ---
    let yearlyIncome = 0;
    const incomeBreakdown: Record<string, number> = Object.create(null);
    
    // Initialize breakdown for known incomes to 0
    plan.incomes.forEach(i => incomeBreakdown[i.name] = 0);

    plan.incomes.forEach(inc => {
      if (isCashFlowActive(inc, age, plan.retirementAge)) {
        const yearsActive = age - inc.startAge;
        const growthMultiplier = Math.pow(1 + (inc.growthRate / 100), yearsActive);
        let amount = inc.value * growthMultiplier;
        if (inc.frequency === 'monthly') amount *= 12;
        yearlyIncome += amount;
        incomeBreakdown[inc.name] = (incomeBreakdown[inc.name] || 0) + amount;
      }
    });

    // --- B. EXPENSES ---
    let yearlyExpenses = 0;
    plan.expenses.forEach(exp => {
      if (isCashFlowActive(exp, age, maxAge)) {
        const yearsActive = age - plan.currentAge;
        const inflationRate = exp.type === 'medical' ? plan.inflation.medical : plan.inflation.general;
        const inflationMultiplier = Math.pow(1 + (inflationRate / 100), yearsActive);
        let amount = exp.value * inflationMultiplier;
        if (exp.frequency === 'monthly') amount *= 12;
        yearlyExpenses += amount;
      }
    });

    // --- C. APPLY ORGANIC INTEREST (Growth before contribution) ---
    currentAssets.forEach(asset => {
      if (asset !== cashAsset || asset.accumulatedValue > 0) {
        asset.accumulatedValue *= 1 + asset.interestRate / 100;
      }
    });
    cashBalance = cashAsset?.accumulatedValue ?? cashBalance;

    // --- D. DEBT GROWTH & MANDATORY PAYMENTS ---
    let totalDebtPaid = 0;
    
    // Grow Debts first
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

    // --- E. ASSET CONTRIBUTIONS (INVESTMENTS) ---
    // Priority Rule: Expenses & Debts > Investments.
    // We can only invest if we have liquidity (Cash Balance + Net Income) > 0.
    
    let totalInvestments = 0;
    
    // Net Flow before investments
    const essentialOutflows = yearlyExpenses + totalDebtPaid;
    
    let availableLiquidity = cashBalance + yearlyIncome - essentialOutflows;

    // Iterate through assets in the order defined by the user (Priority based on index)
    currentAssets.forEach(asset => {
      // Skip the cash wallet itself (we don't "invest" in cash, it catches the overflow)
      if (asset === cashAsset) return;

      const start = asset.contributionStartAge;
      const end = asset.contributionEndAge || maxAge;

      if (age >= start && age <= end) {
        // Calculate Target Contribution
        const yearsContributing = age - start;
        const incrementMult = Math.pow(1 + (asset.contributionGrowthRate / 100), yearsContributing);
        
        let targetContribution = asset.contributionAmount * incrementMult;
        if (asset.contributionFrequency === 'monthly') targetContribution *= 12;

        // Check availability: Can only invest if we have positive liquidity
        if (targetContribution > 0) {
           // We can only invest what we have. 
           // If availableLiquidity is negative (deficit), we invest 0.
           // If availableLiquidity is positive but less than target, we invest what's left.
           const actualContribution = Math.max(0, Math.min(targetContribution, availableLiquidity));
           
           if (actualContribution > 0) {
             asset.accumulatedValue += actualContribution;
             totalInvestments += actualContribution;
             availableLiquidity -= actualContribution; // Reduce liquidity for the next asset in the list
           }
        }
      }
    });

    // --- F. REBALANCING CASH & DRAWDOWN ---
    const netCashFlow = yearlyIncome - essentialOutflows - totalInvestments;
    cashBalance += netCashFlow;

    for (const asset of currentAssets) {
      if (cashBalance >= 0) break;
      if (asset === cashAsset || asset.accumulatedValue <= 0 || isIlliquid(asset.name)) continue;

      const withdrawal = Math.min(asset.accumulatedValue, -cashBalance);
      asset.accumulatedValue -= withdrawal;
      cashBalance += withdrawal;
    }
    if (cashAsset) cashAsset.accumulatedValue = cashBalance;

    // --- G. SNAPSHOT ---
    const totalAssetValue = currentAssets.reduce((sum, a) => sum + a.accumulatedValue, cashAsset ? 0 : cashBalance);
    const totalDebtValue = currentDebts.reduce((sum, d) => sum + d.remainingBalance, 0);
    
    // Breakdown for charts
    const assetBreakdown = Object.fromEntries(currentAssets.map(a => [a.id, a.accumulatedValue]));
    const debtBreakdown = Object.fromEntries(currentDebts.map(d => [d.id, d.remainingBalance]));

    results.push({
      age,
      year,
      totalAssets: Math.round(totalAssetValue),
      totalDebt: Math.round(totalDebtValue),
      netWorth: Math.round(totalAssetValue - totalDebtValue),
      totalIncome: Math.round(yearlyIncome),
      totalExpenses: Math.round(yearlyExpenses),
      totalInvestments: Math.round(totalInvestments),
      totalDebtPayments: Math.round(totalDebtPaid),
      liquidCash: Math.round(netCashFlow),
      cashBalance,
      isRetired,
      assetBreakdown,
      debtBreakdown,
      incomeBreakdown
    });
  }

  return results;
};

export const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompactCurrency = (value: number, currency: string = 'USD') => {
   return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
};
