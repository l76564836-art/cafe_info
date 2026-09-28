export const CHANNELS = ["매장", "포장"];
export const PAGE_IDS = ["daily", "performance", "profit", "inventory"];

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function netSales(sale) {
  if (Number.isFinite(Number(sale.net_sales))) return Number(sale.net_sales);
  return Number(sale.quantity) * Number(sale.unit_price) - Number(sale.discount_amount || 0);
}

export function recipeRows(dataset, menuId, recipeVersion, channel) {
  const menu = dataset.menus.find(item => item.menu_id === menuId);
  const version = recipeVersion || menu?.recipe_version;
  return dataset.recipes.filter(row =>
    row.menu_id === menuId &&
    row.recipe_version === version &&
    (!row.channel_only || row.channel_only === channel)
  );
}

function historicalUnitCost(dataset, materialId, date) {
  return dataset.price_history
    .filter(item => item.material_id === materialId && item.effective_date <= date)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0] || null;
}

export function unitCostsFor(dataset, menuId, channel, date, recipeVersion) {
  const rows = recipeRows(dataset, menuId, recipeVersion, channel);
  if (!rows.length) return { complete: false, food: null, packaging: null, reason: "적용 레시피 없음" };
  let food = 0;
  let packaging = 0;
  for (const row of rows) {
    const material = dataset.materials.find(item => item.material_id === row.material_id);
    const price = historicalUnitCost(dataset, row.material_id, date);
    if (!material || !price || !Number(price.pack_quantity)) {
      return { complete: false, food: null, packaging: null, reason: "재료 가격 자료 없음" };
    }
    const amount = Number(row.quantity) * Number(price.pack_price) / Number(price.pack_quantity);
    if (row.channel_only) packaging += amount;
    else food += amount;
  }
  return { complete: true, food, packaging, reason: "" };
}

export function saleCosts(dataset, sale) {
  const quantity = Number(sale.quantity);
  const hasFoodSnapshot = sale.unit_food_cost_snapshot !== null && sale.unit_food_cost_snapshot !== undefined && sale.unit_food_cost_snapshot !== "" && Number.isFinite(Number(sale.unit_food_cost_snapshot));
  const hasPackSnapshot = sale.unit_packaging_cost_snapshot !== null && sale.unit_packaging_cost_snapshot !== undefined && sale.unit_packaging_cost_snapshot !== "" && Number.isFinite(Number(sale.unit_packaging_cost_snapshot));
  if (hasFoodSnapshot && hasPackSnapshot) {
    return {
      complete: true,
      food: Number(sale.unit_food_cost_snapshot) * quantity,
      packaging: Number(sale.unit_packaging_cost_snapshot) * quantity,
      unitFood: Number(sale.unit_food_cost_snapshot),
      unitPackaging: Number(sale.unit_packaging_cost_snapshot),
      reason: ""
    };
  }
  const costs = unitCostsFor(dataset, sale.menu_id, sale.channel, sale.date, sale.recipe_version);
  return costs.complete
    ? { complete: true, food: costs.food * quantity, packaging: costs.packaging * quantity, unitFood: costs.food, unitPackaging: costs.packaging, reason: "" }
    : { ...costs, food: null, packaging: null, unitFood: null, unitPackaging: null };
}

export function summarizePeriod(dataset, sales, expenses, from, through, channel = "전체") {
  const periodSales = sales.filter(sale => sale.date >= from && sale.date <= through && (channel === "전체" || sale.channel === channel));
  const periodExpenses = expenses.filter(expense => expense.date >= from && expense.date <= through);
  const menuMap = new Map();
  let revenue = 0;
  let food = 0;
  let packaging = 0;
  let fees = 0;
  let incompleteCount = 0;
  for (const sale of periodSales) {
    const saleRevenue = netSales(sale);
    const costs = saleCosts(dataset, sale);
    revenue += saleRevenue;
    fees += Number(sale.payment_fee || 0);
    if (!costs.complete) incompleteCount += 1;
    const current = menuMap.get(sale.menu_id) || {
      menuId: sale.menu_id, quantity: 0, revenue: 0, food: 0, packaging: 0, fees: 0,
      contribution: 0, costComplete: true, saleCount: 0
    };
    current.quantity += Number(sale.quantity);
    current.revenue += saleRevenue;
    current.fees += Number(sale.payment_fee || 0);
    current.saleCount += 1;
    if (costs.complete) {
      current.food += costs.food;
      current.packaging += costs.packaging;
      current.contribution += saleRevenue - costs.food - costs.packaging - Number(sale.payment_fee || 0);
      food += costs.food;
      packaging += costs.packaging;
    } else {
      current.costComplete = false;
    }
    menuMap.set(sale.menu_id, current);
  }
  const expenseTotal = periodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const costComplete = incompleteCount === 0;
  return {
    from, through, channel, sales: periodSales, expenses: periodExpenses,
    revenue, food, packaging, fees, expenseTotal,
    contribution: costComplete ? revenue - food - packaging - fees : null,
    profit: costComplete ? revenue - food - packaging - fees - expenseTotal : null,
    costComplete, incompleteCount, hasSales: periodSales.length > 0,
    hasExpenses: periodExpenses.length > 0,
    quantity: periodSales.reduce((sum, sale) => sum + Number(sale.quantity), 0),
    menus: [...menuMap.values()]
  };
}

export function inventoryBalances(dataset, sales, events, through, omitAuditDate = "") {
  const result = new Map();
  for (const material of dataset.materials) {
    const opening = dataset.opening_inventory.find(row => row.material_id === material.material_id);
    let balance = opening && opening.date <= through ? Number(opening.quantity) : 0;
    const dates = new Set();
    for (const event of events) if (event.material_id === material.material_id && event.date <= through) dates.add(event.date);
    for (const sale of sales) if (sale.date <= through && recipeRows(dataset, sale.menu_id, sale.recipe_version, sale.channel).some(row => row.material_id === material.material_id)) dates.add(sale.date);
    for (const date of [...dates].sort()) {
      const dayEvents = events.filter(event => event.material_id === material.material_id && event.date === date);
      for (const event of dayEvents) {
        if (event.event_type === "실사조정" && Number.isFinite(Number(event.counted_quantity))) continue;
        balance += Number(event.quantity || 0);
      }
      for (const sale of sales) {
        if (sale.date !== date) continue;
        for (const row of recipeRows(dataset, sale.menu_id, sale.recipe_version, sale.channel)) {
          if (row.material_id === material.material_id) balance -= Number(row.quantity) * Number(sale.quantity);
        }
      }
      if (date !== omitAuditDate) {
        const counts = dayEvents.filter(event => event.event_type === "실사조정" && Number.isFinite(Number(event.counted_quantity)));
        if (counts.length) balance = Number(counts[counts.length - 1].counted_quantity);
      }
    }
    result.set(material.material_id, balance);
  }
  return result;
}

export function inventoryBookBeforeCount(dataset, sales, events, materialId, date) {
  return inventoryBalances(dataset, sales, events, date, date).get(materialId) ?? 0;
}

export function recordCounts(dataset) {
  return {
    menus: dataset.menus.length,
    materials: dataset.materials.length,
    recipes: dataset.recipes.length,
    sales: dataset.sales.length,
    expenses: dataset.expenses.length,
    inventory: dataset.inventory_events.length,
    openingInventory: dataset.opening_inventory.length
  };
}

export function makeId(prefix) {
  const unique = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  return prefix + unique;
}
