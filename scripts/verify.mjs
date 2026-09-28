import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  recordCounts, validDate, netSales, recipeRows, unitCostsFor,
  summarizePeriod, inventoryBalances
} from "../src/operations.mjs";

const dataPath = fileURLToPath(new URL("../데이터/매장운영데이터.json", import.meta.url));
const dataset = JSON.parse(await readFile(dataPath, "utf8"));
const counts = recordCounts(dataset);
assert.deepEqual(counts, { menus: 8, materials: 11, recipes: 22, sales: 6112, expenses: 3560, inventory: 1515, openingInventory: 11 });

const unique = values => new Set(values).size === values.length;
assert.equal(unique(dataset.menus.map(row => row.menu_id)), true, "menu IDs are unique");
assert.equal(unique(dataset.materials.map(row => row.material_id)), true, "material IDs are unique");
assert.equal(unique(dataset.sales.map(row => row.sale_id)), true, "sale IDs are unique");
assert.equal(dataset.sales.some(row => !dataset.menus.some(menu => menu.menu_id === row.menu_id)), false, "sales refer to a known menu");
assert.equal(dataset.recipes.some(row => !dataset.materials.some(material => material.material_id === row.material_id)), false, "recipes refer to a known material");

assert.equal(validDate("2026-09-18"), true);
assert.equal(validDate("2026-02-30"), false);
assert.equal(netSales({ quantity: 2, unit_price: 4000, discount_amount: 200 }), 7800);

const hall = unitCostsFor(dataset, "M01", "매장", "2026-09-18");
const takeout = unitCostsFor(dataset, "M01", "포장", "2026-09-18");
assert.equal(hall.complete, true);
assert.equal(takeout.complete, true);
assert.ok(Math.abs(hall.food - 496.8) < 0.001);
assert.equal(hall.packaging, 0);
assert.ok(Math.abs(takeout.packaging - 166.4) < 0.001);
assert.equal(recipeRows(dataset, "M01", "R1", "매장").some(row => row.channel_only), false);
assert.equal(recipeRows(dataset, "M01", "R1", "포장").some(row => row.channel_only === "포장"), true);

const fixtureSale = {
  sale_id: "TEST-1", date: "2026-09-18", menu_id: "M01", channel: "매장",
  quantity: 2, unit_price: 4000, discount_amount: 200, net_sales: 7800,
  payment_fee: 120, unit_food_cost_snapshot: 500, unit_packaging_cost_snapshot: 100
};
const fixtureExpense = { date: "2026-09-18", amount: 1000, category: "임차료" };
const fixture = summarizePeriod(dataset, [fixtureSale], [fixtureExpense], "2026-09-18", "2026-09-18");
assert.equal(fixture.revenue, 7800);
assert.equal(fixture.food, 1000);
assert.equal(fixture.packaging, 200);
assert.equal(fixture.contribution, 6480);
assert.equal(fixture.profit, 5480);
assert.ok(Math.abs(fixture.contribution / fixture.revenue * 100 - 83.0769230769) < 0.001);

const editedSale = { ...fixtureSale, quantity: 3, net_sales: 11800 };
const edited = summarizePeriod(dataset, [editedSale], [fixtureExpense], "2026-09-18", "2026-09-18");
assert.equal(edited.revenue, 11800);
assert.equal(edited.food, 1500);
assert.equal(edited.packaging, 300);
assert.equal(edited.contribution, 9880);
assert.equal(edited.profit, 8880);

const incompleteDataset = { ...dataset, recipes: [] };
const incomplete = summarizePeriod(incompleteDataset, [{
  sale_id: "TEST-2", date: "2026-09-18", menu_id: "M01", channel: "매장",
  quantity: 1, unit_price: 4000, discount_amount: 0, payment_fee: 0,
  unit_food_cost_snapshot: null, unit_packaging_cost_snapshot: null
}], [], "2026-09-18", "2026-09-18");
assert.equal(incomplete.costComplete, false);
assert.equal(incomplete.contribution, null, "missing costs are not treated as zero");

const inventoryFixture = {
  materials: [{ material_id: "I", name: "원두", unit: "g" }],
  menus: [{ menu_id: "M", recipe_version: "R1" }],
  recipes: [{ menu_id: "M", recipe_version: "R1", material_id: "I", quantity: 100, unit: "g" }],
  price_history: [],
  opening_inventory: [{ material_id: "I", date: "2026-07-01", quantity: 1000, unit: "g" }]
};
const fixtureEvents = [
  { event_id: "E1", date: "2026-07-02", material_id: "I", event_type: "입고", quantity: 500, unit: "g" },
  { event_id: "E2", date: "2026-07-03", material_id: "I", event_type: "폐기", quantity: -30, unit: "g" },
  { event_id: "E3", date: "2026-07-04", material_id: "I", event_type: "실사조정", quantity: -10, counted_quantity: 1260, unit: "g" }
];
const fixtureInventorySales = [{
  sale_id: "S1", date: "2026-07-03", menu_id: "M", recipe_version: "R1", channel: "매장", quantity: 2
}];
const preCount = inventoryBalances(inventoryFixture, fixtureInventorySales, fixtureEvents, "2026-07-03").get("I");
const postCount = inventoryBalances(inventoryFixture, fixtureInventorySales, fixtureEvents, "2026-07-04").get("I");
assert.equal(preCount, 1270);
assert.equal(postCount, 1260);

const emptyPeriod = summarizePeriod(dataset, [], [], "2026-09-19", "2026-09-19");
assert.equal(emptyPeriod.hasSales, false, "no record remains distinct from a recorded zero sale");

const dailySample = summarizePeriod(dataset, dataset.sales, dataset.expenses, "2026-09-18", "2026-09-18");
const monthSample = summarizePeriod(dataset, dataset.sales, dataset.expenses, "2026-09-01", "2026-09-18");
console.log("SAMPLE 2026-09-18: " + JSON.stringify({
  salesRows: dailySample.sales.length, quantity: dailySample.quantity,
  revenue: dailySample.revenue, directCost: dailySample.food + dailySample.packaging,
  fees: dailySample.fees, expenseRows: dailySample.expenses.length,
  expenses: dailySample.expenseTotal, profit: dailySample.profit
}));
console.log("SAMPLE 2026-09 month through 2026-09-18: " + JSON.stringify({
  salesRows: monthSample.sales.length, quantity: monthSample.quantity,
  revenue: monthSample.revenue, directCost: monthSample.food + monthSample.packaging,
  fees: monthSample.fees, expenseRows: monthSample.expenses.length,
  expenses: monthSample.expenseTotal, profit: monthSample.profit
}));

console.log("PASS: seed counts and references");
console.log("PASS: sale arithmetic, channel recipes, and current-date recipe pricing");
console.log("PASS: FRD contribution and profit examples, including edited sale recalculation");
console.log("PASS: missing costs remain incomplete");
console.log("PASS: inventory movement, recipe deduction, and stocktake reset");
console.log("PASS: empty period remains distinct from zero sales");
