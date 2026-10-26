import { test, expect, type Page } from "@playwright/test";
import type { AppState } from "../../src/lib/domain";

const saved = (page: Page) =>
  page.evaluate<AppState>(() =>
    JSON.parse(localStorage.getItem("forma.workspace.v1")!),
  );
const nav = async (page: Page, name: string) =>
  page.locator("aside").getByRole("link", { name, exact: true }).click();

test.beforeEach(async ({ page }) => {
  await page.goto("/#overview");
});

test("dashboard renders without client errors and links to working views", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Orders to fulfill/ }),
  ).toContainText("04");
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Revenue over 7 days/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Inventory value/ }).click();
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("add and edit inventory, filter it, and persist after reload", async ({
  page,
}) => {
  await nav(page, "Inventory");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Item name").fill("Test Work Lamp");
  await page.getByLabel("SKU", { exact: true }).fill("TEST-009");
  await page.getByLabel("Sale price").fill("59.95");
  await page.getByLabel("Unit cost").fill("20.5");
  await page.getByLabel("Stock on hand").fill("25");
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("new addition");
  await page.getByPlaceholder("Search products or SKU…").fill("TEST-009");
  await page.getByRole("button", { name: /Test Work Lamp TEST-009/ }).click();
  await page.getByLabel("Stock on hand").fill("30");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Test Work Lamp TEST-009/ }),
  ).toBeVisible();
  const state = await saved(page);
  expect(state.products.find((p) => p.sku === "TEST-009")).toMatchObject({
    stock: 30,
    price: 59.95,
    cost: 20.5,
  });
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByLabel("Filter category").selectOption("Objects");
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await expect(page.locator(".product-grid")).toBeVisible();
});

test("duplicate SKU validation is visible inside the dialog", async ({
  page,
}) => {
  await nav(page, "Inventory");
  await page.getByRole("button", { name: /Arc Table Lamp FRM-LT-001/ }).click();
  await page.getByLabel("SKU", { exact: true }).fill("FRM-FN-002");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "SKU already exists",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("multi-line orders reserve inventory, ship once, and record payment", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New order", exact: true }).click();
  await page.getByLabel("Quantity 1", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Add line item" }).click();
  await page.getByLabel("Product 2", { exact: true }).selectOption("p3");
  await page.getByLabel("Quantity 2", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  let state = await saved(page);
  expect(state.products[0].stock).toBe(48);
  expect(state.orders[0].items).toHaveLength(2);
  await nav(page, "Sales orders");
  await page.getByRole("button", { name: "SO-1049", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("5 units reserved");
  await page.getByRole("button", { name: "Ship order", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Shipped", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ship order", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(
    page.getByRole("dialog").getByText("Paid", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark delivered" }).click();
  state = await saved(page);
  expect(state.products[0].stock).toBe(45);
  expect(state.products[2].stock).toBe(124);
  expect(state.orders[0]).toMatchObject({ status: "Delivered", paid: true });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  expect((await saved(page)).orders[0].status).toBe("Delivered");
});

test("purchase receipt updates all products once and survives reload", async ({
  page,
}) => {
  await nav(page, "Purchasing");
  await page.getByRole("button", { name: "PO-0086", exact: true }).click();
  await page.getByRole("button", { name: "Receive shipment" }).click();
  await expect(
    page.getByRole("dialog").getByText("Received", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Receive shipment" }),
  ).toHaveCount(0);
  await page.reload();
  const state = await saved(page);
  expect(state.products.find((p) => p.id === "m-clay")!.stock).toBe(170.5);
  expect(state.products.find((p) => p.id === "m-glaze")!.stock).toBe(13.25);
});

test("a low-stock restock creates a purchase and replenishes the chosen product", async ({
  page,
}) => {
  await nav(page, "Inventory");
  await page.getByLabel("Select Forma Lounge Chair", { exact: true }).check();
  await page.getByRole("button", { name: "Restock", exact: true }).click();
  await page
    .getByLabel("Supplier", { exact: true })
    .fill("Independent Workshop");
  await page.getByLabel("Quantity 1", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Create purchase", exact: true })
    .click();
  expect((await saved(page)).products.find((p) => p.id === "p2")!.stock).toBe(
    8,
  );
  await nav(page, "Purchasing");
  await page.getByRole("button", { name: "PO-0087", exact: true }).click();
  await page.getByRole("button", { name: "Receive shipment" }).click();
  expect((await saved(page)).products.find((p) => p.id === "p2")!.stock).toBe(
    20,
  );
});

test("overselling shows an error and cancelling releases the corrected order", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New order", exact: true }).click();
  await page.getByLabel("Quantity 1", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Not enough available stock",
  );
  await page.getByLabel("Quantity 1", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await nav(page, "Sales orders");
  await page.getByRole("button", { name: "SO-1049", exact: true }).click();
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Cancelled", { exact: true }),
  ).toBeVisible();
  const state = await saved(page);
  expect(state.products[0].stock).toBe(48);
  expect(state.orders[0].status).toBe("Cancelled");
});

test("customers can be created and used in new orders", async ({ page }) => {
  await nav(page, "Customers");
  await page.getByRole("button", { name: "Add customer" }).click();
  await page.getByLabel("Customer name").fill("Taylor Morgan");
  await page
    .getByLabel("Company / organization (optional)", { exact: true })
    .fill("Tomorrow Studio");
  await page.getByLabel("Email address").fill("taylor@example.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add customer" })
    .click();
  await page.getByPlaceholder("Find a person or company…").fill("Tomorrow");
  await expect(page.locator(".customer-card")).toHaveCount(1);
  await nav(page, "Sales orders");
  await page.getByRole("button", { name: "New order", exact: true }).click();
  const customer = (await saved(page)).customers.find(
    (c) => c.company === "Tomorrow Studio",
  )!;
  await page.getByLabel("Customer", { exact: true }).selectOption(customer.id);
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  expect((await saved(page)).orders[0].customerId).toBe(customer.id);
});

test("keyboard search finds products and CSV exports contain real data", async ({
  page,
}) => {
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search workspace" })
    .fill("Arc Table Lamp");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Arc Table Lamp" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await nav(page, "Inventory");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("forma-inventory.csv");
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk;
  expect(content).toContain("Arc Table Lamp");
  expect(content).toContain("Available");
});

test("mobile navigation, tables, and dialogs fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  for (const name of [
    "Inventory",
    "Sales orders",
    "Customers",
    "Purchasing",
    "Reports & insights",
  ]) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await nav(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await nav(page, "Inventory");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeInViewport();
  const rect = await page.getByRole("dialog").boundingBox();
  expect(rect!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/forma-mobile.png",
    fullPage: true,
  });
});

test("workspace settings and reset confirmation work", async ({ page }) => {
  await page
    .locator("aside")
    .getByRole("button", { name: "Workspace settings", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("My Studio");
  await page.getByLabel("Your display name").fill("Morgan Lee");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(
    page
      .locator("aside")
      .getByRole("button", { name: /My Studio Private workspace/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep my workspace" }).click();
  expect((await saved(page)).settings.name).toBe("My Studio");
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset demo data" })
    .click();
  expect((await saved(page)).settings.name).toBe("Forma Studio");
});
