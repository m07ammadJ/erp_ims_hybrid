import { test, expect, type Page } from "@playwright/test";
import { createDemoState, type AppState } from "../../src/lib/domain";

const saved = (page: Page) =>
  page.evaluate<AppState>(() =>
    JSON.parse(localStorage.getItem("forma.workspace.v1")!),
  );
const nav = (page: Page, name: string) =>
  page.locator("aside").getByRole("link", { name, exact: true }).click();

test("procure raw inputs, produce finished stock, and sell it to an individual customer", async ({
  page,
}) => {
  await page.goto("/#suppliers");
  await page.getByRole("button", { name: "Add supplier", exact: true }).click();
  await page.getByLabel("Supplier name").fill("Local Material Supply");
  await page
    .getByRole("button", { name: "Save supplier", exact: true })
    .click();
  await nav(page, "Inventory");
  await page.getByRole("button", { name: /Raw materials/ }).click();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(page.getByLabel("Item type")).toHaveValue("material");
  await page.getByLabel("Item name").fill("Test input compound");
  await page.getByLabel("SKU", { exact: true }).fill("RAW-TEST-001");
  await page.getByLabel("Base unit").selectOption("kg");
  await page.getByLabel("Unit cost").fill("4");
  await page.getByLabel("Stock on hand").fill("2.5");
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  let state = await saved(page);
  const material = state.products.find((p) => p.sku === "RAW-TEST-001")!;
  expect(material).toMatchObject({
    itemType: "material",
    unit: "kg",
    stock: 2.5,
    price: 0,
  });
  await page.getByRole("button", { name: /Finished goods/ }).click();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Item name").fill("Test manufactured item");
  await page.getByLabel("SKU", { exact: true }).fill("FG-TEST-001");
  await page.getByLabel("Sale price", { exact: false }).fill("25");
  await page.getByLabel("Unit cost").fill("0");
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  const output = (await saved(page)).products.find(
    (p) => p.sku === "FG-TEST-001",
  )!;
  await nav(page, "Production");
  await page.getByRole("button", { name: /Bills of materials/ }).click();
  await page
    .getByRole("button", { name: "New bill of materials", exact: true })
    .click();
  await page.getByLabel("Recipe name").fill("Test manufacturing recipe");
  await page.getByLabel("Output product").selectOption(output.id);
  await page
    .getByLabel("Material 1", { exact: true })
    .selectOption(material.id);
  await page.getByLabel("Material quantity 1", { exact: true }).fill("0.4");
  await page.getByLabel("Labor per recipe").fill("3");
  await page.getByLabel("Overhead per recipe").fill("1");
  await page.getByRole("button", { name: "Save bill of materials" }).click();
  const recipe = (await saved(page)).manufacturing.boms.find(
    (b) => b.name === "Test manufacturing recipe",
  )!;
  await page
    .getByRole("button", {
      name: "Plan Test manufacturing recipe",
      exact: true,
    })
    .click();
  await page.getByLabel("Quantity to make").fill("10");
  await expect(
    page.getByRole("button", { name: "Reserve & plan production" }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText("Shortage");
  await page.getByRole("button", { name: "Purchase inputs" }).click();
  await page
    .getByLabel("Supplier", { exact: true })
    .fill("Local Material Supply");
  await page.getByLabel("Quantity 1", { exact: true }).fill("2.5");
  await page
    .getByRole("button", { name: "Create purchase", exact: true })
    .click();
  await nav(page, "Purchasing");
  await page.getByRole("button", { name: "PO-0087", exact: true }).click();
  await page.getByRole("button", { name: "Receive shipment" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  expect(
    (await saved(page)).products.find((p) => p.id === material.id)!.stock,
  ).toBe(5);
  await nav(page, "Production");
  await page
    .getByRole("button", { name: "New production order", exact: true })
    .click();
  await page
    .getByLabel("Bill of materials", { exact: true })
    .selectOption(recipe.id);
  await page.getByLabel("Quantity to make").fill("10");
  await page.getByRole("button", { name: "Reserve & plan production" }).click();
  state = await saved(page);
  expect(state.products.find((p) => p.id === output.id)!.stock).toBe(0);
  expect(state.manufacturing.jobs[0].components[0].quantity).toBe(4);
  await page.getByRole("button", { name: "MO-1001", exact: true }).click();
  await page
    .getByRole("button", { name: "Start production", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete production", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Completed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Complete production", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
  state = await saved(page);
  expect(state.products.find((p) => p.id === material.id)!.stock).toBe(1);
  expect(state.products.find((p) => p.id === output.id)).toMatchObject({
    stock: 10,
    cost: 5.6,
  });
  expect(state.manufacturing.jobs[0].unitCost).toBe(5.6);
  await nav(page, "Customers");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await page.getByLabel("Customer name").fill("A walk-in customer");
  await page.getByLabel("Customer type").selectOption("individual");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add customer", exact: true })
    .click();
  const customer = (await saved(page)).customers.find(
    (c) => c.name === "A walk-in customer",
  )!;
  expect(customer.company).toBe("");
  expect(customer.email).toBe("");
  await nav(page, "Sales orders");
  await page.getByRole("button", { name: "New order", exact: true }).click();
  await page.getByLabel("Customer", { exact: true }).selectOption(customer.id);
  await page.getByLabel("Product 1", { exact: true }).selectOption(output.id);
  await page.getByLabel("Quantity 1", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await page.getByRole("button", { name: "SO-1049", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("A walk-in customer");
  await page.getByRole("button", { name: "Ship order", exact: true }).click();
  state = await saved(page);
  expect(state.products.find((p) => p.id === output.id)!.stock).toBe(7);
  expect(
    state.manufacturing.movements.some(
      (m) =>
        m.kind === "Production input" &&
        m.productId === material.id &&
        m.quantity === -4,
    ),
  ).toBe(true);
  expect(
    state.manufacturing.movements.some(
      (m) =>
        m.kind === "Sale" && m.productId === output.id && m.quantity === -3,
    ),
  ).toBe(true);
  await page.reload();
  expect(
    (await saved(page)).products.find((p) => p.id === output.id)!.stock,
  ).toBe(7);
});

test("production cancellation releases inputs and the movement view retains a real stock trail", async ({
  page,
}) => {
  await page.goto("/#manufacturing");
  await page
    .getByRole("button", { name: "New production order", exact: true })
    .click();
  await page.getByLabel("Quantity to make").fill("5");
  await page.getByRole("button", { name: "Reserve & plan production" }).click();
  await page.getByRole("button", { name: "MO-1001", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel production", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Cancelled", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  const state = await saved(page);
  expect(state.products.find((p) => p.id === "m-clay")!.stock).toBe(120.5);
  expect(state.manufacturing.jobs[0].status).toBe("Cancelled");
  await page.getByRole("button", { name: /Stock movements/ }).click();
  await expect(page.getByRole("table")).toContainText("Demo opening stock");
});

test("production can be embedded in a page and its board view survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const production = page.getByRole("region", {
    name: "Linked Production database",
  });
  await expect(production).toBeAttached();
  await production.getByRole("button", { name: "Board view" }).click();
  await expect
    .poll(
      async () =>
        (await saved(page))?.documents[0].blocks?.find(
          (b) => b.type === "production",
        )?.config?.layout,
    )
    .toBe("board");
  await page.reload();
  await expect(
    production.getByRole("button", { name: "Table view" }),
  ).toBeVisible();
});

test("older business data upgrades without resetting records or adding demo materials", async ({
  page,
}) => {
  const legacy = JSON.parse(JSON.stringify(createDemoState()));
  delete legacy.manufacturing;
  legacy.products = legacy.products.filter(
    (p: { itemType?: string }) => p.itemType !== "material",
  );
  legacy.products.forEach((p: { itemType?: string; unit?: string }) => {
    delete p.itemType;
    delete p.unit;
  });
  legacy.products[0].stock = 77;
  legacy.purchases = [];
  legacy.documents[0].blocks = legacy.documents[0].blocks.filter(
    (b: { type: string }) => b.type !== "production",
  );
  await page.addInitScript((state) => {
    if (!localStorage.getItem("forma.workspace.v1"))
      localStorage.setItem("forma.workspace.v1", JSON.stringify(state));
  }, legacy);
  await page.goto("/#inventory");
  await expect(page.getByRole("row", { name: /Arc Table Lamp/ })).toContainText(
    "77",
  );
  await nav(page, "Production");
  await page.getByRole("button", { name: /Bills of materials/ }).click();
  await expect(
    page.getByText("How do you make your products?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New bill of materials", exact: true })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await nav(page, "Inventory");
  await page.getByRole("button", { name: /Raw materials/ }).click();
  await expect(
    page.getByText("No products match this view", { exact: true }),
  ).toBeVisible();
});

test("manufacturing controls fit on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#manufacturing");
  await expect(
    page.getByRole("heading", { name: "Production", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "New production order", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeInViewport();
  expect((await page.getByRole("dialog").boundingBox())!.width).toBeLessThan(
    390,
  );
});
