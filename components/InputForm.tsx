import React, { useState, useEffect, useRef } from 'react';
import { FinancialPlan, Language } from '../types';
import { t } from '../utils/locales';

interface InputFormProps {
  plan: FinancialPlan;
  onChange: (newPlan: FinancialPlan) => void;
  lang: Language;
}

const Section = ({ title, children, className = "" }: { title: string, children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6 ${className}`}>
    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 border-slate-100">
      {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = "number", className = "", placeholder = "", disabled = false }: any) => {
  // Use local state to manage the input value to allow for intermediate states (like empty string or "0.")
  const [localValue, setLocalValue] = useState(value !== undefined ? value.toString() : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with parent value updates when not editing (e.g. loaded from file)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(value !== undefined ? value.toString() : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setLocalValue(rawValue);

    if (type === 'number') {
      // Allow empty string to mean 0 in data, but keep empty in UI while typing
      if (rawValue === '') {
        onChange(0);
      } else {
        const parsed = parseFloat(rawValue);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      }
    } else {
      onChange(rawValue);
    }
  };

  const handleBlur = () => {
    // On blur, normalize the display value to match the stored data (fixes "00" or invalid chars)
    if (type === 'number') {
      const num = parseFloat(localValue);
      if (isNaN(num) || localValue === '') {
        setLocalValue(value !== undefined ? value.toString() : "0");
      } else {
        setLocalValue(num.toString());
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easy overwriting
    e.target.select();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="text-xs font-semibold text-slate-500 mb-1">{label}</label>}
      <input
        ref={inputRef}
        // Use 'text' type even for numbers to allow flexible input (empty string, decimals) without browser enforcement
        type={type === 'number' ? 'text' : type} 
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        className={`w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      />
    </div>
  );
};

const Select = ({ label, value, onChange, options, className = "", disabled=false }: any) => (
  <div className={`flex flex-col ${className}`}>
    {label && <label className="text-xs font-semibold text-slate-500 mb-1">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const InputForm: React.FC<InputFormProps> = ({ plan, onChange, lang }) => {
  
  const updatePlan = (key: keyof FinancialPlan, value: any) => {
    onChange({ ...plan, [key]: value });
  };

  const updateInflation = (key: 'general' | 'medical', val: number) => {
    onChange({ ...plan, inflation: { ...plan.inflation, [key]: val } });
  };

  // Helper to update item in an array
  const updateItem = (listKey: keyof FinancialPlan, id: string, field: string, val: any) => {
    const list = (plan[listKey] as any[]).map(item => 
      item.id === id ? { ...item, [field]: val } : item
    );
    updatePlan(listKey, list);
  };

  const addItem = (listKey: keyof FinancialPlan, newItem: any) => {
    const list = [...(plan[listKey] as any[]), newItem];
    
    // Logic for Auto-creating payment entry when a new debt is added
    let updatedPlan = { ...plan, [listKey]: list };
    if (listKey === 'debts') {
       const newPayment = { 
         id: Date.now().toString() + '_pay', 
         debtId: newItem.id, 
         amount: 0, 
         frequency: 'monthly', 
         extraYearlyAmount: 0, 
         yearlyIncrement: 0 
      };
      updatedPlan.debtPayments = [...updatedPlan.debtPayments, newPayment];
    }

    onChange(updatedPlan);
  };

  const removeItem = (listKey: keyof FinancialPlan, id: string) => {
    const list = (plan[listKey] as any[]).filter(item => item.id !== id);
    
    // Cleanup payments if debt is removed
    let updatedPlan = { ...plan, [listKey]: list };
    if (listKey === 'debts') {
      updatedPlan.debtPayments = updatedPlan.debtPayments.filter(p => p.debtId !== id);
    }
    
    onChange(updatedPlan);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6">
      
      {/* 1. Profile & Inflation */}
      <Section title={t('section_profile', lang)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input label={t('age_current', lang)} value={plan.currentAge} onChange={(v: number) => updatePlan('currentAge', v)} />
          <Input label={t('age_retire', lang)} value={plan.retirementAge} onChange={(v: number) => updatePlan('retirementAge', v)} />
          <Input label={t('inf_gen', lang)} value={plan.inflation.general} onChange={(v: number) => updateInflation('general', v)} />
          <Input label={t('inf_med', lang)} value={plan.inflation.medical} onChange={(v: number) => updateInflation('medical', v)} />
        </div>
      </Section>

      {/* 2. Assets & Investments (Merged) */}
      <Section title={t('section_assets', lang)}>
        {plan.assets.map(item => {
          const isCash = item.name.toLowerCase() === 'cash';
          return (
            <div key={item.id} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 mb-3 hover:border-blue-200 transition-colors">
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-12 gap-3 items-end mb-3">
                <Input className="col-span-6 md:col-span-5" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('assets', item.id, 'name', v)} />
                <Input className="col-span-3" label={t('col_value', lang)} value={item.value} onChange={(v: number) => updateItem('assets', item.id, 'value', v)} />
                <Input className="col-span-3" label={t('col_rate', lang)} value={item.interestRate} onChange={(v: number) => updateItem('assets', item.id, 'interestRate', v)} />
                <button onClick={() => removeItem('assets', item.id)} className="col-span-12 md:col-span-1 text-red-400 hover:text-red-600 flex justify-end md:justify-center md:pb-2">×</button>
              </div>
              
              {/* Row 2: Contribution Info */}
              <div className="grid grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100">
                <div className="col-span-12 md:col-span-2 text-xs font-bold text-blue-600 flex items-center h-full pt-2 md:pt-0">
                  {t('col_contrib', lang)}:
                </div>
                {isCash ? (
                   <div className="col-span-10 flex items-center text-xs text-slate-400 italic pl-1">
                     * Cash assets absorb surplus income automatically. Manual contribution disabled.
                   </div>
                ) : (
                  <>
                    <Input className="col-span-4 md:col-span-2" label={t('col_amt', lang)} value={item.contributionAmount} onChange={(v: number) => updateItem('assets', item.id, 'contributionAmount', v)} />
                    <Select className="col-span-4 md:col-span-2" label={t('col_freq', lang)} value={item.contributionFrequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('assets', item.id, 'contributionFrequency', v)} />
                    <Input className="col-span-2 md:col-span-2" label={t('col_start', lang)} value={item.contributionStartAge} onChange={(v: number) => updateItem('assets', item.id, 'contributionStartAge', v)} />
                    <Input className="col-span-2 md:col-span-2" label={t('col_end', lang)} value={item.contributionEndAge || ''} placeholder="95" onChange={(v: number) => updateItem('assets', item.id, 'contributionEndAge', v)} />
                    <Input className="col-span-2 md:col-span-2" label={t('col_inc', lang)} value={item.contributionGrowthRate} onChange={(v: number) => updateItem('assets', item.id, 'contributionGrowthRate', v)} />
                  </>
                )}
              </div>
            </div>
          );
        })}
        {plan.assets.length < 20 && (
          <button 
            onClick={() => addItem('assets', { 
              id: Date.now().toString(), 
              name: 'New Asset', 
              value: 0, 
              interestRate: 0,
              contributionAmount: 0,
              contributionFrequency: 'monthly',
              contributionStartAge: plan.currentAge,
              contributionGrowthRate: 0
            })}
            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

      {/* 3. Debts */}
      <Section title={t('section_debts', lang)}>
        {plan.debts.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50/50 p-2 rounded mb-2">
            <Input className="col-span-5" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('debts', item.id, 'name', v)} />
            <Input className="col-span-3" label={t('col_value', lang)} value={item.value} onChange={(v: number) => updateItem('debts', item.id, 'value', v)} />
            <Input className="col-span-3" label={t('col_rate', lang)} value={item.interestRate} onChange={(v: number) => updateItem('debts', item.id, 'interestRate', v)} />
            <button onClick={() => removeItem('debts', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
          </div>
        ))}
         {plan.debts.length < 20 && (
          <button 
             onClick={() => addItem('debts', { id: Date.now().toString(), name: 'New Loan', value: 0, interestRate: 0 })}
             className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

      {/* 4. Income */}
      <Section title={t('section_income', lang)}>
        {plan.incomes.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2">
            <Input className="col-span-3" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('incomes', item.id, 'name', v)} />
            <Input className="col-span-2" label={t('col_amt', lang)} value={item.value} onChange={(v: number) => updateItem('incomes', item.id, 'value', v)} />
            <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('incomes', item.id, 'frequency', v)} />
            <Input className="col-span-1" label={t('col_start', lang)} value={item.startAge} onChange={(v: number) => updateItem('incomes', item.id, 'startAge', v)} />
            <Input className="col-span-1" label={t('col_end', lang)} value={item.endAge || ''} placeholder="60" onChange={(v: number) => updateItem('incomes', item.id, 'endAge', v)} />
            <Input className="col-span-2" label={t('col_inc', lang)} value={item.growthRate} onChange={(v: number) => updateItem('incomes', item.id, 'growthRate', v)} />
            <button onClick={() => removeItem('incomes', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
          </div>
        ))}
         {plan.incomes.length < 20 && (
          <button 
             onClick={() => addItem('incomes', { id: Date.now().toString(), name: 'Work', value: 0, frequency: 'monthly', startAge: plan.currentAge, growthRate: 0 })}
             className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

      {/* 5. Expenses */}
      <Section title={t('section_expenses', lang)}>
        {plan.expenses.map(item => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2">
            <Input className="col-span-3" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('expenses', item.id, 'name', v)} />
            <Input className="col-span-2" label={t('col_amt', lang)} value={item.value} onChange={(v: number) => updateItem('expenses', item.id, 'value', v)} />
            <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('expenses', item.id, 'frequency', v)} />
             <Select className="col-span-2" label="Type" value={item.type || 'general'} options={[{value: 'general', label: 'Gen'}, {value: 'medical', label: 'Med'}]} onChange={(v: string) => updateItem('expenses', item.id, 'type', v)} />
            <Input className="col-span-2" label={t('col_end', lang)} value={item.endAge || ''} placeholder="95" onChange={(v: number) => updateItem('expenses', item.id, 'endAge', v)} />
            <button onClick={() => removeItem('expenses', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
          </div>
        ))}
        {plan.expenses.length < 30 && (
          <button 
             onClick={() => addItem('expenses', { id: Date.now().toString(), name: 'General', value: 0, frequency: 'monthly', startAge: plan.currentAge, type: 'general', growthRate: 0 })}
             className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

      {/* 6. Debt Repayment */}
      <Section title={t('section_payoff', lang)}>
        <p className="text-xs text-slate-400 mb-3 italic">
           * Payment entries are created automatically when debts are added. You can also add extra manual payments.
        </p>
        {plan.debtPayments.map(item => {
           // Find linked debt name for display
           const linkedDebt = plan.debts.find(d => d.id === item.debtId);
           return (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2">
               <Select 
                className="col-span-3" 
                label="Loan" 
                value={item.debtId} 
                options={linkedDebt ? [{value: linkedDebt.id, label: linkedDebt.name}] : plan.debts.map(d => ({value: d.id, label: d.name}))} 
                onChange={(v: string) => updateItem('debtPayments', item.id, 'debtId', v)} 
                disabled={!!linkedDebt} // Lock to the auto-created debt to prevent confusion, unless it's a manual one
              />
              <Input className="col-span-2" label={t('col_amt', lang)} value={item.amount} onChange={(v: number) => updateItem('debtPayments', item.id, 'amount', v)} />
              <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('debtPayments', item.id, 'frequency', v)} />
              <Input className="col-span-2" label="Extra/Yr" value={item.extraYearlyAmount} onChange={(v: number) => updateItem('debtPayments', item.id, 'extraYearlyAmount', v)} />
              <Input className="col-span-2" label={t('col_inc', lang)} value={item.yearlyIncrement} onChange={(v: number) => updateItem('debtPayments', item.id, 'yearlyIncrement', v)} />
              <button onClick={() => removeItem('debtPayments', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
            </div>
           );
        })}
        {plan.debts.length > 0 && (
           <button 
             onClick={() => addItem('debtPayments', { id: Date.now().toString(), debtId: plan.debts[0]?.id, amount: 0, frequency: 'monthly', extraYearlyAmount: 0, yearlyIncrement: 0 })}
             className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

    </div>
  );
};