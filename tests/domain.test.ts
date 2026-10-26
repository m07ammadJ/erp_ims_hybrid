import assert from "node:assert/strict";
import { test } from "node:test";
import {
  available,
  createDemoState,
  csv,
  money,
  reserved,
  total,
  transition,
} from "../src/lib/domain";

test("processing orders reserve stock without reducing physical stock", () => {
  const state = createDemoState();
  const next = transition(state, {
    type: "create-order",
    customerId: "c1",
    items: [{ productId: "p1", quantity: 3, price: 185 }],
  });
  assert.equal(next.products[0].stock, 48);
  assert.equal(available(next, "p1"), available(state, "p1") - 3);
  assert.equal(reserved(next, "p1"), 4);
  assert.equal(state.orders.length, 36);
});
test("multiple open orders cannot oversell the same stock", () => {
  const state = createDemoState();
  const next = transition(state, {
    type: "create-order",
    customerId: "c1",
    items: [{ productId: "p1", quantity: available(state, "p1"), price: 185 }],
  });
  assert.throws(
    () =>
      transition(next, {
        type: "create-order",
        customerId: "c1",
        items: [{ productId: "p1", quantity: 1, price: 185 }],
      }),
    /Not enough available stock/,
  );
});
test("shipping reduces stock, releases reservation, and cannot run twice", () => {
  const state = createDemoState();
  const next = transition(state, { type: "ship-order", id: "o1" });
  assert.equal(next.products[0].stock, 47);
  assert.equal(reserved(next, "p1"), 0);
  assert.equal(available(next, "p1"), available(state, "p1"));
  assert.equal(next.orders[0].status, "Shipped");
  assert.throws(
    () => transition(next, { type: "ship-order", id: "o1" }),
    /Only processing/,
  );
});
test("cancellation releases reservations without changing physical stock", () => {
  const state = createDemoState();
  const next = transition(state, { type: "cancel-order", id: "o1" });
  assert.equal(next.products[0].stock, 48);
  assert.equal(available(next, "p1"), available(state, "p1") + 1);
  assert.throws(() => transition(next, { type: "ship-order", id: "o1" }));
});
test("delivery requires a shipped order", () => {
  const state = createDemoState();
  assert.throws(() => transition(state, { type: "deliver-order", id: "o1" }));
  const shipped = transition(state, { type: "ship-order", id: "o1" });
  const delivered = transition(shipped, { type: "deliver-order", id: "o1" });
  assert.equal(delivered.orders[0].status, "Delivered");
  assert.equal(delivered.products[0].stock, 47);
});
test("payment is idempotently guarded and paid orders cannot be cancelled", () => {
  const state = transition(createDemoState(), { type: "pay-order", id: "o1" });
  assert.equal(state.orders[0].paid, true);
  assert.throws(() => transition(state, { type: "pay-order", id: "o1" }));
  assert.throws(() => transition(state, { type: "cancel-order", id: "o1" }));
});
test("receiving a multi-product shipment increments every stock exactly once", () => {
  const state = createDemoState();
  const next = transition(state, { type: "receive-purchase", id: "po1" });
  assert.equal(next.products.find((p) => p.id === "m-clay")!.stock, 170.5);
  assert.equal(next.products.find((p) => p.id === "m-glaze")!.stock, 13.25);
  assert.equal(next.purchases[0].status, "Received");
  assert.throws(() =>
    transition(next, { type: "receive-purchase", id: "po1" }),
  );
});
test("creating a purchase leaves inventory unchanged until receipt", () => {
  const state = createDemoState();
  const next = transition(state, {
    type: "create-purchase",
    supplier: "Local Studio",
    expectedAt: "2026-11-02",
    items: [{ productId: "p7", quantity: 20, price: 32 }],
  });
  assert.equal(next.products.find((p) => p.id === "p7")!.stock, 0);
  assert.equal(next.purchases[0].number, "PO-0087");
  assert.equal(next.purchases[0].status, "Ordered");
});
test("invalid and duplicate transaction lines are rejected atomically", () => {
  for (const items of [
    [],
    [{ productId: "p1", quantity: -1, price: 1 }],
    [{ productId: "p1", quantity: 0.5, price: 1 }],
    [{ productId: "unknown", quantity: 1, price: 1 }],
    [{ productId: "p1", quantity: 1, price: NaN }],
    [{ productId: "p1", quantity: 1, price: -2 }],
    [
      { productId: "p1", quantity: 1, price: 1 },
      { productId: "p1", quantity: 2, price: 1 },
    ],
  ]) {
    const state = createDemoState();
    assert.throws(() =>
      transition(state, { type: "create-order", customerId: "c1", items }),
    );
    assert.equal(state.orders.length, 36);
    assert.equal(state.products[0].stock, 48);
  }
});
test("stock cannot be edited below reserved quantities", () => {
  const state = createDemoState();
  assert.throws(
    () =>
      transition(state, {
        type: "save-product",
        product: { ...state.products[0], stock: 0 },
      }),
    /reserved/,
  );
});
test("SKUs are unique, normalized, and do not collide across casing", () => {
  const state = createDemoState();
  assert.throws(
    () =>
      transition(state, {
        type: "save-product",
        product: { ...state.products[0], id: "new", sku: "frm-lt-001" },
      }),
    /already exists/,
  );
  const next = transition(state, {
    type: "save-product",
    product: { ...state.products[0], id: "new", sku: "  frm-lt-009  " },
  });
  assert.equal(next.products.at(-1)!.sku, "FRM-LT-009");
});
test("customer validation rejects invalid and duplicate email addresses", () => {
  const state = createDemoState();
  assert.throws(
    () =>
      transition(state, {
        type: "save-customer",
        customer: { ...state.customers[0], id: "new" },
      }),
    /already exists/,
  );
  assert.throws(
    () =>
      transition(state, {
        type: "save-customer",
        customer: { ...state.customers[0], email: "not-email" },
      }),
    /valid email/,
  );
});
test("order numbering stays unique as the workspace grows", () => {
  let state = createDemoState();
  for (let i = 0; i < 3; i++)
    state = transition(state, {
      type: "create-order",
      customerId: "c1",
      items: [{ productId: "p1", quantity: 1, price: 1 }],
    });
  assert.deepEqual(
    state.orders.slice(0, 3).map((o) => o.number),
    ["SO-1051", "SO-1050", "SO-1049"],
  );
});
test("monetary totals round floating-point results and display cents", () => {
  assert.equal(
    total({ items: [{ productId: "p1", quantity: 3, price: 0.1 }] }),
    0.3,
  );
  assert.equal(money(12.5), "$12.50");
  assert.equal(money(120), "$120");
});
test("CSV escapes quotes, commas, newlines, and spreadsheet formula injection", () => {
  assert.equal(
    csv([['Hello, "world"', "=1+1", "@cmd", "two\nlines", 3]]),
    '"Hello, ""world""","\'=1+1","\'@cmd","two\nlines","3"',
  );
});
test("documents save independently without adding activity noise", () => {
  const state = createDemoState();
  const next = transition(state, {
    type: "save-document",
    document: { ...state.documents[0], content: "A fresh idea" },
  });
  assert.equal(next.documents[0].content, "A fresh idea");
  assert.equal(next.activities.length, state.activities.length);
});

test("bulk stock adjustments protect reservations and roll back the entire operation on failure", () => {
  const state = createDemoState();
  assert.throws(
    () =>
      transition(state, {
        type: "adjust-stock",
        changes: [
          { productId: "p1", stock: 47 },
          { productId: "p2", stock: 0 },
        ],
        reason: "Count",
      }),
    /reserved/,
  );
  assert.equal(state.products[0].stock, 48);
  assert.equal(state.products[1].stock, 8);
  const next = transition(state, {
    type: "adjust-stock",
    changes: [
      { productId: "p1", stock: 47 },
      { productId: "p2", stock: 7 },
    ],
    reason: "Physical count",
  });
  assert.equal(next.products[0].stock, 47);
  assert.equal(next.products[1].stock, 7);
  assert.equal(next.activities[0].detail, "Physical count");
});

test("bulk stock adjustment rejects duplicates, invalid counts, and missing reasons", () => {
  const state = createDemoState();
  assert.throws(() =>
    transition(state, {
      type: "adjust-stock",
      changes: [
        { productId: "p1", stock: 50 },
        { productId: "p1", stock: 51 },
      ],
      reason: "Count",
    }),
  );
  assert.throws(() =>
    transition(state, {
      type: "adjust-stock",
      changes: [{ productId: "p1", stock: 0.5 }],
      reason: "Count",
    }),
  );
  assert.throws(() =>
    transition(state, {
      type: "adjust-stock",
      changes: [{ productId: "p1", stock: 50 }],
      reason: "",
    }),
  );
});

test("page blocks persist their database view configuration", () => {
  const state = createDemoState();
  const next = transition(state, {
    type: "save-document",
    document: {
      ...state.documents[0],
      blocks: [
        {
          id: "block",
          type: "inventory",
          text: "Low stock",
          config: { layout: "board", filter: "attention" },
        },
      ],
    },
  });
  assert.equal(next.documents[0].blocks![0].config!.layout, "board");
  assert.equal(next.products[0].stock, 48);
  assert.throws(() =>
    transition(state, {
      type: "save-document",
      document: {
        ...state.documents[0],
        blocks: [
          { id: "same", type: "text", text: "A" },
          { id: "same", type: "text", text: "B" },
        ],
      },
    }),
  );
});
