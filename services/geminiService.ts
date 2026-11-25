import type { GoogleGenAI } from "@google/genai";
import { FinancialPlan, SimulationResult } from "../types";
import { formatCurrency } from "../utils/finance";

export const generateFinancialAdvice = async (
  ai: GoogleGenAI,
  plan: FinancialPlan, 
  projections: SimulationResult[],
  userQuery: string
): Promise<string> => {
  
  const retirementYear = projections.find(p => p.age === plan.retirementAge);
  const endOfLife = projections[projections.length - 1];
  
  // Summarize complex arrays for AI Context to save tokens
  const assetSummary = plan.assets.map(a => {
    let desc = `${a.name}: ${formatCurrency(a.value, plan.currency)} (Rate: ${a.interestRate}%)`;
    if (a.contributionAmount > 0) {
      desc += ` + Adding ${formatCurrency(a.contributionAmount, plan.currency)}/${a.contributionFrequency}`;
    }
    return desc;
  }).join('\n');

  const debtSummary = plan.debts.map(d => `${d.name}: ${formatCurrency(d.value, plan.currency)}`).join(', ');
  
  const context = `
    User Financial Profile:
    - Current Age: ${plan.currentAge}
    - Retirement Age: ${plan.retirementAge}
    - Life Expectancy / Max Age: ${plan.maxAge}
    - Currency: ${plan.currency}
    - General Inflation: ${plan.inflation.general}%
    - Medical Inflation: ${plan.inflation.medical}%
    
    Assets & Contributions:
    ${assetSummary}
    
    Debts: ${debtSummary}
    
    Projection Outcomes:
    - Net Worth at Retirement (${plan.retirementAge}): ${retirementYear ? formatCurrency(retirementYear.netWorth, plan.currency) : 'N/A'}
    - Total Debt at Retirement: ${retirementYear ? formatCurrency(retirementYear.totalDebt, plan.currency) : 'N/A'}
    - Net Worth at End of Plan (${endOfLife?.age || 'N/A'}): ${endOfLife ? formatCurrency(endOfLife.netWorth, plan.currency) : 'N/A'}
    - First projected cash shortfall age: ${projections.find(p => p.cashBalance < -0.005)?.age ?? 'None'}
  `;

  const systemInstruction = `
    You are a financial planner. Analyze the profile. 
    Specific details on assets and debts are provided.
    Give specific advice on debt payoff strategies or asset allocation if mentioned.
    If the user has medical inflation concerns, address them.
    Keep answers concise and actionable.
    Format with Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context: ${context}\n\nUser Question: ${userQuery}`,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my financial brain right now.";
  }
};
