import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DataKey, TooltipContentProps } from 'recharts';
import type { FinancialPlan, Language, SimulationResult } from '../types';
import { calculateProjections, formatCompactCurrency, formatCurrency, getCashAssetIndex } from '../utils/finance';
import { t } from '../utils/locales';

interface DashboardProps {
  plan: FinancialPlan;
  lang: Language;
}

interface ChartSeries {
  id: string;
  name: string;
  color: string;
  dataKey: DataKey<SimulationResult, number>;
}

type ChartGroup = 'wealth' | 'income' | 'outflow' | 'assets' | 'debts' | 'expenses';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1', '#a4c8e0', '#d84ca4', '#757575'];
const CARD = 'bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col min-w-0';
const TICK = { fill: '#64748b', fontSize: 10 };
const MARGIN = { top: 5, right: 10, left: 0, bottom: 5 };

export function Dashboard({ plan, lang }: DashboardProps) {
  const data = useMemo(() => calculateProjections(plan), [plan]);
  const [hiddenSeries, setHiddenSeries] = useState<Partial<Record<ChartGroup, Set<string>>>>({});
  const endOfLifeData = data[data.length - 1];
  const retirementYearData = data.find(year => year.age === plan.retirementAge);
  const summaryYear = retirementYearData ?? (plan.retirementAge < plan.currentAge ? data[0] : endOfLifeData);
  const firstShortfall = data.find(year => year.cashBalance < -0.005);
  const isSustainable = !firstShortfall && (endOfLifeData?.netWorth ?? 0) > 0;
  const status = firstShortfall
    ? t('msg_shortfall', lang).replace('{age}', String(firstShortfall.age))
    : t(isSustainable ? 'msg_sus' : 'msg_fail', lang);

  const wealthSeries = [
    { id: 'totalAssets', dataKey: 'totalAssets', name: t('chart_total_assets', lang), color: '#10b981', fill: 'url(#colorAssets)', width: 1 },
    { id: 'totalDebt', dataKey: 'totalDebt', name: t('chart_total_debt', lang), color: '#ef4444', fill: 'url(#colorDebt)', width: 1 },
    { id: 'netWorth', dataKey: 'netWorth', name: t('chart_net_worth', lang), color: '#3b82f6', fill: 'none', width: 2 },
  ] as const;

  const outflowSeries: ChartSeries[] = [
    { id: 'totalExpenses', dataKey: 'totalExpenses', name: t('section_expenses', lang), color: '#f59e0b' },
    { id: 'totalDebtPayments', dataKey: 'totalDebtPayments', name: t('lbl_debt_payments', lang), color: '#ef4444' },
    { id: 'totalInvestments', dataKey: 'totalInvestments', name: t('lbl_investments', lang), color: '#8b5cf6' },
  ];

  const assetSeries: ChartSeries[] = plan.assets.map((asset, index) => ({
    id: `asset:${asset.id}`,
    name: asset.name,
    color: COLORS[index % COLORS.length],
    dataKey: row => row.assetBreakdown[asset.id],
  }));
  if (getCashAssetIndex(plan.assets) === -1) {
    assetSeries.push({ id: 'cashBalance', name: t('chart_cash_balance', lang), color: '#475569', dataKey: 'cashBalance' });
  }

  const debtSeries: ChartSeries[] = plan.debts.map((debt, index) => ({
    id: debt.id,
    name: debt.name,
    color: COLORS[index % COLORS.length],
    dataKey: row => row.debtBreakdown[debt.id],
  }));

  function cashFlowSeries(group: 'incomes' | 'expenses', breakdown: 'incomeBreakdown' | 'expenseBreakdown'): ChartSeries[] {
    const names = new Set(plan[group].map(item => item.name));
    return Array.from(names, (name, index) => ({
      id: name, name, color: COLORS[index % COLORS.length], dataKey: row => row[breakdown][name],
    }));
  }

  const moneyAxis = (value: number) => formatCompactCurrency(value, plan.currency);
  const isHidden = (group: ChartGroup, id: string) => hiddenSeries[group]?.has(id) ?? false;

  function toggleSeries(group: ChartGroup, id: string) {
    setHiddenSeries(previous => {
      const hidden = new Set(previous[group]);
      if (hidden.has(id)) hidden.delete(id);
      else hidden.add(id);
      return { ...previous, [group]: hidden };
    });
  }

  function legend(group: ChartGroup, series: readonly ChartSeries[]) {
    if (!series.length) return null;
    return (
      <Legend content={() => (
        <ul className="flex max-h-24 flex-wrap justify-center gap-x-2 gap-y-1 overflow-y-auto pt-1 text-xs">
          {series.map(item => {
            const hidden = isHidden(group, item.id);
            return (
              <li key={item.id} className="min-w-0 max-w-full">
                <button type="button" aria-pressed={!hidden} onClick={() => toggleSeries(group, item.id)}
                  className={`flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-slate-100 ${hidden ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />
                  <span className="min-w-0 break-words">{item.name || t('chart_unnamed_series', lang)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )} />
    );
  }

  function tooltip({ active, payload, label }: TooltipContentProps, showPercentage = true, showTotal = false) {
    if (!active || !payload.length) return null;
    const total = payload.reduce((sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0);
    return (
      <div className="min-w-[160px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl">
        <p className="mb-1 font-bold text-slate-800">{t('chart_age', lang).replace('{age}', String(label ?? ''))}</p>
        {showTotal && (
          <div className="mb-2 flex justify-between gap-3 border-b border-slate-100 pb-1 font-semibold text-slate-800">
            <span>{t('chart_total', lang)}</span>
            <span>{formatCurrency(total, plan.currency)}</span>
          </div>
        )}
        {payload.map((entry, index) => {
          if (typeof entry.value !== 'number') return null;
          const percent = showPercentage && total > 0 ? ((entry.value / total) * 100).toFixed(1) : null;
          return (
            <div key={index} className="mb-1 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-slate-600">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name || t('chart_unnamed_series', lang)}
              </span>
              <span className="whitespace-nowrap font-medium text-slate-900">
                {formatCurrency(entry.value, plan.currency)}
                {percent && <span className="ml-1 text-slate-500">({percent}%)</span>}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function annualChart(group: 'income' | 'outflow' | 'expenses', title: string, series: ChartSeries[]) {
    return (
      <div className={`${CARD} ${group === 'expenses' ? 'h-[500px] md:col-span-2' : 'h-[400px]'}`}>
        <h3 className="mb-4 text-lg font-bold text-slate-800">{title} ({t('lbl_yearly', lang)})</h3>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={moneyAxis} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={props => tooltip(props, true, true)} />
              {legend(group, series)}
              {series.map(item => (
                <Area key={item.id} type="monotone" dataKey={item.dataKey} name={item.name} stackId="1"
                  stroke={item.color} fill={item.color} hide={isHidden(group, item.id)} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function breakdownChart(group: 'assets' | 'debts', title: string, series: ChartSeries[]) {
    return (
      <div className={`${CARD} h-[400px]`}>
        <h3 className="mb-4 text-lg font-bold text-slate-800">{title}</h3>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={moneyAxis} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip content={props => tooltip(props)} />
              {legend(group, series)}
              {series.map(item => (
                <Line key={item.id} type="monotone" dataKey={item.dataKey} name={item.name}
                  stroke={item.color} strokeWidth={2} dot={false} hide={isHidden(group, item.id)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-500">
            {t(retirementYearData ? 'stat_nw' : 'stat_nw_age', lang).replace('{age}', String(summaryYear.age))}
          </p>
          <p className="text-3xl font-bold text-slate-800">{moneyAxis(summaryYear.netWorth)}</p>
        </div>
        <div className={`rounded-xl border p-5 shadow-sm ${isSustainable ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
          <p className={`mb-1 text-sm font-medium ${isSustainable ? 'text-emerald-700' : 'text-red-700'}`}>{t('stat_sus', lang)}</p>
          <p className={`text-xl font-bold ${isSustainable ? 'text-emerald-800' : 'text-red-800'}`}>{status}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-sm font-medium text-slate-500">
            {t(retirementYearData ? 'stat_debt' : 'stat_debt_age', lang).replace('{age}', String(summaryYear.age))}
          </p>
          <p className="text-3xl font-bold text-red-600">{moneyAxis(summaryYear.totalDebt)}</p>
        </div>
      </div>

      <div className={`${CARD} h-[400px]`}>
        <h3 className="mb-4 text-lg font-bold text-slate-800">{t('chart_wealth', lang)}</h3>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ ...TICK, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={moneyAxis} tick={{ ...TICK, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={props => tooltip(props, false)} />
              {legend('wealth', wealthSeries)}
              <ReferenceLine x={plan.retirementAge} stroke="#3b82f6" strokeDasharray="3 3" />
              {wealthSeries.map(item => (
                <Area key={item.id} name={item.name} type="monotone" dataKey={item.dataKey} stroke={item.color}
                  strokeWidth={item.width} fill={item.fill} hide={isHidden('wealth', item.id)} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {annualChart('income', t('chart_income', lang), cashFlowSeries('incomes', 'incomeBreakdown'))}
        {annualChart('outflow', t('chart_outflow', lang), outflowSeries)}
      </div>

      <div className={`${CARD} h-[350px]`}>
        <h3 className="mb-4 text-lg font-bold text-slate-800">{t('chart_cashflow', lang)}</h3>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={moneyAxis} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={props => tooltip(props, false)} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="liquidCash" name={t('chart_cashflow', lang)}>
                {data.map(year => <Cell key={year.age} fill={year.liquidCash >= 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {breakdownChart('assets', t('chart_assets_detail', lang), assetSeries)}
        {breakdownChart('debts', t('chart_debts_detail', lang), debtSeries)}
        {annualChart('expenses', t('chart_expense', lang), cashFlowSeries('expenses', 'expenseBreakdown'))}
      </div>
    </div>
  );
}
