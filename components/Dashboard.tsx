

import React, { useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend } from 'recharts';
import { FinancialPlan, Language } from '../types';
import { calculateProjections, formatCompactCurrency, formatCurrency } from '../utils/finance';
import { t } from '../utils/locales';

interface DashboardProps {
  plan: FinancialPlan;
  lang: Language;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];

export const Dashboard: React.FC<DashboardProps> = ({ plan, lang }) => {
  const data = useMemo(() => calculateProjections(plan), [plan]);
  
  const retirementYearData = data.find(d => d.age === plan.retirementAge) || data[data.length - 1];
  const endOfLifeData = data[data.length - 1];
  const isSustainable = (endOfLifeData?.netWorth || 0) > 0;

  // Prepare Pie Chart Data for Current Assets
  const assetPieData = plan.assets.map(a => ({ name: a.name, value: a.value })).filter(d => d.value > 0);
  
  // Prepare Pie Chart Data for Current Expenses
  const expensePieData = plan.expenses.map(e => ({ name: e.name, value: e.frequency === 'monthly' ? e.value * 12 : e.value })).filter(d => d.value > 0);

  // Get keys for breakdown charts
  const assetKeys = plan.assets.map(a => a.name);
  const debtKeys = plan.debts.map(d => d.name);

  // Flatten data for breakdown charts
  const chartData = data.map(d => ({
    ...d,
    ...d.assetBreakdown,
    ...d.debtBreakdown
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
          <p className="font-bold text-slate-800 mb-1">Age {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium text-slate-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
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
          <p className="text-sm font-medium text-slate-500 mb-1">{t('stat_nw', lang)}</p>
          <p className="text-3xl font-bold text-slate-800">
            {formatCompactCurrency(retirementYearData?.netWorth || 0)}
          </p>
        </div>

        <div className={`p-5 rounded-xl shadow-sm border ${isSustainable ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm font-medium mb-1 ${isSustainable ? 'text-emerald-600' : 'text-red-600'}`}>
            {t('stat_sus', lang)}
          </p>
          <p className={`text-xl font-bold ${isSustainable ? 'text-emerald-800' : 'text-red-800'}`}>
            {isSustainable ? t('msg_sus', lang) : t('msg_fail', lang)}
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Debt @ Retirement</p>
          <p className="text-3xl font-bold text-red-500">
            {formatCompactCurrency(retirementYearData?.totalDebt || 0)}
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
                tickFormatter={(value) => formatCompactCurrency(value)} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
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

      {/* Breakdown Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Assets Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_assets_detail', lang)}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {assetKeys.map((key, idx) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2} 
                  dot={false} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Debts Line Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{t('chart_debts_detail', lang)}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              {debtKeys.map((key, idx) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2} 
                  dot={false} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Pie */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">{t('chart_breakdown', lang)}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {assetPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCompactCurrency(value)} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Pie */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[300px] flex flex-col">
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
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCompactCurrency(value)} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};
