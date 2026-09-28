import {
  CHANNELS, PAGE_IDS, validDate, netSales, recipeRows, unitCostsFor,
  saleCosts, summarizePeriod, inventoryBalances, inventoryBookBeforeCount,
  recordCounts, makeId
} from "./operations.mjs";

const STORAGE_KEY = "prep-cafe-operations-v1";
const main = document.querySelector("#app-main");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");
let dataset = null;
let store = emptyStore();
let page = "daily";
let dailyDate = "2026-09-18";
let performanceMode = "month";
let performanceDate = "2026-09";
let performanceChannel = "전체";
let profitMode = "month";
let profitDate = "2026-09";
let inventoryDate = "2026-09-18";
let toastTimer = 0;

function emptyStore() {
  return { saleOverrides: {}, deletedSales: [], addedSales: [], deletedInventory: [], addedInventory: [] };
}

function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return emptyStore();
    return {
      ...emptyStore(), ...saved,
      saleOverrides: saved.saleOverrides || {},
      deletedSales: Array.isArray(saved.deletedSales) ? saved.deletedSales : [],
      addedSales: Array.isArray(saved.addedSales) ? saved.addedSales : [],
      deletedInventory: Array.isArray(saved.deletedInventory) ? saved.deletedInventory : [],
      addedInventory: Array.isArray(saved.addedInventory) ? saved.addedInventory : []
    };
  } catch {
    notify("저장한 변경 내용을 읽지 못했습니다. 브라우저 저장 공간을 확인해 주세요.", true);
    return emptyStore();
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function commit(change, message) {
  const next = clone(store);
  change(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    store = next;
    render();
    closeModal();
    notify(message);
    return true;
  } catch {
    notify("저장하지 못했습니다. 입력 내용은 열려 있으니 브라우저 저장 공간을 확인해 주세요.", true);
    return false;
  }
}

function allSales() {
  const removed = new Set(store.deletedSales);
  return [
    ...dataset.sales.filter(sale => !removed.has(sale.sale_id)).map(sale => ({ ...sale, ...(store.saleOverrides[sale.sale_id] || {}) })),
    ...store.addedSales
  ];
}

function allInventoryEvents() {
  const removed = new Set(store.deletedInventory);
  return [
    ...dataset.inventory_events.filter(event => !removed.has(event.event_id)),
    ...store.addedInventory
  ].sort((a, b) => a.date.localeCompare(b.date) || String(a.event_id).localeCompare(String(b.event_id)));
}

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function won(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return "₩" + new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(Number(value));
}

function number(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(Number(value));
}

function dateText(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year + "." + month + "." + day;
}

function monthEnd(month) {
  const [year, numberMonth] = month.split("-").map(Number);
  return new Date(Date.UTC(year, numberMonth, 0)).toISOString().slice(0, 10);
}

function monthPeriod(value) {
  const from = value + "-01";
  const calendar = dataset.calendar.filter(day => day.date.startsWith(value));
  const recorded = [...allSales(), ...dataset.expenses].map(row => row.date).filter(date => date.startsWith(value)).sort();
  const hasCalendar = calendar.length > 0;
  const completed = hasCalendar && calendar.every(day => Boolean(day.record_complete));
  const lastCalendarDate = calendar.at(-1)?.date || monthEnd(value);
  const lastRecordedDate = recorded.at(-1) || "";
  const partial = hasCalendar && !completed;
  const through = partial && lastRecordedDate ? lastRecordedDate : monthEnd(value);
  return { from, through, partial, lastRecordedDate, lastCalendarDate };
}

function pageHeader(eyebrow, title, subtitle, actions = "") {
  return '<div class="page-title-row"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h1 class="page-title">' + esc(title) + '</h1><p class="page-subtitle">' + esc(subtitle) + '</p></div>' + (actions ? '<div class="action-row">' + actions + "</div>" : "") + "</div>";
}

function dateControl(label, value, changeName, type = "date", extraClass = "") {
  return '<label class="field ' + extraClass + '"><span class="control-label">' + esc(label) + '</span><input type="' + type + '" value="' + esc(value) + '" data-change="' + esc(changeName) + '" aria-label="' + esc(label) + '"></label>';
}

function kpi(label, value, note, modifier = "") {
  return '<article class="surface kpi ' + modifier + '"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value">' + esc(value) + '</div><div class="kpi-note">' + esc(note) + "</div></article>";
}

function moneyFromSummary(summary, property) {
  if (property === "revenue" && !summary.hasSales) return "—";
  if (["food", "packaging", "contribution"].includes(property) && !summary.hasSales) return "—";
  if (property === "expenseTotal" && !summary.hasExpenses) return "—";
  if (property === "profit" && !summary.hasSales && !summary.hasExpenses) return "—";
  if (["food", "packaging", "contribution", "profit"].includes(property) && !summary.costComplete) return "계산 미완성";
  return won(summary[property]);
}

function renderDaily() {
  const sales = allSales();
  const expenses = dataset.expenses;
  const summary = summarizePeriod(dataset, sales, expenses, dailyDate, dailyDate);
  const actions = '<button class="button primary" data-action="new-sale">＋ 판매 기록</button>';
  const statusNotice = summary.hasSales
    ? '<div class="notice-card"><strong>' + dateText(dailyDate) + ' 기록</strong> · 판매 ' + number(summary.sales.length, 0) + '행 · 판매량 ' + number(summary.quantity, 0) + '개 · 금액은 입력된 판매 행만 합산합니다.</div>'
    : '<div class="notice-card warning"><strong>' + dateText(dailyDate) + ' 판매 기록 없음</strong> · 판매 0원으로 확정하지 않습니다. 실제 0건과 기록 누락을 구분해 표시합니다.</div>';
  const salesRows = summary.sales.length ? summary.sales.map(sale => {
    const menu = dataset.menus.find(item => item.menu_id === sale.menu_id);
    return '<tr><td><strong>' + esc(menu?.name || "알 수 없는 메뉴") + '</strong><div class="muted">' + esc(sale.sale_id) + '</div></td><td><span class="pill ' + (sale.channel === "포장" ? "amber" : "gray") + '">' + esc(sale.channel) + '</span></td><td class="numeric">' + number(sale.quantity, 0) + '</td><td class="numeric">' + won(sale.unit_price, 0) + '</td><td class="numeric">' + won(sale.discount_amount || 0, 0) + '</td><td class="numeric">' + won(sale.payment_fee || 0, 0) + '</td><td class="numeric"><strong>' + won(netSales(sale), 0) + '</strong></td><td><div class="table-actions"><button class="link-button" data-action="edit-sale" data-id="' + esc(sale.sale_id) + '" aria-label="판매 수정">수정</button><button class="link-button" data-action="delete-sale" data-id="' + esc(sale.sale_id) + '" aria-label="판매 삭제">삭제</button></div></td></tr>';
  }).join("") : '<tr><td colspan="8"><div class="empty-state"><strong>이 날짜의 판매 행이 없습니다.</strong>기록을 추가하면 여기에서 행과 합계를 확인할 수 있습니다.</div></td></tr>';
  const expenseRows = summary.expenses.slice(0, 10).map(expense =>
    '<tr><td>' + esc(expense.category) + '</td><td class="numeric">' + won(expense.amount, 0) + '</td><td class="muted">' + esc(expense.recognition || "기록") + '</td></tr>'
  ).join("");
  const incomplete = !summary.costComplete ? '<div class="notice-card warning">원가를 계산할 수 없는 판매 ' + summary.incompleteCount + '건이 있습니다. 누락 원가를 0원으로 바꾸지 않고 손익 계산을 미완성으로 표시합니다.</div>' : "";
  return pageHeader("DAILY RECORDS", "일일 기록", "판매 기록을 관리하고 선택한 날짜의 입력값과 결과를 확인합니다.", actions) +
    '<div class="controls">' + dateControl("영업 기준일", dailyDate, "daily-date") + '<span class="helper">샘플 기록 마지막 날짜: ' + esc(dataset.meta.as_of) + '</span></div>' +
    statusNotice + incomplete +
    '<section class="kpi-grid">' +
    kpi("순매출", moneyFromSummary(summary, "revenue"), summary.hasSales ? number(summary.quantity, 0) + "개 판매 기록" : "판매 기록 없음", "warm") +
    kpi("재료비·포장비", !summary.hasSales ? "—" : summary.costComplete ? won(summary.food + summary.packaging) : "계산 미완성", !summary.hasSales ? "판매 기록 없음" : summary.costComplete ? "판매 당시 원가 스냅샷 또는 판매일 기준 원가" : "원가 자료 누락 판매 " + summary.incompleteCount + "건", "") +
    kpi("판매 수수료", summary.hasSales ? won(summary.fees) : "—", summary.hasSales ? "판매 기록 수수료를 한 번만 반영" : "판매 기록 없음", "") +
    kpi("기록 기준 손익", moneyFromSummary(summary, "profit"), summary.hasExpenses ? "해당 날짜 비용 기록 포함" : "비용 기록 없음", summary.profit === null ? "warn" : "good") +
    '</section><div class="two-col">' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>판매 기록</h2><p>각 입력 행은 따로 저장되고 집계에서 합산됩니다.</p></div><button class="button soft small" data-action="new-sale">＋ 추가</button></div><div class="table-wrap"><table><thead><tr><th>메뉴</th><th>채널</th><th class="numeric">수량</th><th class="numeric">단가</th><th class="numeric">할인</th><th class="numeric">수수료</th><th class="numeric">순매출</th><th class="numeric">작업</th></tr></thead><tbody>' + salesRows + '</tbody></table></div><div class="table-footnote">순매출 = 수량 × 단가 − 할인액 · 수수료는 별도 차감 항목입니다.</div></section>' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>샘플 비용 기록</h2><p>비용 입력·수정·삭제는 개발 계획의 후속 범위입니다.</p></div><span class="pill gray">' + number(summary.expenses.length, 0) + '건</span></div><div class="table-wrap"><table><thead><tr><th>분류</th><th class="numeric">금액</th><th>비고</th></tr></thead><tbody>' + (expenseRows || '<tr><td colspan="3"><div class="empty-state">해당 날짜 비용 기록 없음</div></td></tr>') + '</tbody></table></div><div class="table-footnote">월 비용계획은 손익 합계에 더하지 않습니다.</div></section></div>';
}

function rangeFor(mode, value) {
  if (mode === "day") return { from: value, through: value, partial: false, lastRecordedDate: value };
  return monthPeriod(value);
}

function dateSelector(label, mode, value, changePrefix) {
  const type = mode === "day" ? "date" : "month";
  const control = dateControl(label, value, changePrefix + "-date", type);
  return '<div class="segmented" role="group" aria-label="' + esc(label) + ' 보기">' +
    '<button class="button ' + (mode === "day" ? "primary" : "ghost") + ' small" data-action="' + changePrefix + '-mode" data-value="day">일별</button>' +
    '<button class="button ' + (mode === "month" ? "primary" : "ghost") + ' small" data-action="' + changePrefix + '-mode" data-value="month">월별</button></div>' + control;
}

function summaryStatus(range, summary) {
  if (!summary.hasSales && !summary.hasExpenses) return '<div class="notice-card warning"><strong>선택 기간에 판매·비용 기록이 없습니다.</strong> 결과를 0원 실적으로 간주하지 않습니다.</div>';
  if (range.partial) return '<div class="notice-card warning"><strong>' + esc(range.from.slice(0, 7)) + '은 부분 기간입니다.</strong> 샘플 마지막 기록일 ' + esc(range.lastRecordedDate || dataset.meta.as_of) + '까지 집계합니다. 이후 날짜는 판매 0건으로 간주하지 않습니다.</div>';
  return '<div class="notice-card"><strong>기록 기준 조회</strong> · ' + dateText(range.from) + (range.from === range.through ? "" : " ~ " + dateText(range.through)) + ' · 비용기록만 포함하고 월비용계획은 중복 합산하지 않습니다.</div>';
}

function topMenuBars(summary) {
  const ranked = summary.menus.filter(item => item.costComplete).sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  if (!ranked.length) return '<div class="empty-state">완전한 원가 자료가 있는 판매가 없습니다.</div>';
  const max = Math.max(...ranked.map(item => item.contribution), 1);
  return '<div class="bar-list">' + ranked.map((item, index) => {
    const menu = dataset.menus.find(row => row.menu_id === item.menuId);
    const width = Math.max(2, Math.max(0, item.contribution / max * 100));
    return '<div class="bar-row"><span class="menu-name">' + esc(menu?.name || item.menuId) + '</span><div class="bar-track"><div class="bar-fill ' + (index === 0 ? "green" : "") + '" style="width:' + width + '%"></div></div><strong class="numeric">' + won(item.contribution) + '</strong></div>';
  }).join("") + '</div>';
}

function menuTable(summary) {
  const menus = summary.menus.sort((a, b) => {
    if (!a.costComplete && b.costComplete) return 1;
    if (a.costComplete && !b.costComplete) return -1;
    return b.contribution - a.contribution;
  });
  const rows = menus.length ? menus.map(item => {
    const menu = dataset.menus.find(row => row.menu_id === item.menuId);
    const perUnit = item.quantity ? item.contribution / item.quantity : null;
    const margin = item.revenue ? item.contribution / item.revenue * 100 : null;
    return '<tr><td><strong>' + esc(menu?.name || item.menuId) + '</strong><div class="muted">' + esc(menu?.category || "") + '</div></td><td class="numeric">' + number(item.quantity, 0) + '</td><td class="numeric">' + won(item.revenue) + '</td><td class="numeric">' + (item.costComplete ? won(item.food) : '<span class="pill amber">계산 미완성</span>') + '</td><td class="numeric">' + (item.costComplete ? won(item.packaging) : "—") + '</td><td class="numeric">' + won(item.fees) + '</td><td class="numeric">' + (item.costComplete ? won(perUnit) : "—") + '</td><td class="numeric">' + (item.costComplete ? (margin === null ? "계산 불가" : number(margin, 1) + "%") : "—") + '</td><td class="numeric">' + (item.costComplete ? '<strong>' + won(item.contribution) + '</strong>' : "—") + '</td></tr>';
  }).join("") : '<tr><td colspan="9"><div class="empty-state"><strong>선택 기간에 판매 기록이 없습니다.</strong>실적이 없는 날짜는 0원 판매로 표시하지 않습니다.</div></td></tr>';
  return '<div class="table-wrap"><table><thead><tr><th>메뉴</th><th class="numeric">판매량</th><th class="numeric">순매출</th><th class="numeric">재료비</th><th class="numeric">포장비</th><th class="numeric">수수료</th><th class="numeric">개당 공헌이익</th><th class="numeric">공헌이익률</th><th class="numeric">총 공헌이익</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderPerformance() {
  const range = rangeFor(performanceMode, performanceDate);
  const summary = summarizePeriod(dataset, allSales(), dataset.expenses, range.from, range.through, performanceChannel);
  const actions = '<button class="button soft" data-action="new-sale">＋ 판매 기록</button>';
  const modeButtons = dateSelector("실적 기간", performanceMode, performanceDate, "performance");
  const channelControl = '<label class="field"><span class="control-label">판매 채널</span><select data-change="performance-channel" aria-label="판매 채널">' + ["전체", ...CHANNELS].map(channel => '<option ' + (channel === performanceChannel ? "selected" : "") + '>' + esc(channel) + "</option>").join("") + "</select></label>";
  const incomplete = summary.incompleteCount ? '<div class="notice-card warning">원가 누락 판매 ' + summary.incompleteCount + '건을 확인해 주세요. 수익성 합계는 완료된 원가처럼 보이지 않도록 미완성으로 표시합니다.</div>' : "";
  return pageHeader("PERFORMANCE", "실적·메뉴 수익성", "선택한 일자 또는 월의 실제 판매 기록으로 메뉴별 공헌이익을 확인합니다.", actions) +
    '<div class="controls">' + modeButtons + channelControl + '<span class="helper">조회: ' + esc(range.from) + (range.from === range.through ? "" : " ~ " + esc(range.through)) + "</span></div>" +
    summaryStatus(range, summary) + incomplete +
    '<section class="kpi-grid">' +
    kpi("순매출", moneyFromSummary(summary, "revenue"), summary.hasSales ? number(summary.quantity, 0) + "개 판매" : "판매 기록 없음", "warm") +
    kpi("직접 원가", !summary.hasSales ? "—" : summary.costComplete ? won(summary.food + summary.packaging) : "계산 미완성", "재료비 + 채널별 포장비") +
    kpi("판매 수수료", summary.hasSales ? won(summary.fees) : "—", summary.hasSales ? "판매 데이터에 기록된 금액" : "판매 기록 없음") +
    kpi("공헌이익", moneyFromSummary(summary, "contribution"), "매출 − 직접 원가 − 수수료", "good") +
    '</section><div class="two-col">' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>메뉴별 공헌이익</h2><p>공통 비용은 메뉴별로 나누지 않습니다.</p></div></div>' + topMenuBars(summary) + '</section>' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>계산 기준</h2><p>샘플 과거 판매에는 당시 원가 스냅샷을 사용합니다.</p></div></div><div class="formula">공헌이익 = 할인 후 판매액 − 재료비 − 포장비 − 수수료<br>공헌이익률 = 공헌이익 ÷ 할인 후 판매액<br>일 판매액이 0원이면 비율은 계산하지 않습니다.</div><p class="data-note">신규 판매는 판매일에 적용되는 재료 가격과 해당 채널 레시피로 원가를 계산합니다.</p></section></div>' +
    '<section class="surface surface-pad" style="margin-top:16px"><div class="section-heading"><div><h2>메뉴별 상세</h2><p>' + summary.menus.length + '개 메뉴에 판매 기록이 있습니다.</p></div></div>' + menuTable(summary) + '</section>';
}

function expenseBreakdown(expenses) {
  const groups = new Map();
  for (const item of expenses) groups.set(item.category, (groups.get(item.category) || 0) + Number(item.amount || 0));
  const rows = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<div class="empty-state">선택 기간 비용 기록 없음</div>';
  const max = Math.max(...rows.map(row => row[1]), 1);
  return '<div class="bar-list">' + rows.map(([category, amount]) =>
    '<div class="bar-row"><span>' + esc(category) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(2, amount / max * 100) + '%"></div></div><strong class="numeric">' + won(amount, 0) + '</strong></div>'
  ).join("") + '</div>';
}

function renderProfit() {
  const range = rangeFor(profitMode, profitDate);
  const summary = summarizePeriod(dataset, allSales(), dataset.expenses, range.from, range.through);
  const selector = dateSelector("손익 기간", profitMode, profitDate, "profit");
  const status = summaryStatus(range, summary);
  const profitLabel = moneyFromSummary(summary, "profit");
  const profitClass = summary.profit === null ? "warn" : (summary.profit < 0 ? "warn" : "good");
  const expenseRows = summary.expenses.map(expense => '<tr><td>' + esc(expense.date) + '</td><td>' + esc(expense.category) + '</td><td class="numeric">' + won(expense.amount, 0) + '</td><td class="muted">' + esc(expense.recognition || "기록") + '</td></tr>').join("");
  const costMissing = summary.incompleteCount ? '<div class="notice-card warning">원가 계산 미완성인 판매 ' + summary.incompleteCount + '건이 있어 손익을 계산하지 않았습니다. 누락 원가를 0원으로 간주하지 않습니다.</div>' : "";
  return pageHeader("PERIOD PROFIT", "기간별 손익", "샘플 비용 기록을 한 번만 반영한 기록 기준 손익입니다.", "") +
    '<div class="controls">' + selector + '<span class="helper">조회: ' + esc(range.from) + (range.from === range.through ? "" : " ~ " + esc(range.through)) + '</span></div>' +
    status + '<div class="notice-card"><strong>해석 안내</strong> · 이 결과는 기록 기준 손익이며 현금 지급액이나 공식 재무제표를 뜻하지 않습니다. 월비용계획은 비용기록과 중복 합산하지 않습니다.</div>' + costMissing +
    '<section class="kpi-grid">' +
    kpi("순매출", moneyFromSummary(summary, "revenue"), summary.hasSales ? number(summary.quantity, 0) + "개 판매 기록" : "판매 기록 없음", "warm") +
    kpi("메뉴 직접 원가", !summary.hasSales ? "—" : summary.costComplete ? won(summary.food + summary.packaging) : "계산 미완성", "재료비 + 포장비") +
    kpi("수수료·비용 기록", !summary.hasSales && !summary.hasExpenses ? "—" : won(summary.fees + summary.expenseTotal), "수수료 " + won(summary.fees) + " · 비용 " + (summary.hasExpenses ? won(summary.expenseTotal, 0) : "기록 없음")) +
    kpi("기록 기준 손익", profitLabel, "순매출 − 직접 원가 − 수수료 − 비용 기록", profitClass) +
    '</section><div class="two-col">' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>손익 계산</h2><p>별도 비용 기록 ' + number(summary.expenses.length, 0) + '건</p></div></div><div class="formula">순매출　' + (summary.hasSales ? won(summary.revenue) : "기록 없음") + '<br>− 메뉴 직접 원가　' + (!summary.hasSales ? "판매 기록 없음" : summary.costComplete ? won(summary.food + summary.packaging) : "계산 미완성") + '<br>− 판매 수수료　' + (summary.hasSales ? won(summary.fees) : "판매 기록 없음") + '<br>− 비용 기록　' + (summary.hasExpenses ? won(summary.expenseTotal, 0) : "기록 없음") + '<br>＝ 기록 기준 손익　<strong>' + esc(profitLabel) + "</strong></div></section>" +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>비용 분류 합계</h2><p>선택 기간 실제 비용기록 기준</p></div></div>' + expenseBreakdown(summary.expenses) + '</section></div>' +
    '<section class="surface surface-pad" style="margin-top:16px"><div class="section-heading"><div><h2>비용 기록 내역</h2><p>원본 샘플에 포함된 일별 비용 배분 기록입니다.</p></div><span class="pill gray">' + number(summary.expenses.length, 0) + '건</span></div><div class="table-wrap"><table><thead><tr><th>일자</th><th>분류</th><th class="numeric">금액</th><th>기록 기준</th></tr></thead><tbody>' + (expenseRows || '<tr><td colspan="4"><div class="empty-state">비용 기록 없음</div></td></tr>') + '</tbody></table></div></section>';
}

function recentEvent(materialId, events) {
  return events.filter(item => item.material_id === materialId).sort((a, b) => b.date.localeCompare(a.date) || String(b.event_id).localeCompare(String(a.event_id)))[0] || null;
}

function renderInventory() {
  const sales = allSales();
  const events = allInventoryEvents();
  const balances = inventoryBalances(dataset, sales, events, inventoryDate);
  const shortageCount = [...balances.values()].filter(value => value < 0).length;
  const rows = dataset.materials.map(material => {
    const balance = balances.get(material.material_id) || 0;
    const opening = dataset.opening_inventory.find(item => item.material_id === material.material_id);
    const recent = recentEvent(material.material_id, events.filter(event => event.date <= inventoryDate));
    const status = balance < 0 ? '<span class="pill red">기록상 잔량 부족</span>' : '<span class="pill green">잔량 확인</span>';
    const lastActivity = recent ? esc(recent.event_type) + " " + (Number(recent.quantity) > 0 ? "+" : "") + number(recent.quantity) + " " + esc(material.unit) : "재고 변동 없음";
    return '<tr><td><strong>' + esc(material.name) + '</strong><div class="muted">' + esc(material.material_id) + '</div></td><td>' + esc(material.unit) + '</td><td class="numeric"><strong class="stock-number ' + (balance < 0 ? "stock-row-low" : "") + '">' + number(balance) + '</strong></td><td class="numeric">' + (opening ? number(opening.quantity) : "—") + '</td><td class="numeric">' + number(material.safety_days, 0) + '일</td><td>' + status + '</td><td><span class="muted">' + lastActivity + '</span><div class="data-note">' + esc(recent?.date || "") + '</div></td><td><div class="table-actions"><button class="link-button" data-action="new-stock" data-material="' + esc(material.material_id) + '">변동</button><button class="link-button" data-action="new-count" data-material="' + esc(material.material_id) + '">실사</button></div></td></tr>';
  }).join("");
  const eventRows = events.filter(event => event.date <= inventoryDate).slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.event_id).localeCompare(String(a.event_id))).slice(0, 14).map(event => {
    const material = dataset.materials.find(row => row.material_id === event.material_id);
    return '<tr><td>' + esc(event.date) + '</td><td><span class="pill ' + (event.event_type === "입고" ? "green" : event.event_type === "폐기" ? "red" : "amber") + '">' + esc(event.event_type) + '</span></td><td>' + esc(material?.name || event.material_id) + '</td><td class="numeric">' + number(event.quantity) + ' ' + esc(event.unit) + '</td><td class="muted">' + esc(event.reason || "") + '</td></tr>';
  }).join("");
  return pageHeader("INVENTORY", "재료 잔량·재고", "초기 재고, 입고·폐기·실사, 판매 레시피 사용량을 반영한 장부 잔량입니다.", '<button class="button soft" data-action="new-stock">＋ 재고 변동</button><button class="button primary" data-action="new-count">실사 기록</button>') +
    '<div class="controls">' + dateControl("잔량 기준일", inventoryDate, "inventory-date") + '<span class="helper">판매 기록은 메뉴와 채널에 적용되는 레시피만큼 차감됩니다.</span></div>' +
    '<div class="notice-card"><strong>재고 계산</strong> · 시작 재고 + 입고·실사 조정 − 폐기 − 판매 레시피 사용량. 실사 기록은 실측 수량을 이후 잔량의 기준으로 사용합니다.</div>' +
    '<div class="inventory-toolbar"><div class="stat-inline"><span>관리 재료 <strong>' + dataset.materials.length + '종</strong></span><span>재고 변동·실사 <strong>' + number(events.length, 0) + '건</strong></span><span>음수 잔량 <strong>' + shortageCount + '종</strong></span></div><span class="data-note">안전재고 일수는 샘플 기준값이며 자동 발주량은 계산하지 않습니다.</span></div>' +
    '<section class="surface surface-pad"><div class="section-heading"><div><h2>재료별 잔량</h2><p>' + esc(dateText(inventoryDate)) + '까지의 장부 기준</p></div></div><div class="table-wrap"><table><thead><tr><th>재료</th><th>단위</th><th class="numeric">잔량</th><th class="numeric">초기 재고</th><th class="numeric">안전재고 참고</th><th>상태</th><th>최근 재고 기록</th><th class="numeric">작업</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
    '<section class="surface surface-pad" style="margin-top:16px"><div class="section-heading"><div><h2>최근 입고·폐기·실사</h2><p>선택한 기준일 이전의 재고 기록</p></div></div><div class="table-wrap"><table><thead><tr><th>일자</th><th>종류</th><th>재료</th><th class="numeric">변동량</th><th>사유</th></tr></thead><tbody>' + (eventRows || '<tr><td colspan="5"><div class="empty-state">재고 기록이 없습니다.</div></td></tr>') + '</tbody></table></div></section>';
}

function render() {
  if (!dataset) return;
  document.querySelector("#as-of-label").textContent = "샘플 마지막 기록일 " + dataset.meta.as_of;
  document.querySelectorAll("[data-page-link]").forEach(button => {
    const target = button.dataset.pageLink;
    button.classList.toggle("active", target === page);
    if (button.tagName === "BUTTON") button.setAttribute("aria-current", target === page ? "page" : "false");
  });
  if (!PAGE_IDS.includes(page)) page = "daily";
  main.innerHTML = page === "daily" ? renderDaily() : page === "performance" ? renderPerformance() : page === "profit" ? renderProfit() : renderInventory();
}

function notify(message, isError = false) {
  if (!toastRoot) return;
  toastRoot.innerHTML = '<div class="toast ' + (isError ? "error" : "") + '" role="status">' + esc(message) + "</div>";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastRoot.innerHTML = ""; }, 3600);
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function modal(title, description, body, submitLabel, formId) {
  modalRoot.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">' + esc(title) + '</h2><p>' + esc(description) + '</p></div><button class="close-button" type="button" data-action="close-modal" aria-label="닫기">×</button></div><form id="' + esc(formId) + '"><div class="modal-body">' + body + '<div class="modal-error" data-modal-error role="alert"></div></div><div class="modal-foot"><button class="button ghost" type="button" data-action="close-modal">취소</button><button class="button primary" type="submit">' + esc(submitLabel) + '</button></div></form></section></div>';
}

function setModalError(message) {
  const node = modalRoot.querySelector("[data-modal-error]");
  if (!node) return;
  node.textContent = message;
  node.classList.add("visible");
}

function menuOptions(selected = "") {
  return dataset.menus.map(menu => '<option value="' + esc(menu.menu_id) + '" ' + (menu.menu_id === selected ? "selected" : "") + '>' + esc(menu.name) + " · " + won(menu.price, 0) + "</option>").join("");
}

function materialOptions(selected = "") {
  return dataset.materials.map(material => '<option value="' + esc(material.material_id) + '" ' + (material.material_id === selected ? "selected" : "") + '>' + esc(material.name) + " · " + esc(material.unit) + "</option>").join("");
}

function showSaleForm(id = "") {
  const existing = id ? allSales().find(sale => sale.sale_id === id) : null;
  if (id && !existing) return notify("판매 기록을 찾지 못했습니다.", true);
  const selectedMenu = existing?.menu_id || dataset.menus[0].menu_id;
  const selectedChannel = existing?.channel || "매장";
  const costPreview = unitCostsFor(dataset, selectedMenu, selectedChannel, existing?.date || dailyDate, existing?.recipe_version);
  const edit = Boolean(existing);
  const body =
    '<div class="form-grid">' +
    '<div class="field"><label for="sale-date">영업일 *</label><input id="sale-date" name="date" type="date" required value="' + esc(existing?.date || dailyDate) + '"></div>' +
    '<div class="field"><label for="sale-menu">메뉴 *</label><select id="sale-menu" name="menu_id" required>' + menuOptions(selectedMenu) + '</select></div>' +
    '<div class="field"><label for="sale-channel">판매 채널 *</label><select id="sale-channel" name="channel" required>' + CHANNELS.map(channel => '<option ' + (channel === selectedChannel ? "selected" : "") + '>' + channel + "</option>").join("") + '</select></div>' +
    '<div class="field"><label for="sale-quantity">수량 *</label><input id="sale-quantity" name="quantity" type="number" min="1" step="1" required value="' + esc(existing?.quantity ?? 1) + '"></div>' +
    '<div class="field"><label for="sale-price">개당 판매가 (원) *</label><input id="sale-price" name="unit_price" type="number" min="0" step="1" required value="' + esc(existing?.unit_price ?? dataset.menus.find(item => item.menu_id === selectedMenu).price) + '"></div>' +
    '<div class="field"><label for="sale-discount">할인액 (원)</label><input id="sale-discount" name="discount_amount" type="number" min="0" step="1" value="' + esc(existing?.discount_amount ?? 0) + '"></div>' +
    '<div class="field"><label for="sale-fee">수수료 (원)</label><input id="sale-fee" name="payment_fee" type="number" min="0" step="1" value="' + esc(existing?.payment_fee ?? 0) + '"></div>' +
    '<div class="field span-2"><label>원가 계산</label><div class="preview-box"><span>' + (costPreview.complete ? "판매일 레시피 기준 · 재료 " + won(costPreview.food) + " · 포장 " + won(costPreview.packaging) : "원가 자료가 없어 저장 후 수익성이 미완성으로 표시됩니다.") + '</span><strong id="sale-preview">순매출 ' + won(existing ? netSales(existing) : Number(existing?.quantity || 1) * Number(existing?.unit_price || dataset.menus.find(item => item.menu_id === selectedMenu).price) - Number(existing?.discount_amount || 0)) + '</strong></div></div>' +
    '<input type="hidden" name="sale_id" value="' + esc(id) + '">' +
    '</div>';
  modal(edit ? "판매 기록 수정" : "판매 기록 추가", "별표 항목은 필수입니다. 할인액과 수수료는 음수로 입력할 수 없습니다.", body, edit ? "변경 저장" : "기록 저장", "sale-form");
  updateSalePreview();
}

function updateSalePreview() {
  const form = modalRoot.querySelector("#sale-form");
  if (!form) return;
  const data = new FormData(form);
  const quantity = Number(data.get("quantity") || 0);
  const price = Number(data.get("unit_price") || 0);
  const discount = Number(data.get("discount_amount") || 0);
  const gross = quantity * price;
  const preview = form.querySelector("#sale-preview");
  if (preview) preview.textContent = "순매출 " + won(gross - discount, 0) + " · 수수료 " + won(Number(data.get("payment_fee") || 0), 0);
}

function showStockForm(materialId = "") {
  const chosen = materialId || dataset.materials[0].material_id;
  const material = dataset.materials.find(row => row.material_id === chosen);
  const body =
    '<div class="form-grid">' +
    '<div class="field span-2"><label for="stock-material">재료 *</label><select id="stock-material" name="material_id" required>' + materialOptions(chosen) + '</select></div>' +
    '<div class="field"><label for="stock-date">기록일 *</label><input id="stock-date" name="date" type="date" required value="' + esc(inventoryDate) + '"></div>' +
    '<div class="field"><label for="stock-kind">변동 종류 *</label><select id="stock-kind" name="kind"><option value="입고">입고 · 잔량 증가</option><option value="폐기">폐기 · 잔량 감소</option></select></div>' +
    '<div class="field"><label for="stock-quantity">수량 (' + esc(material.unit) + ') *</label><input id="stock-quantity" name="quantity" type="number" min="0" step="' + (material.unit === "개" ? "1" : "0.01") + '" required></div>' +
    '<div class="field"><label for="stock-unit-display">단위</label><input id="stock-unit-display" value="' + esc(material.unit) + '" disabled></div>' +
    '<div class="field span-2"><label for="stock-reason">사유 *</label><input id="stock-reason" name="reason" maxlength="120" required placeholder="예: 정기 보충 입고"></div>' +
    '<div class="field span-2"><div class="preview-box"><span>선택한 재료의 현재 장부 잔량</span><strong id="stock-balance-preview">' + number(inventoryBalances(dataset, allSales(), allInventoryEvents(), inventoryDate).get(chosen) || 0) + " " + esc(material.unit) + "</strong></div></div></div>";
  modal("재고 변동 기록", "입고 또는 폐기를 기록합니다. 개 단위는 정수만 입력할 수 있습니다.", body, "재고 기록 저장", "stock-form");
}

function showCountForm(materialId = "") {
  const chosen = materialId || dataset.materials[0].material_id;
  const material = dataset.materials.find(row => row.material_id === chosen);
  const book = inventoryBookBeforeCount(dataset, allSales(), allInventoryEvents(), chosen, inventoryDate);
  const step = material.unit === "개" ? "1" : "0.01";
  const body =
    '<div class="form-grid">' +
    '<div class="field span-2"><label for="count-material">재료 *</label><select id="count-material" name="material_id" required>' + materialOptions(chosen) + '</select></div>' +
    '<div class="field"><label for="count-date">실사일 *</label><input id="count-date" name="date" type="date" required value="' + esc(inventoryDate) + '"></div>' +
    '<div class="field"><label for="count-physical">실측 수량 (' + esc(material.unit) + ') *</label><input id="count-physical" name="counted_quantity" type="number" min="0" step="' + step + '" required></div>' +
    '<div class="field span-2"><label for="count-reason">사유</label><input id="count-reason" name="reason" maxlength="120" value="실사 조정"></div>' +
    '<div class="field span-2"><div class="preview-box"><span>실사 전 장부 ' + number(book) + " " + esc(material.unit) + ' · 차이 <strong id="count-difference">—</strong></span><strong id="count-ledger">' + number(book) + " " + esc(material.unit) + "</strong></div></div></div>";
  modal("실사 수량 입력", "실측 수량과 장부 차이를 각각 저장하고 실측 수량을 이후 잔량의 기준으로 사용합니다.", body, "실사 기록 저장", "count-form");
  updateCountPreview();
}

function updateCountPreview() {
  const form = modalRoot.querySelector("#count-form");
  if (!form) return;
  const data = new FormData(form);
  const id = String(data.get("material_id") || "");
  const date = String(data.get("date") || "");
  const measured = data.get("counted_quantity") === "" ? null : Number(data.get("counted_quantity"));
  const material = dataset.materials.find(row => row.material_id === id);
  const book = material ? inventoryBookBeforeCount(dataset, allSales(), allInventoryEvents(), id, date) : null;
  const diff = modalRoot.querySelector("#count-difference");
  const ledger = modalRoot.querySelector("#count-ledger");
  if (diff) diff.textContent = measured === null || book === null ? "—" : (measured - book > 0 ? "+" : "") + number(measured - book) + " " + (material?.unit || "");
  if (ledger && material) ledger.textContent = number(book) + " " + material.unit;
}

function validateSaleForm(data) {
  const date = String(data.get("date") || "");
  const menu = dataset.menus.find(item => item.menu_id === data.get("menu_id"));
  const channel = String(data.get("channel") || "");
  const quantity = Number(data.get("quantity"));
  const price = Number(data.get("unit_price"));
  const discount = Number(data.get("discount_amount") || 0);
  const fee = Number(data.get("payment_fee") || 0);
  if (!validDate(date)) return "올바른 영업일을 입력해 주세요.";
  if (!menu) return "목록에 있는 메뉴를 선택해 주세요.";
  if (!CHANNELS.includes(channel)) return "매장 또는 포장 채널을 선택해 주세요.";
  if (!Number.isInteger(quantity) || quantity <= 0) return "수량은 1 이상의 정수로 입력해 주세요.";
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) return "단가는 0 이상의 원 단위 정수로 입력해 주세요.";
  if (!Number.isFinite(discount) || discount < 0 || !Number.isInteger(discount)) return "할인액은 0 이상의 원 단위 정수로 입력해 주세요.";
  if (!Number.isFinite(fee) || fee < 0 || !Number.isInteger(fee)) return "수수료는 0 이상의 원 단위 정수로 입력해 주세요.";
  if (discount > quantity * price) return "할인액은 수량 × 단가를 넘을 수 없습니다.";
  return "";
}

function submitSale(form) {
  const data = new FormData(form);
  const error = validateSaleForm(data);
  if (error) return setModalError(error);
  const menu = dataset.menus.find(item => item.menu_id === data.get("menu_id"));
  const id = String(data.get("sale_id") || "");
  const previous = id ? allSales().find(sale => sale.sale_id === id) : null;
  const date = String(data.get("date"));
  const channel = String(data.get("channel"));
  const hasSnapshots = previous && previous.unit_food_cost_snapshot !== null && previous.unit_food_cost_snapshot !== undefined && previous.unit_packaging_cost_snapshot !== null && previous.unit_packaging_cost_snapshot !== undefined;
  const costs = hasSnapshots && Number.isFinite(Number(previous.unit_food_cost_snapshot)) && Number.isFinite(Number(previous.unit_packaging_cost_snapshot))
    ? { complete: true, food: Number(previous.unit_food_cost_snapshot), packaging: Number(previous.unit_packaging_cost_snapshot) }
    : unitCostsFor(dataset, menu.menu_id, channel, date, menu.recipe_version);
  const sale = {
    ...(previous || {}),
    sale_id: id || makeId("U-S-"),
    date,
    menu_id: menu.menu_id,
    channel,
    quantity: Number(data.get("quantity")),
    unit_price: Number(data.get("unit_price")),
    discount_amount: Number(data.get("discount_amount") || 0),
    net_sales: Number(data.get("quantity")) * Number(data.get("unit_price")) - Number(data.get("discount_amount") || 0),
    payment_fee: Number(data.get("payment_fee") || 0),
    recipe_version: menu.recipe_version,
    unit_food_cost_snapshot: costs.complete ? costs.food : null,
    unit_packaging_cost_snapshot: costs.complete ? costs.packaging : null
  };
  const success = commit(next => {
    if (id && dataset.sales.some(item => item.sale_id === id)) next.saleOverrides[id] = sale;
    else if (id) next.addedSales = next.addedSales.map(item => item.sale_id === id ? sale : item);
    else next.addedSales.push(sale);
  }, id ? "판매 기록을 수정했습니다." : "판매 기록을 저장했습니다.");
  if (success) {
    dailyDate = date;
    if (performanceMode === "day") performanceDate = date;
    render();
  }
}

function submitStock(form) {
  const data = new FormData(form);
  const material = dataset.materials.find(row => row.material_id === data.get("material_id"));
  const date = String(data.get("date") || "");
  const kind = String(data.get("kind") || "");
  const amount = Number(data.get("quantity"));
  const reason = String(data.get("reason") || "").trim();
  if (!material || !validDate(date)) return setModalError("재료와 올바른 기록일을 입력해 주세요.");
  if (!["입고", "폐기"].includes(kind)) return setModalError("입고 또는 폐기를 선택해 주세요.");
  if (!Number.isFinite(amount) || amount <= 0) return setModalError("수량은 0보다 크게 입력해 주세요.");
  if (material.unit === "개" && !Number.isInteger(amount)) return setModalError("개 단위 수량은 정수로 입력해 주세요.");
  if (!reason) return setModalError("재고 변동 사유를 입력해 주세요.");
  const balances = inventoryBalances(dataset, allSales(), allInventoryEvents(), date);
  const balance = balances.get(material.material_id) || 0;
  if (kind === "폐기" && amount > balance) return setModalError("폐기량이 해당 날짜 장부 잔량(" + number(balance) + " " + material.unit + ")보다 큽니다.");
  const event = {
    event_id: makeId("U-I-"), date, material_id: material.material_id,
    event_type: kind, quantity: kind === "폐기" ? -amount : amount,
    unit: material.unit, reason
  };
  const success = commit(next => next.addedInventory.push(event), "재고 변동을 저장했습니다.");
  if (success) { inventoryDate = date; render(); }
}

function submitCount(form) {
  const data = new FormData(form);
  const material = dataset.materials.find(row => row.material_id === data.get("material_id"));
  const date = String(data.get("date") || "");
  const counted = Number(data.get("counted_quantity"));
  const reason = String(data.get("reason") || "").trim() || "실사 조정";
  if (!material || !validDate(date)) return setModalError("재료와 올바른 실사일을 입력해 주세요.");
  if (!Number.isFinite(counted) || counted < 0) return setModalError("실측 수량은 0 이상의 숫자로 입력해 주세요.");
  if (material.unit === "개" && !Number.isInteger(counted)) return setModalError("개 단위 실측 수량은 정수로 입력해 주세요.");
  const before = inventoryBookBeforeCount(dataset, allSales(), allInventoryEvents(), material.material_id, date);
  const event = {
    event_id: makeId("U-I-"), date, material_id: material.material_id,
    event_type: "실사조정", quantity: counted - before,
    counted_quantity: counted, unit: material.unit, reason
  };
  const success = commit(next => next.addedInventory.push(event), "실측 수량과 장부 차이를 저장했습니다.");
  if (success) { inventoryDate = date; render(); }
}

document.querySelector(".app-header").addEventListener("click", event => {
  const button = event.target.closest("[data-page-link], [data-action]");
  if (!button) return;
  if (button.dataset.pageLink) {
    event.preventDefault();
    page = button.dataset.pageLink;
    render();
  } else if (button.dataset.action === "new-sale") showSaleForm();
}, true);

main.addEventListener("click", event => {
  const button = event.target.closest("[data-page-link], [data-action]");
  if (!button) return;
  if (button.dataset.pageLink) {
    event.preventDefault();
    page = button.dataset.pageLink;
    render();
    return;
  }
  const action = button.dataset.action;
  if (action === "new-sale") showSaleForm();
  else if (action === "edit-sale") showSaleForm(button.dataset.id);
  else if (action === "delete-sale") {
    const id = button.dataset.id;
    const sale = allSales().find(item => item.sale_id === id);
    const menu = dataset.menus.find(item => item.menu_id === sale?.menu_id);
    if (!sale || !window.confirm(dateText(sale.date) + " " + (menu?.name || "") + " 판매 기록을 삭제할까요? 연결된 실적과 잔량도 다시 계산됩니다.")) return;
    commit(next => {
      if (dataset.sales.some(item => item.sale_id === id)) {
        next.deletedSales = [...new Set([...next.deletedSales, id])];
        delete next.saleOverrides[id];
      } else next.addedSales = next.addedSales.filter(item => item.sale_id !== id);
    }, "판매 기록을 삭제했습니다.");
  }
  else if (action === "new-stock") showStockForm(button.dataset.material || "");
  else if (action === "new-count") showCountForm(button.dataset.material || "");
  else if (action === "close-modal") closeModal();
  else if (action === "backdrop-close" && event.target === button) closeModal();
  else if (action === "performance-mode") {
    performanceMode = button.dataset.value;
    performanceDate = performanceMode === "day" ? "2026-09-18" : "2026-09";
    render();
  } else if (action === "profit-mode") {
    profitMode = button.dataset.value;
    profitDate = profitMode === "day" ? "2026-09-18" : "2026-09";
    render();
  }
}, true);

main.addEventListener("change", event => {
  const input = event.target;
  const value = input.value;
  if (input.dataset.change === "daily-date" && validDate(value)) { dailyDate = value; render(); }
  if (input.dataset.change === "performance-date") {
    performanceDate = performanceMode === "day" ? value : value;
    render();
  }
  if (input.dataset.change === "performance-channel") { performanceChannel = value; render(); }
  if (input.dataset.change === "profit-date") { profitDate = value; render(); }
  if (input.dataset.change === "inventory-date" && validDate(value)) { inventoryDate = value; render(); }
});

modalRoot.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "close-modal") closeModal();
  else if (button.dataset.action === "backdrop-close" && event.target === button) closeModal();
});

modalRoot.addEventListener("input", event => {
  if (event.target.closest("#sale-form")) updateSalePreview();
  if (event.target.closest("#count-form")) updateCountPreview();
});

modalRoot.addEventListener("change", event => {
  if (event.target.id === "sale-menu") {
    const menu = dataset.menus.find(item => item.menu_id === event.target.value);
    const form = modalRoot.querySelector("#sale-form");
    if (menu && form) form.elements.unit_price.value = menu.price;
    updateSalePreview();
  }
  if (event.target.id === "stock-material") {
    const material = dataset.materials.find(item => item.material_id === event.target.value);
    if (material) {
      modalRoot.querySelector("#stock-unit-display").value = material.unit;
      modalRoot.querySelector("#stock-quantity").step = material.unit === "개" ? "1" : "0.01";
    }
  }
  if (event.target.id === "count-material" || event.target.id === "count-date") updateCountPreview();
});

modalRoot.addEventListener("submit", event => {
  event.preventDefault();
  if (event.target.id === "sale-form") submitSale(event.target);
  else if (event.target.id === "stock-form") submitStock(event.target);
  else if (event.target.id === "count-form") submitCount(event.target);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modalRoot.firstElementChild) closeModal();
});

async function start() {
  try {
    const response = await fetch("./데이터/매장운영데이터.json");
    if (!response.ok) throw new Error("샘플 데이터 파일을 불러오지 못했습니다.");
    dataset = await response.json();
    store = readStore();
    const counts = recordCounts(dataset);
    if (counts.sales !== 6112 || counts.expenses !== 3560 || counts.inventory !== 1515 || counts.materials !== 11 || counts.menus !== 8 || counts.recipes !== 22 || counts.openingInventory !== 11) {
      throw new Error("샘플 자료의 필수 건수가 개발 계획과 일치하지 않습니다.");
    }
    render();
  } catch (error) {
    main.innerHTML = '<section class="surface surface-pad"><h1 class="page-title">자료를 불러오지 못했습니다.</h1><p class="page-subtitle">' + esc(error.message || "페이지를 다시 열어 주세요.") + '</p><p class="data-note">이 앱은 데이터 폴더가 제공되는 로컬 웹 서버에서 실행해야 합니다.</p></section>';
  }
}

start();
