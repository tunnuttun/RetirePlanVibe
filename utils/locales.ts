

import { Language } from "../types";

const resources = {
  en: {
    app_title: "RetirePlan",
    dashboard: "Dashboard",
    inputs: "Inputs",
    export: "Export",
    import: "Import",
    
    // Inputs
    section_profile: "Profile & Inflation",
    age_current: "Current Age",
    age_retire: "Retirement Age",
    age_max: "Life Expectancy",
    lbl_currency: "Currency",
    inf_gen: "General Inflation (%)",
    inf_med: "Medical Inflation (%)",
    
    section_assets: "Assets & Investments",
    section_debts: "Debts (Current)",
    section_income: "Income",
    section_expenses: "Expenses",
    section_payoff: "Debt Repayment",

    col_name: "Name",
    col_value: "Current Value",
    col_rate: "Growth Rate (%)",
    col_contrib: "Add/Invest",
    col_amt: "Amount",
    col_freq: "Freq",
    col_start: "Start Age",
    col_end: "End Age",
    col_inc: "Increment (%)",
    
    lbl_monthly: "Monthly",
    lbl_yearly: "Yearly",
    lbl_debt_payments: "Debt Payments",
    lbl_investments: "Investments",
    
    btn_add: "+ Add Item",
    btn_remove: "Remove",
    
    note_priority: "Assets are prioritized from top to bottom. If liquidity is low, lower items may not receive contributions. Drag items to reorder.",

    warn_deficit_title: "Budget Deficit Detected",
    warn_deficit_msg: "Your total outflows (expenses + investments + debt) exceed your income by {amount}/month. Cash reserves will deplete rapidly.",

    // Dashboard
    chart_wealth: "Wealth Projection",
    chart_income: "Income Analysis",
    chart_outflow: "Outflow Analysis",
    chart_cashflow: "Yearly Net Cash Flow",
    chart_assets_detail: "Assets Growth by Type",
    chart_debts_detail: "Debt Payoff by Type",
    chart_expense: "Expense Breakdown",
    stat_nw: "Net Worth @ Retirement",
    stat_sus: "Plan Sustainability",
    msg_sus: "Assets last until End",
    msg_fail: "Assets depleted early",

    // AI Advisor
    ai_welcome: "Hello! I am your AI financial assistant. I can analyze your plan and offer advice. What's on your mind?",
    ai_placeholder: "Ask a question about your finances...",
  },
  th: {
    app_title: "RetirePlan",
    dashboard: "ภาพรวม",
    inputs: "ข้อมูลนำเข้า",
    export: "ส่งออก",
    import: "นำเข้า",
    
    // Inputs
    section_profile: "ข้อมูลส่วนตัว & เงินเฟ้อ",
    age_current: "อายุปัจจุบัน",
    age_retire: "อายุเกษียณ",
    age_max: "อายุขัยคาดการณ์",
    lbl_currency: "สกุลเงิน",
    inf_gen: "เงินเฟ้อทั่วไป (%)",
    inf_med: "เงินเฟ้อค่ารักษาพยาบาล (%)",
    
    section_assets: "ทรัพย์สิน & การลงทุน",
    section_debts: "หนี้สินปัจจุบัน",
    section_income: "รายได้",
    section_expenses: "รายจ่าย",
    section_payoff: "การชำระหนี้",

    col_name: "รายการ",
    col_value: "มูลค่าปัจจุบัน",
    col_rate: "ดบ.เติบโต (%)",
    col_contrib: "ออม/ลงทุนเพิ่ม",
    col_amt: "จำนวนเงิน",
    col_freq: "ความถี่",
    col_start: "เริ่ม (อายุ)",
    col_end: "จบ (อายุ)",
    col_inc: "เพิ่มขึ้น (%)",
    
    lbl_monthly: "ต่อเดือน",
    lbl_yearly: "ต่อปี",
    lbl_debt_payments: "การจ่ายหนี้",
    lbl_investments: "เงินลงทุน",
    
    btn_add: "+ เพิ่มรายการ",
    btn_remove: "ลบ",
    
    note_priority: "ลำดับมีผลต่อการลงทุน (บนลงล่าง) หากสภาพคล่องไม่พอ รายการด้านล่างอาจไม่ถูกลงทุน ลากเพื่อจัดลำดับใหม่",
    
    warn_deficit_title: "รายจ่ายเกินรายรับ",
    warn_deficit_msg: "ยอดรวมรายจ่าย (ค่าใช้จ่าย+ลงทุน+หนี้) เกินรายรับอยู่ {amount}/เดือน เงินเก็บจะหมดลงอย่างรวดเร็ว",

    // Dashboard
    chart_wealth: "แนวโน้มความมั่งคั่ง",
    chart_income: "วิเคราะห์รายได้",
    chart_outflow: "วิเคราะห์รายจ่าย",
    chart_cashflow: "กระแสเงินสดสุทธิต่อปี",
    chart_assets_detail: "การเติบโตของทรัพย์สิน",
    chart_debts_detail: "การลดลงของหนี้สิน",
    chart_expense: "สัดส่วนรายจ่าย",
    stat_nw: "ความมั่งคั่ง ณ เกษียณ",
    stat_sus: "ความยั่งยืนของแผน",
    msg_sus: "เงินพอใช้ตลอดแผน",
    msg_fail: "เงินหมดก่อนกำหนด",

    // AI Advisor
    ai_welcome: "สวัสดีครับ! ผมคือผู้ช่วยทางการเงิน AI ของคุณ ผมสามารถวิเคราะห์แผนและให้คำแนะนำได้ มีอะไรให้ช่วยไหมครับ?",
    ai_placeholder: "ถามคำถามเกี่ยวกับการเงินของคุณ...",
  }
};

export const t = (key: keyof typeof resources.en, lang: Language) => {
  return resources[lang][key] || resources['en'][key] || key;
};