

import { Language } from "../types";

const resources = {
  en: {
    app_title: "RetirePlan",
    dashboard: "Dashboard",
    inputs: "Inputs",
    export: "Export",
    import: "Import",
    import_success: "Plan loaded successfully.",
    import_warning: "Plan loaded. Some missing or invalid values were corrected or skipped.",
    import_error: "Could not read a retirement plan from this JSON file.",
    
    // Inputs
    section_profile: "Profile",
    section_inflation: "Inflation Categories",
    lbl_plan_name: "Plan Name (Filename)",
    plan_name_placeholder: "My Financial Plan",
    age_current: "Current Age",
    age_retire: "Retirement Age",
    age_max: "Life Expectancy",
    lbl_currency: "Currency",
    col_category_name: "Category Name",
    col_inflation_rate: "Rate (%)",
    lbl_expense_inflation: "Inflation",
    note_inflation: "Assign these rates to individual expenses.",
    inflation_new: "New Category",
    inflation_none: "No inflation category",
    btn_add_inflation: "+ Add Category",
    
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
    col_sell_age: "Sell Age",
    tip_sell_age: "The asset's balance moves to cash at this age and contributions stop.",
    col_inc: "Increment (%)",
    
    lbl_monthly: "Monthly",
    lbl_yearly: "Yearly",
    lbl_debt_payments: "Debt Payments",
    lbl_investments: "Investments",
    
    btn_add: "+ Add Item",
    btn_remove: "Remove",
    
    note_priority: "Assets are prioritized from top to bottom. If liquidity is low, lower items may not receive contributions. Drag items to reorder.",
    note_cash_account: "This account automatically receives surplus cash.",

    warn_deficit_title: "Budget Deficit Detected",
    warn_deficit_msg: "Projected outflows exceed income this year by an average of {amount} per month.",

    // Dashboard
    chart_wealth: "Wealth Projection",
    chart_income: "Income Analysis",
    chart_outflow: "Outflow Analysis",
    chart_cashflow: "Yearly Net Cash Flow",
    chart_assets_detail: "Assets Growth by Type",
    chart_debts_detail: "Debt Payoff by Type",
    chart_expense: "Expense Breakdown",
    chart_cash_balance: "Unallocated Cash",
    chart_age: "Age {age}",
    chart_total: "Total",
    chart_total_assets: "Total Assets",
    chart_total_debt: "Total Debt",
    chart_net_worth: "Net Worth",
    chart_unnamed_series: "Unnamed item",
    stat_nw: "Net Worth @ Retirement",
    stat_nw_age: "Net Worth at Age {age}",
    stat_debt: "Debt @ Retirement",
    stat_debt_age: "Debt at Age {age}",
    stat_sus: "Plan Sustainability",
    msg_sus: "Projected expenses covered",
    msg_fail: "No net assets at end of plan",
    msg_shortfall: "Cash shortfall at age {age}",

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
    import_success: "โหลดแผนสำเร็จ",
    import_warning: "โหลดแผนแล้ว ระบบแก้ไขหรือข้ามข้อมูลบางส่วนที่ขาดหายหรือไม่ถูกต้อง",
    import_error: "ไม่สามารถอ่านแผนเกษียณจากไฟล์ JSON นี้ได้",
    
    // Inputs
    section_profile: "ข้อมูลส่วนตัว",
    section_inflation: "หมวดหมู่เงินเฟ้อ",
    lbl_plan_name: "ชื่อแผน (ชื่อไฟล์)",
    plan_name_placeholder: "แผนการเงินของฉัน",
    age_current: "อายุปัจจุบัน",
    age_retire: "อายุเกษียณ",
    age_max: "อายุขัยคาดการณ์",
    lbl_currency: "สกุลเงิน",
    col_category_name: "ชื่อหมวดหมู่",
    col_inflation_rate: "อัตรา (%)",
    lbl_expense_inflation: "เงินเฟ้อ",
    note_inflation: "กำหนดอัตราเหล่านี้ให้กับรายการค่าใช้จ่ายแต่ละรายการ",
    inflation_new: "หมวดหมู่ใหม่",
    inflation_none: "ไม่มีหมวดหมู่เงินเฟ้อ",
    btn_add_inflation: "+ เพิ่มหมวดหมู่",
    
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
    col_sell_age: "ขายเมื่ออายุ",
    tip_sell_age: "เมื่อถึงอายุนี้ มูลค่าทรัพย์สินจะโอนไปเป็นเงินสดและหยุดลงทุนเพิ่ม",
    col_inc: "เพิ่มขึ้น (%)",
    
    lbl_monthly: "ต่อเดือน",
    lbl_yearly: "ต่อปี",
    lbl_debt_payments: "การจ่ายหนี้",
    lbl_investments: "เงินลงทุน",
    
    btn_add: "+ เพิ่มรายการ",
    btn_remove: "ลบ",
    
    note_priority: "ลำดับมีผลต่อการลงทุน (บนลงล่าง) หากสภาพคล่องไม่พอ รายการด้านล่างอาจไม่ถูกลงทุน ลากเพื่อจัดลำดับใหม่",
    note_cash_account: "เงินสดส่วนเกินจะเข้าในบัญชีนี้โดยอัตโนมัติ",
    
    warn_deficit_title: "รายจ่ายเกินรายรับ",
    warn_deficit_msg: "คาดว่าปีนี้มีเงินจ่ายออกมากกว่ารายรับเฉลี่ย {amount} ต่อเดือน",

    // Dashboard
    chart_wealth: "แนวโน้มความมั่งคั่ง",
    chart_income: "วิเคราะห์รายได้",
    chart_outflow: "วิเคราะห์รายจ่าย",
    chart_cashflow: "กระแสเงินสดสุทธิต่อปี",
    chart_assets_detail: "การเติบโตของทรัพย์สิน",
    chart_debts_detail: "การลดลงของหนี้สิน",
    chart_expense: "สัดส่วนรายจ่าย",
    chart_cash_balance: "เงินสดคงเหลือ",
    chart_age: "อายุ {age} ปี",
    chart_total: "รวม",
    chart_total_assets: "ทรัพย์สินรวม",
    chart_total_debt: "หนี้สินรวม",
    chart_net_worth: "ความมั่งคั่งสุทธิ",
    chart_unnamed_series: "รายการไม่มีชื่อ",
    stat_nw: "ความมั่งคั่ง ณ เกษียณ",
    stat_nw_age: "ความมั่งคั่งสุทธิเมื่ออายุ {age} ปี",
    stat_debt: "หนี้สิน ณ เกษียณ",
    stat_debt_age: "หนี้สินเมื่ออายุ {age} ปี",
    stat_sus: "ความยั่งยืนของแผน",
    msg_sus: "คาดว่ามีเงินพอจ่ายตลอดแผน",
    msg_fail: "ไม่เหลือทรัพย์สินสุทธิเมื่อสิ้นสุดแผน",
    msg_shortfall: "เงินสดไม่พอเมื่ออายุ {age} ปี",

    // AI Advisor
    ai_welcome: "สวัสดีครับ! ผมคือผู้ช่วยทางการเงิน AI ของคุณ ผมสามารถวิเคราะห์แผนและให้คำแนะนำได้ มีอะไรให้ช่วยไหมครับ?",
    ai_placeholder: "ถามคำถามเกี่ยวกับการเงินของคุณ...",
  }
};

export const t = (key: keyof typeof resources.en, lang: Language) => {
  return resources[lang][key] || resources['en'][key] || key;
};
