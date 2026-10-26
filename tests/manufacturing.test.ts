import assert from "node:assert/strict";
import { test } from "node:test";
import {
  available,
  createDemoState,
  reserved,
  transition,
  customerLabel,
  type AppState,
} from "../src/lib/domain";
import {
  roundQuantity,
  upgradeManufacturing,
  validManufacturing,
  unitOf,
} from "../src/lib/manufacturing";

const item = (state: AppState, id: string) =>
  state.products.find((p) => p.id === id)!;
const plan = (state: AppState, quantity = 10) =>
  transition(state, {
    type: "plan-production",
    bomId: "bom-vase",
    quantity,
    dueAt: "2026-10-30",
  });
function complete(state: AppState) {
  const id = state.manufacturing.jobs[0].id;
  return transition(transition(state, { type: "start-production", id }), {
    type: "complete-production",
    id,
  });
}

test("planning reserves fractional input units without creating finished stock", () => {
  const initial = createDemoState();
  const next = plan(initial);
  assert.equal(item(next, "m-clay").stock, 120.5);
  assert.equal(reserved(next, "m-clay"), 12.5);
  assert.equal(available(next, "m-glaze"), 7.45);
  assert.equal(item(next, "p3").stock, 126);
  assert.equal(next.manufacturing.jobs[0].status, "Planned");
});
test("competing jobs cannot reserve the same materials twice", () => {
  const first = plan(createDemoState(), 70);
  assert.equal(available(first, "m-clay"), 33);
  assert.throws(() => plan(first, 30), /Material shortage/);
  assert.equal(first.manufacturing.jobs.length, 1);
});
test("completion consumes materials, creates finished stock, and captures actual batch cost once", () => {
  const next = complete(plan(createDemoState()));
  assert.equal(item(next, "m-clay").stock, 108);
  assert.equal(item(next, "m-glaze").stock, 7.45);
  assert.equal(item(next, "m-box").stock, 190);
  assert.equal(item(next, "p3").stock, 136);
  const job = next.manufacturing.jobs[0];
  assert.equal(job.materialCost, 61.4);
  assert.equal(job.unitCost, 22.14);
  assert.equal(item(next, "p3").cost, roundQuantity((126 * 24 + 221.4) / 136));
  assert.equal(reserved(next, "m-clay"), 0);
  assert.equal(
    next.manufacturing.movements.filter((m) => m.reference === job.number)
      .length,
    4,
  );
  assert.throws(
    () => transition(next, { type: "complete-production", id: job.id }),
    /only be completed once/,
  );
  assert(validManufacturing(next.manufacturing, next.products));
});
test("finished goods cannot be sold before production completes", () => {
  const planned = plan(createDemoState());
  assert.throws(
    () =>
      transition(planned, {
        type: "create-order",
        customerId: "c1",
        items: [{ productId: "p3", quantity: 130, price: 68 }],
      }),
    /Not enough available stock/,
  );
  const made = complete(planned);
  const sold = transition(made, {
    type: "create-order",
    customerId: "c1",
    items: [{ productId: "p3", quantity: 130, price: 68 }],
  });
  assert.equal(available(sold, "p3"), 5);
});
test("raw materials are not offered as finished goods on sales orders", () => {
  assert.throws(
    () =>
      transition(createDemoState(), {
        type: "create-order",
        customerId: "c1",
        items: [{ productId: "m-clay", quantity: 1.25, price: 4 }],
      }),
    /Sales orders use finished goods/,
  );
});
test("production cancellation releases inputs without consuming stock", () => {
  let state = plan(createDemoState());
  const id = state.manufacturing.jobs[0].id;
  state = transition(state, { type: "start-production", id });
  state = transition(state, { type: "cancel-production", id });
  assert.equal(item(state, "m-clay").stock, 120.5);
  assert.equal(reserved(state, "m-clay"), 0);
  assert.equal(item(state, "p3").stock, 126);
  assert.throws(() => transition(state, { type: "start-production", id }));
});
test("starting is required and production reservations protect material stock edits", () => {
  const state = plan(createDemoState());
  assert.throws(
    () =>
      transition(state, {
        type: "complete-production",
        id: state.manufacturing.jobs[0].id,
      }),
    /Start this production/,
  );
  assert.throws(
    () =>
      transition(state, {
        type: "adjust-stock",
        changes: [{ productId: "m-clay", stock: 10 }],
        reason: "Count",
      }),
    /reserved/,
  );
});
test("recipe revisions do not rewrite the input quantities or conversion costs of planned jobs", () => {
  let state = plan(createDemoState(), 2);
  const recipe = state.manufacturing.boms[0];
  state = transition(state, {
    type: "save-bom",
    bom: {
      ...recipe,
      components: recipe.components.map((c) =>
        c.productId === "m-clay" ? { ...c, quantity: 2 } : c,
      ),
      laborCost: 50,
    },
  });
  assert.equal(state.manufacturing.boms[0].revision, 2);
  assert.equal(state.manufacturing.jobs[0].revision, 1);
  assert.equal(state.manufacturing.jobs[0].components[0].quantity, 2.5);
  assert.equal(state.manufacturing.jobs[0].laborCost, 24);
  state = complete(state);
  assert.equal(item(state, "m-clay").stock, 118);
});
test("recipes reject material outputs, self-consumption, duplicate inputs, and circular assemblies", () => {
  let state = createDemoState();
  const base = {
    id: "bom-new",
    name: "New recipe",
    productId: "p1",
    outputQuantity: 1,
    components: [{ productId: "m-clay", quantity: 1 }],
    laborCost: 0,
    overheadCost: 0,
  };
  assert.throws(() =>
    transition(state, {
      type: "save-bom",
      bom: { ...base, productId: "m-clay" },
    }),
  );
  assert.throws(() =>
    transition(state, {
      type: "save-bom",
      bom: { ...base, components: [{ productId: "p1", quantity: 1 }] },
    }),
  );
  assert.throws(() =>
    transition(state, {
      type: "save-bom",
      bom: {
        ...base,
        components: [
          { productId: "m-clay", quantity: 1 },
          { productId: "m-clay", quantity: 1 },
        ],
      },
    }),
  );
  state = transition(state, {
    type: "save-bom",
    bom: { ...base, components: [{ productId: "p2", quantity: 1 }] },
  });
  assert.throws(
    () =>
      transition(state, {
        type: "save-bom",
        bom: {
          ...base,
          id: "bom-cycle",
          productId: "p2",
          components: [{ productId: "p1", quantity: 1 }],
        },
      }),
    /circular/,
  );
});
test("batch sizes must produce whole pieces of piece-based inputs", () => {
  let state = createDemoState();
  state = transition(state, {
    type: "save-bom",
    bom: {
      ...state.manufacturing.boms[0],
      outputQuantity: 2,
      components: [{ productId: "m-box", quantity: 1 }],
    },
  });
  assert.throws(() => plan(state, 1), /fractional piece/);
  assert.equal(plan(state, 2).manufacturing.jobs[0].components[0].quantity, 1);
});
test("fractional material purchases receive in base units and update weighted average cost", () => {
  let state = createDemoState();
  state = transition(state, {
    type: "create-purchase",
    supplier: "Atlas Materials",
    expectedAt: "2026-11-01",
    items: [{ productId: "m-clay", quantity: 10.25, price: 3.4 }],
  });
  const purchase = state.purchases[0];
  state = transition(state, { type: "receive-purchase", id: purchase.id });
  assert.equal(item(state, "m-clay").stock, 130.75);
  assert.equal(
    item(state, "m-clay").cost,
    roundQuantity((120.5 * 2.8 + 10.25 * 3.4) / 130.75),
  );
  assert.equal(state.manufacturing.suppliers.length, 3);
  assert.equal(purchase.supplierId, "s1");
  assert.equal(state.manufacturing.movements[0].quantity, 10.25);
});
test("transaction history protects a SKU's base unit and material/finished classification", () => {
  const state = createDemoState();
  assert.throws(
    () =>
      transition(state, {
        type: "save-product",
        product: { ...item(state, "m-clay"), unit: "g" },
      }),
    /must keep their type and base unit/,
  );
  assert.throws(
    () =>
      transition(state, {
        type: "save-product",
        product: { ...item(state, "p3"), itemType: "material" },
      }),
    /must keep their type and base unit/,
  );
});
test("individuals and arbitrary customer entities do not need a company, email, or phone", () => {
  let state = createDemoState();
  state = transition(state, {
    type: "save-customer",
    customer: {
      id: "walk-in",
      name: "Walk-in customer",
      company: "",
      email: "",
      color: "#eee",
      entityType: "individual",
    },
  });
  state = transition(state, {
    type: "save-customer",
    customer: {
      id: "other",
      name: "Community project",
      company: "",
      email: "",
      color: "#eee",
      entityType: "other",
    },
  });
  assert.equal(
    customerLabel(state.customers.find((c) => c.id === "walk-in")),
    "Walk-in customer",
  );
  const ordered = transition(state, {
    type: "create-order",
    customerId: "other",
    items: [{ productId: "p1", quantity: 1, price: 185 }],
  });
  assert.equal(ordered.orders[0].customerId, "other");
});
test("legacy workspace upgrades retain records and do not inject example manufacturing data", () => {
  const legacy = JSON.parse(JSON.stringify(createDemoState()));
  delete legacy.manufacturing;
  const upgraded = upgradeManufacturing(legacy) as AppState;
  assert.deepEqual(upgraded.products, legacy.products);
  assert.deepEqual(upgraded.orders, legacy.orders);
  assert.equal(upgraded.manufacturing.boms.length, 0);
  assert.equal(upgraded.manufacturing.suppliers.length, 0);
  assert(validManufacturing(upgraded.manufacturing, upgraded.products));
  assert.equal(unitOf({ ...upgraded.products[0], unit: undefined }), "pcs");
});

test("measured finished products support fractional batch output and fractional sales", () => {
  let state = createDemoState();
  state = transition(state, {
    type: "save-product",
    product: {
      ...item(state, "p3"),
      id: "liquid-output",
      name: "Prepared compound",
      sku: "FG-LIQ-001",
      unit: "l",
      stock: 0,
      cost: 0,
      price: 25,
    },
  });
  state = transition(state, {
    type: "save-bom",
    bom: {
      id: "liquid-recipe",
      name: "Liquid batch",
      productId: "liquid-output",
      outputQuantity: 2.5,
      components: [{ productId: "m-glaze", quantity: 2.5 }],
      laborCost: 0,
      overheadCost: 0,
    },
  });
  state = transition(state, {
    type: "plan-production",
    bomId: "liquid-recipe",
    quantity: 1.25,
    dueAt: "2026-11-01",
  });
  state = complete(state);
  assert.equal(item(state, "m-glaze").stock, 7);
  assert.equal(item(state, "liquid-output").stock, 1.25);
  state = transition(state, {
    type: "create-order",
    customerId: "c1",
    items: [{ productId: "liquid-output", quantity: 1.2, price: 25 }],
  });
  assert.equal(available(state, "liquid-output"), 0.05);
});
