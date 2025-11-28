

import { Language } from "../types";

const resources = {
  en: {
    app_title: "RetirePlan",
    dashboard: "Dashboard",
    inputs: "Inputs",
    advisor: "Advisor",
    export: "Export",
    import: "Import",
    
    // Inputs
    section_profile: "Profile & Inflation",
    age_current: "Current Age",
    age_retire: "Retirement Age",
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
    
    btn_add: "+ Add Item",
    btn_remove: "Remove",

    // Dashboard
    chart_wealth: "Wealth Projection",
    chart_assets_detail: "Assets Growth by Type",
    chart_debts_detail: "Debt Payoff by Type",
    chart_breakdown: "Asset Breakdown",
    chart_expense: "Expense Breakdown",
    stat_nw: "Net Worth @ Retirement",
    stat_sus: "Plan Sustainability",
    msg_sus: "Assets last until 95+",
    msg_fail: "Assets depleted early",
    
    // AI
    ai_welcome: "I've analyzed your custom plan. I can see your specific assets and debt strategies. How can I help?",
    ai_placeholder: "Ask about your car loan or inflation impact...",
  },
  th: {
    app_title: "RetirePlan",
    dashboard: "ภาพรวม",
    inputs: "ข้อมูลนำเข้า",
    advisor: "ที่ปรึกษา AI",
    export: "ส่งออก",
    import: "นำเข้า",
    
    // Inputs
    section_profile: "ข้อมูลส่วนตัว & เงินเฟ้อ",
    age_current: "อายุปัจจุบัน",
    age_retire: "อายุเกษียณ",
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
    
    btn_add: "+ เพิ่มรายการ",
    btn_remove: "ลบ",

    // Dashboard
    chart_wealth: "แนวโน้มความมั่งคั่ง",
    chart_assets_detail: "การเติบโตของทรัพย์สิน",
    chart_debts_detail: "การลดลงของหนี้สิน",
    chart_breakdown: "สัดส่วนทรัพย์สิน",
    chart_expense: "สัดส่วนรายจ่าย",
    stat_nw: "ความมั่งคั่ง ณ เกษียณ",
    stat_sus: "ความยั่งยืนของแผน",
    msg_sus: "เงินพอใช้ถึงอายุ 95+",
    msg_fail: "เงินหมดก่อนกำหนด",
    
    // AI
    ai_welcome: "ฉันวิเคราะห์ข้อมูลการเงินของคุณแล้ว ฉันช่วยวางแผนเรื่องหนี้สินหรือการรับมือเงินเฟ้อได้นะ",
    ai_placeholder: "ถามเกี่ยวกับหนี้บ้าน หรือผลกระทบเงินเฟ้อ...",
  }
};

export const t = (key: keyof typeof resources.en, lang: Language) => {
  return resources[lang][key] || resources['en'][key] || key;
};
