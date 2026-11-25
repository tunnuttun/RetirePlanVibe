import React, { useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { FinancialPlan, Language, SimulationResult } from '../types';
import { calculateProjections, formatCompactCurrency, formatCurrency, getCashAssetIndex, isCashFlowActive } from '../utils/finance';
import { t } from '../utils/locales';

interface DashboardProps {
  plan: FinancialPlan;
  lang: Language;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];

export const Dashboard: React.FC<DashboardProps> = ({ plan, lang }) => {
  const data = useMemo(() => calculateProjections(plan), [plan]);
  const endOfLifeData = data[data.length - 1];
  const retirementYearData = data.find(d => d.age === plan.retirementAge);
  const summaryYear = retirementYearData ?? (plan.retirementAge < plan.currentAge ? data[0] : endOfLifeData);
  const firstShortfall = data.find(year => year.cashBalance < -0.005);
  const isSustainable = !firstShortfall && (endOfLifeData?.netWorth ?? 0) > 0;
  const status = firstShortfall
    ? t('msg_shortfall', lang).replace('{age}', String(firstShortfall.age))
    : t(isSustainable ? 'msg_sus' : 'msg_fail', lang);
  const hasCashAccount = getCashAssetIndex(plan.assets) >= 0;
  
  // Prepare Pie Chart Data for Current Expenses
  const expensePieData = plan.expenses
    .filter(expense => expense.value > 0 && isCashFlowActive(expense, plan.currentAge, plan.maxAge))
    .map(expense => ({ id: expense.id, name: expense.name, value: expense.frequency === 'monthly' ? expense.value * 12 : expense.value }));
  const totalExpenseValue = expensePieData.reduce((sum, item) => sum + item.value, 0);

  // Get unique income names for the stacked chart
  const incomeKeys = Array.from(new Set(plan.incomes.map(i => i.name)));

  const CustomTooltip = (
    { active, payload, label }: TooltipContentProps,
    showPercentage = true,
  ) => {
    if (active && payload.length) {
      // Calculate total sum of the visible payload for percentage calculation
      const total = payload.reduce((sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0);

      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
          <p className="font-bold text-slate-800 mb-1">{t('chart_age', lang).replace('{age}', String(label ?? ''))}</p>
          {payload.map((entry, index) => {
            if (typeof entry.value !== 'number') return null;
            const percent = showPercentage && total > 0 ? ((entry.value / total) * 100).toFixed(1) : null;
            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600">{entry.name}:</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(entry.value, plan.currency)}
                  {percent && <span className="text-slate-400 ml-1">({percent}%)</span>}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">
            {t(retirementYearData ? 'stat_nw' : 'stat_nw_age', lang).replace('{age}', String(summaryYear.age))}
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {formatCompactCurrency(summaryYear.netWorth, plan.currency)}
          </p>
        </div>

        <div className={`p-5 rounded-xl shadow-sm border ${isSustainable ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm font-medium mb-1 ${isSustainable ? 'text-emerald-600' : 'text-red-600'}`}>
            {t('stat_sus', lang)}
          </p>
          <p className={`text-xl font-bold ${isSustainable ? 'text-emerald-800' : 'text-red-800'}`}>
            {status}
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">
            {t(retirementYearData ? 'stat_debt' : 'stat_debt_age', lang).replace('{age}', String(summaryYear.age))}
          </p>
          <p className="text-3xl font-bold text-red-500">
            {formatCompactCurrency(summaryYear.totalDebt, plan.currency)}
          </p>
        </div>
      </div>

      {/* Main Wealth Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px] flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_wealth', lang)}</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="age" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCompactCurrency(value, plan.currency)} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              {/* No percentage for wealth chart as categories are not additive */}
              <Tooltip content={props => CustomTooltip(props, false)} />
              <ReferenceLine x={plan.retirementAge} stroke="#3b82f6" strokeDasharray="3 3" />
              
              <Area 
                name="Total Assets"
                type="monotone" 
                dataKey="totalAssets" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorAssets)" 
              />
              <Area 
                name="Total Debt"
                type="monotone" 
                dataKey="totalDebt" 
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorDebt)" 
              />
              <Area 
                name="Net Worth"
                type="monotone" 
                dataKey="netWorth" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="none" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cash Flow Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Income Chart (Stacked) */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_income', lang)} (Yearly)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v, plan.currency)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={props => CustomTooltip(props)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {incomeKeys.map((key, idx) => (
                <Area 
                  key={key}
                  type="monotone"
                  dataKey={(row: SimulationResult) => row.incomeBreakdown[key]}
                  stackId="1"
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  name={key}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Outflow Chart (Stacked) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_outflow', lang)} (Yearly)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v, plan.currency)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={props => CustomTooltip(props)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              
              <Area stackId="1" type="monotone" dataKey="totalExpenses" name={t('section_expenses', lang)} stroke="#f59e0b" fill="#f59e0b" />
              <Area stackId="1" type="monotone" dataKey="totalDebtPayments" name={t('lbl_debt_payments', lang)} stroke="#ef4444" fill="#ef4444" />
              <Area stackId="1" type="monotone" dataKey="totalInvestments" name={t('lbl_investments', lang)} stroke="#8b5cf6" fill="#8b5cf6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Net Cash Flow Bar Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_cashflow', lang)}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCompactCurrency(v, plan.currency)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              content={props => CustomTooltip(props, false)}
            />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="liquidCash" name={t('chart_cashflow', lang)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.liquidCash >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Assets Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_assets_detail', lang)}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v, plan.currency)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={props => CustomTooltip(props)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {plan.assets.map((asset, idx) => (
                <Line 
                  key={asset.id}
                  type="monotone" 
                  dataKey={(row: SimulationResult) => row.assetBreakdown[asset.id]}
                  name={asset.name}
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2} 
                  dot={false} 
                />
              ))}
              {!hasCashAccount && (
                <Line type="monotone" dataKey="cashBalance" name={t('chart_cash_balance', lang)} stroke="#475569" strokeWidth={2} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Debts Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_debts_detail', lang)}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v, plan.currency)} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={props => CustomTooltip(props)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {plan.debts.map((debt, idx) => (
                <Line 
                  key={debt.id}
                  type="monotone" 
                  dataKey={(row: SimulationResult) => row.debtBreakdown[debt.id]}
                  name={debt.name}
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2} 
                  dot={false} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Pie (Kept per request, only Asset Pie removed) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px] flex flex-col md:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-2">{t('chart_expense', lang)} (Yearly)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expensePieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {expensePieData.map((entry, index) => (
                  <Cell key={entry.id} fill={COLORS[(index + 3) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => {
                  if (typeof value !== 'number') return null;
                  const percent = totalExpenseValue > 0 ? ((value / totalExpenseValue) * 100).toFixed(1) : '0.0';
                  return [`${formatCompactCurrency(value, plan.currency)} (${percent}%)`, name];
                }} 
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};
