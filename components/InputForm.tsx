

import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import { FinancialPlan, Language } from '../types';
import { t } from '../utils/locales';
import { calculateProjections, formatCurrency, getCashAssetIndex } from '../utils/finance';
import { AGE_LIMITS, AMOUNT_LIMITS, BALANCE_LIMITS, isAllowedNumber, NumberLimits, RATE_LIMITS } from '../utils/plan';

interface InputFormProps {
  plan: FinancialPlan;
  onChange: (newPlan: FinancialPlan) => void;
  lang: Language;
}

const GripIcon = () => (
  <svg className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1"></circle>
    <circle cx="9" cy="12" r="1"></circle>
    <circle cx="9" cy="19" r="1"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <circle cx="15" cy="12" r="1"></circle>
    <circle cx="15" cy="19" r="1"></circle>
  </svg>
);

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

type InputProps = { label: string; className?: string; placeholder?: string } & (
  | { type: 'text'; value: string; onChange: (value: string) => void }
  | { type?: 'number'; value: number | ''; onChange: (value: number) => void; limits?: NumberLimits; optional?: boolean }
);

const Input = (props: InputProps) => {
  const { label, value, className = '', placeholder } = props;
  const inputId = useId();
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isNumeric = props.type !== 'text';
  const limits = isNumeric ? props.limits ?? AMOUNT_LIMITS : AMOUNT_LIMITS;
  const numberValue = localValue.trim() ? Number(localValue) : undefined;
  const invalid = isNumeric && numberValue !== undefined && !isAllowedNumber(numberValue, limits);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setLocalValue(rawValue);

    if (props.type === 'text') {
      props.onChange(rawValue);
    } else if (rawValue.trim() && isAllowedNumber(Number(rawValue), limits)) {
      props.onChange(Number(rawValue));
    }
  };

  const handleBlur = () => {
    if (props.type === 'text') return;

    if (props.optional && (numberValue === undefined || numberValue === 0)) {
      props.onChange(0);
      setLocalValue('');
    } else if (numberValue === undefined && limits === AMOUNT_LIMITS) {
      props.onChange(0);
      setLocalValue('0');
    } else {
      setLocalValue(String(value));
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={inputId} className="text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode={isNumeric ? (limits.integer ? 'numeric' : 'decimal') : undefined}
        aria-invalid={invalid || undefined}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-full p-2 bg-slate-50 border border-slate-200 aria-[invalid=true]:border-red-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors"
      />
    </div>
  );
};

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

function Select<T extends string>({ label, value, onChange, options, className = '' }: SelectProps<T>) {
  const inputId = useId();
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={inputId} className="text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <select
        id={inputId}
        value={value}
        onChange={event => onChange(event.target.value as T)}
        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

export const InputForm: React.FC<InputFormProps> = ({ plan, onChange, lang }) => {
  const [draggedItem, setDraggedItem] = useState<{ listKey: keyof FinancialPlan, index: number } | null>(null);
  const cashAssetIndex = getCashAssetIndex(plan.assets);
  
  const updatePlan = (key: keyof FinancialPlan, value: any) => {
    onChange({ ...plan, [key]: value });
  };

  const updateInflation = (key: 'general' | 'medical', val: number) => {
    onChange({ ...plan, inflation: { ...plan.inflation, [key]: val } });
  };

  const updateItem = (listKey: keyof FinancialPlan, id: string, field: string, val: any) => {
    const list = (plan[listKey] as any[]).map(item => 
      item.id === id ? { ...item, [field]: val } : item
    );
    updatePlan(listKey, list);
  };

  const addItem = (listKey: keyof FinancialPlan, newItem: any) => {
    const list = [...(plan[listKey] as any[]), newItem];
    let updatedPlan = { ...plan, [listKey]: list };
    if (listKey === 'debts') {
       const newPayment = { 
         id: Date.now().toString() + '_pay', 
         debtId: newItem.id, 
         amount: 0, 
         frequency: 'monthly' as const, 
         extraYearlyAmount: 0, 
         yearlyIncrement: 0 
      };
      updatedPlan.debtPayments = [...updatedPlan.debtPayments, newPayment];
    }
    onChange(updatedPlan);
  };

  const removeItem = (listKey: keyof FinancialPlan, id: string) => {
    const list = (plan[listKey] as any[]).filter(item => item.id !== id);
    let updatedPlan = { ...plan, [listKey]: list };
    if (listKey === 'debts') {
      updatedPlan.debtPayments = updatedPlan.debtPayments.filter(p => p.debtId !== id);
    }
    onChange(updatedPlan);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, listKey: keyof FinancialPlan, index: number) => {
    setDraggedItem({ listKey, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, listKey: keyof FinancialPlan, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.listKey !== listKey || draggedItem.index === index) {
      setDraggedItem(null);
      return;
    }

    const list = [...(plan[listKey] as any[])];
    const itemToMove = list[draggedItem.index];
    
    // Remove from old position
    list.splice(draggedItem.index, 1);
    // Insert at new position
    list.splice(index, 0, itemToMove);

    updatePlan(listKey, list);
    setDraggedItem(null);
  };

  const monthlyDeficit = useMemo(() => -(calculateProjections(plan)[0]?.liquidCash ?? 0) / 12, [plan]);

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6">
      
      {/* Warning Banner */}
      {monthlyDeficit > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm sticky top-0 z-10">
          <div className="flex items-start">
             <div className="flex-shrink-0">
               <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
               </svg>
             </div>
             <div className="ml-3">
               <h3 className="text-sm font-medium text-red-800">{t('warn_deficit_title', lang)}</h3>
               <div className="mt-1 text-sm text-red-700">
                 {t('warn_deficit_msg', lang).replace('{amount}', formatCurrency(monthlyDeficit, plan.currency))}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* 1. Profile & Inflation */}
      <Section title={t('section_profile', lang)}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Input label={t('age_current', lang)} value={plan.currentAge} limits={AGE_LIMITS}
            onChange={currentAge => onChange({ ...plan, currentAge, maxAge: Math.max(plan.maxAge, currentAge) })} />
          <Input label={t('age_retire', lang)} value={plan.retirementAge} limits={AGE_LIMITS} onChange={v => updatePlan('retirementAge', v)} />
          <Input label={t('age_max', lang)} value={plan.maxAge} limits={{ ...AGE_LIMITS, min: plan.currentAge }} onChange={v => updatePlan('maxAge', v)} />
          <Select 
            label={t('lbl_currency', lang)} 
            value={plan.currency || 'USD'} 
            options={[{value: 'USD', label: 'USD ($)'}, {value: 'THB', label: 'THB (฿)'}]} 
            onChange={(v: string) => updatePlan('currency', v)} 
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-50">
          <Input label={t('inf_gen', lang)} value={plan.inflation.general} limits={RATE_LIMITS} onChange={v => updateInflation('general', v)} />
          <Input label={t('inf_med', lang)} value={plan.inflation.medical} limits={RATE_LIMITS} onChange={v => updateInflation('medical', v)} />
        </div>
      </Section>

      {/* 2. Assets & Investments */}
      <Section title={t('section_assets', lang)}>
        <p className="text-xs text-blue-600 mb-3 bg-blue-50 p-2 rounded">
          <span className="font-bold">Note:</span> {t('note_priority', lang)}
        </p>
        {plan.assets.map((item, index) => {
          const isCash = index === cashAssetIndex;
          return (
            <div 
              key={item.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, 'assets', index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'assets', index)}
              className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 mb-3 hover:border-blue-200 transition-colors group"
            >
              {/* Row 1: Basic Info */}
              <div className="flex items-start gap-2">
                 <div className="mt-8 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                    <GripIcon />
                 </div>
                 <div className="flex-1">
                    <div className="grid grid-cols-12 gap-3 items-end mb-3">
                      <Input className="col-span-6 md:col-span-5" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('assets', item.id, 'name', v)} />
                      <Input className="col-span-3" label={t('col_value', lang)} value={item.value} limits={BALANCE_LIMITS} onChange={v => updateItem('assets', item.id, 'value', v)} />
                      <Input className="col-span-3" label={t('col_rate', lang)} value={item.interestRate} limits={RATE_LIMITS} onChange={v => updateItem('assets', item.id, 'interestRate', v)} />
                      <button onClick={() => removeItem('assets', item.id)} className="col-span-12 md:col-span-1 text-red-400 hover:text-red-600 flex justify-end md:justify-center md:pb-2">×</button>
                    </div>
                    
                    {/* Row 2: Contribution Info */}
                    <div className="grid grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100">
                      <div className="col-span-12 md:col-span-2 text-xs font-bold text-blue-600 flex items-center h-full pt-2 md:pt-0">
                        {t('col_contrib', lang)}:
                      </div>
                      {isCash ? (
                        <div className="col-span-10 flex items-center text-xs text-slate-400 italic pl-1">
                          {t('note_cash_account', lang)}
                        </div>
                      ) : (
                        <>
                          <Input className="col-span-4 md:col-span-2" label={t('col_amt', lang)} value={item.contributionAmount} onChange={(v: number) => updateItem('assets', item.id, 'contributionAmount', v)} />
                          <Select className="col-span-4 md:col-span-2" label={t('col_freq', lang)} value={item.contributionFrequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('assets', item.id, 'contributionFrequency', v)} />
                          <Input className="col-span-2 md:col-span-2" label={t('col_start', lang)} value={item.contributionStartAge} limits={AGE_LIMITS} onChange={v => updateItem('assets', item.id, 'contributionStartAge', v)} />
                          <Input className="col-span-2 md:col-span-2" label={t('col_end', lang)} value={item.contributionEndAge || ''} limits={AGE_LIMITS} optional placeholder={plan.maxAge.toString()} onChange={v => updateItem('assets', item.id, 'contributionEndAge', v)} />
                          <Input className="col-span-2 md:col-span-2" label={t('col_inc', lang)} value={item.contributionGrowthRate} limits={RATE_LIMITS} onChange={v => updateItem('assets', item.id, 'contributionGrowthRate', v)} />
                        </>
                      )}
                    </div>
                 </div>
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
        {plan.debts.map((item, index) => (
          <div 
            key={item.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, 'debts', index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'debts', index)}
            className="flex items-center gap-2 bg-slate-50/50 p-2 rounded mb-2"
          >
            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripIcon /></div>
            <div className="flex-1 grid grid-cols-12 gap-2 items-end">
               <Input className="col-span-5" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('debts', item.id, 'name', v)} />
               <Input className="col-span-3" label={t('col_value', lang)} value={item.value} onChange={(v: number) => updateItem('debts', item.id, 'value', v)} />
               <Input className="col-span-3" label={t('col_rate', lang)} value={item.interestRate} limits={RATE_LIMITS} onChange={v => updateItem('debts', item.id, 'interestRate', v)} />
               <button onClick={() => removeItem('debts', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
            </div>
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
        {plan.incomes.map((item, index) => (
          <div 
            key={item.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, 'incomes', index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'incomes', index)}
            className="flex items-center gap-2 bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2"
          >
             <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripIcon /></div>
             <div className="flex-1 grid grid-cols-12 gap-2 items-end">
               <Input className="col-span-3" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('incomes', item.id, 'name', v)} />
               <Input className="col-span-2" label={t('col_amt', lang)} value={item.value} onChange={(v: number) => updateItem('incomes', item.id, 'value', v)} />
               <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('incomes', item.id, 'frequency', v)} />
               <Input className="col-span-1" label={t('col_start', lang)} value={item.startAge} limits={AGE_LIMITS} onChange={v => updateItem('incomes', item.id, 'startAge', v)} />
               <Input className="col-span-1" label={t('col_end', lang)} value={item.endAge || ''} limits={AGE_LIMITS} optional placeholder={plan.retirementAge.toString()} onChange={v => updateItem('incomes', item.id, 'endAge', v)} />
               <Input className="col-span-2" label={t('col_inc', lang)} value={item.growthRate} limits={RATE_LIMITS} onChange={v => updateItem('incomes', item.id, 'growthRate', v)} />
               <button onClick={() => removeItem('incomes', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
             </div>
          </div>
        ))}
         {plan.incomes.length < 20 && (
          <button 
             onClick={() => addItem('incomes', { id: Date.now().toString(), name: 'Work', value: 0, interestRate: 0, frequency: 'monthly', startAge: plan.currentAge, growthRate: 0 })}
             className="text-sm text-blue-600 font-medium hover:underline"
          >
            {t('btn_add', lang)}
          </button>
        )}
      </Section>

      {/* 5. Expenses */}
      <Section title={t('section_expenses', lang)}>
        {plan.expenses.map((item, index) => (
          <div 
             key={item.id} 
             draggable
             onDragStart={(e) => handleDragStart(e, 'expenses', index)}
             onDragOver={handleDragOver}
             onDrop={(e) => handleDrop(e, 'expenses', index)}
             className="flex items-center gap-2 bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2"
          >
            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripIcon /></div>
            <div className="flex-1 grid grid-cols-12 gap-2 items-end">
               <Input className="col-span-3" label={t('col_name', lang)} type="text" value={item.name} onChange={(v: string) => updateItem('expenses', item.id, 'name', v)} />
               <Input className="col-span-2" label={t('col_amt', lang)} value={item.value} onChange={(v: number) => updateItem('expenses', item.id, 'value', v)} />
               <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('expenses', item.id, 'frequency', v)} />
               <Select className="col-span-2" label="Type" value={item.type || 'general'} options={[{value: 'general', label: 'Gen'}, {value: 'medical', label: 'Med'}]} onChange={(v: string) => updateItem('expenses', item.id, 'type', v)} />
               <Input className="col-span-1" label={t('col_start', lang)} value={item.startAge} limits={AGE_LIMITS} onChange={v => updateItem('expenses', item.id, 'startAge', v)} />
               <Input className="col-span-1" label={t('col_end', lang)} value={item.endAge || ''} limits={AGE_LIMITS} optional placeholder={plan.maxAge.toString()} onChange={v => updateItem('expenses', item.id, 'endAge', v)} />
               <button onClick={() => removeItem('expenses', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
            </div>
          </div>
        ))}
        {plan.expenses.length < 30 && (
          <button 
             onClick={() => addItem('expenses', { id: Date.now().toString(), name: 'General', value: 0, interestRate: 0, frequency: 'monthly', startAge: plan.currentAge, type: 'general', growthRate: 0 })}
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
        {plan.debtPayments.map((item, index) => (
            <div 
               key={item.id} 
               draggable
               onDragStart={(e) => handleDragStart(e, 'debtPayments', index)}
               onDragOver={handleDragOver}
               onDrop={(e) => handleDrop(e, 'debtPayments', index)}
               className="flex items-center gap-2 bg-slate-50/50 p-2 rounded border-b border-slate-100 last:border-0 mb-2"
            >
               <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"><GripIcon /></div>
               <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                  <Select 
                   className="col-span-3" 
                   label="Loan" 
                   value={item.debtId} 
                   options={plan.debts.map(debt => ({ value: debt.id, label: debt.name }))}
                   onChange={(v: string) => updateItem('debtPayments', item.id, 'debtId', v)} 
                 />
                 <Input className="col-span-2" label={t('col_amt', lang)} value={item.amount} onChange={(v: number) => updateItem('debtPayments', item.id, 'amount', v)} />
                 <Select className="col-span-2" label={t('col_freq', lang)} value={item.frequency} options={[{value: 'monthly', label: t('lbl_monthly', lang)}, {value: 'yearly', label: t('lbl_yearly', lang)}]} onChange={(v: string) => updateItem('debtPayments', item.id, 'frequency', v)} />
                 <Input className="col-span-2" label="Extra/Yr" value={item.extraYearlyAmount} onChange={(v: number) => updateItem('debtPayments', item.id, 'extraYearlyAmount', v)} />
                 <Input className="col-span-2" label={t('col_inc', lang)} value={item.yearlyIncrement} limits={RATE_LIMITS} onChange={v => updateItem('debtPayments', item.id, 'yearlyIncrement', v)} />
                 <button onClick={() => removeItem('debtPayments', item.id)} className="col-span-1 text-red-400 hover:text-red-600 pb-2">×</button>
               </div>
            </div>
        ))}
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
