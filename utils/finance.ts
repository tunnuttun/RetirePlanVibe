

import { FinancialPlan, SimulationResult } from '../types';

// Helper to identify illiquid assets that shouldn't be automatically sold for expenses
const isIlliquid = (name: string): boolean => {
  const n = name.toLowerCase();
  return n.includes('house') || n.includes('home') || n.includes('condo') || 
         n.includes('property') || n.includes('land') || 
         n.includes('real estate') ||
         n.includes('car') || n.includes('vehicle');
};

export const calculateProjections = (plan: FinancialPlan): SimulationResult[] => {
  const currentYear = new Date().getFullYear();
  const results: SimulationResult[] = [];
  const MAX_AGE = plan.maxAge || 95;

  // 1. Initialize State Vectors
  // Deep copy initial states to avoid mutating the plan
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
    const incomeBreakdown: Record<string, number> = {};
    
    // Initialize breakdown for known incomes to 0
    plan.incomes.forEach(i => incomeBreakdown[i.name] = 0);

    plan.incomes.forEach(inc => {
      // Default to retirement age if endAge is not specified (undefined or 0)
      const endAge = (inc.endAge && inc.endAge > 0) ? inc.endAge : plan.retirementAge;

      if (age >= inc.startAge && age <= endAge) {
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
      // Default to MAX_AGE if endAge is not specified (undefined or 0)
      const endAge = (exp.endAge && exp.endAge > 0) ? exp.endAge : MAX_AGE;

      if (age >= exp.startAge && age <= endAge) {
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
      asset.accumulatedValue *= (1 + (asset.interestRate / 100));
    });

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
    
    // Calculate available liquidity. 
    // This is the Cash Asset Value (already grown by interest in step C) + Current Year Income - Essential Outflows
    let availableLiquidity = 0;
    if (cashAssetIndex !== -1) {
       availableLiquidity = currentAssets[cashAssetIndex].accumulatedValue + yearlyIncome - essentialOutflows;
    } else {
       // If no cash asset exists, we assume pure cash flow logic
       availableLiquidity = yearlyIncome - essentialOutflows;
    }

    // Iterate through assets in the order defined by the user (Priority based on index)
    currentAssets.forEach((asset, index) => {
      // Skip the cash wallet itself (we don't "invest" in cash, it catches the overflow)
      if (index === cashAssetIndex) return;

      const start = asset.contributionStartAge || plan.currentAge;
      // Default to MAX_AGE if endAge is not specified (undefined or 0)
      const end = (asset.contributionEndAge && asset.contributionEndAge > 0) ? asset.contributionEndAge : MAX_AGE;

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
    // Net Cash Flow = Income - Expenses - Debt Payments - Asset Contributions
    // Note: totalInvestments is now guaranteed to be <= available liquidity, so we shouldn't create a new deficit from investing.
    const netCashFlow = yearlyIncome - yearlyExpenses - totalDebtPaid - totalInvestments;

    if (cashAssetIndex !== -1) {
      currentAssets[cashAssetIndex].accumulatedValue += netCashFlow;

      // AUTOMATIC DRAWDOWN LOGIC:
      // If Cash is negative (deficit), specifically during retirement or high expense years,
      // we must sell/withdraw from other liquid assets to cover the hole.
      if (currentAssets[cashAssetIndex].accumulatedValue < 0) {
        const deficit = Math.abs(currentAssets[cashAssetIndex].accumulatedValue);
        let remainingDeficit = deficit;

        // Iterate through other assets to find funds
        for (const asset of currentAssets) {
          // Skip the cash wallet itself and skip illiquid assets (House/Car)
          if (asset === currentAssets[cashAssetIndex]) continue;
          if (isIlliquid(asset.name)) continue;

          if (asset.accumulatedValue > 0) {
            const withdrawAmount = Math.min(asset.accumulatedValue, remainingDeficit);
            asset.accumulatedValue -= withdrawAmount;
            remainingDeficit -= withdrawAmount;
            
            if (remainingDeficit <= 0) break;
          }
        }

        // Refill the Cash wallet with what we withdrew
        // New Cash Balance = Old Negative Balance + Withdrawn Amount
        currentAssets[cashAssetIndex].accumulatedValue += (deficit - remainingDeficit);
      }
    }

    // --- G. SNAPSHOT ---
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
      totalInvestments: Math.round(totalInvestments),
      totalDebtPayments: Math.round(totalDebtPaid),
      liquidCash: Math.round(netCashFlow), 
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
