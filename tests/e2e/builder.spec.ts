import { test, expect, type Page } from "@playwright/test";
import { createDemoState, type AppState } from "../../src/lib/domain";

const saved = (page: Page) =>
  page.evaluate<AppState>(() =>
    JSON.parse(localStorage.getItem("forma.workspace.v1")!),
  );

test("home is a live business page and records open in a context-preserving inspector", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByLabel("Page title")).toHaveValue("Operations hub");
  await expect(
    page.getByRole("region", { name: "Linked Inventory database" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Linked Sales orders database" }),
  ).toBeAttached();
  const inventory = page.getByRole("region", {
    name: "Linked Inventory database",
  });
  await inventory
    .getByRole("button", { name: /Arc Table Lamp FRM-LT-001/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Arc Table Lamp" }),
  ).toBeVisible();
  await expect(inventory).toBeVisible();
  await page.getByLabel("Sale price").fill("199.95");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    inventory.getByRole("row", { name: /Arc Table Lamp/ }),
  ).toContainText("$199.95");
  await page.reload();
  await expect(
    inventory.getByRole("row", { name: /Arc Table Lamp/ }),
  ).toContainText("$199.95");
  expect(errors).toEqual([]);
});

test("pages support slash commands, connected databases, headings, checklists, and durable saves", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".builder-page-tabs")
    .getByRole("button", { name: "New page", exact: true })
    .click();
  await page.getByLabel("Page title").fill("My business HQ");
  await page
    .getByRole("textbox", { name: "Block 1 text", exact: true })
    .fill("/inventory");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Linked Inventory database" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "To-do", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Block 2 todo", exact: true })
    .fill("Review stock");
  await page
    .getByRole("checkbox", { name: "Review stock", exact: true })
    .check();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Block 3 text", exact: true })
    .fill("/heading");
  await page.keyboard.press("Enter");
  await page
    .getByRole("textbox", { name: "Block 3 heading", exact: true })
    .fill("Weekly priorities");
  // Navigation immediately after typing must flush the pending autosave.
  await page
    .locator("aside")
    .getByRole("link", { name: "Weekly planning", exact: true })
    .click();
  await page
    .locator("aside")
    .getByRole("link", { name: "My business HQ", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Block 3 heading", exact: true }),
  ).toHaveValue("Weekly priorities");
  await page.reload();
  await page
    .locator("aside")
    .getByRole("link", { name: "My business HQ", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Review stock", exact: true }),
  ).toBeChecked();
  const doc = (await saved(page)).documents.find(
    (d) => d.title === "My business HQ",
  )!;
  expect(doc.blocks!.map((b) => b.type)).toEqual([
    "inventory",
    "todo",
    "heading",
  ]);
  expect(doc.content).toContain("## Weekly priorities");
});

test("linked database filters and layouts persist within their page", async ({
  page,
}) => {
  await page.goto("/");
  const inventory = page.getByRole("region", {
    name: "Linked Inventory database",
  });
  await inventory.getByRole("button", { name: /Needs attention/ }).click();
  await expect(inventory.locator("tbody tr")).toHaveCount(3);
  await inventory.getByRole("button", { name: "Inventory board view" }).click();
  await expect(inventory.locator(".linked-board")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await saved(page))?.documents[0].blocks?.find(
          (b) => b.type === "inventory",
        )?.config?.layout,
    )
    .toBe("board");
  await page.reload();
  await expect(inventory.locator(".linked-board")).toBeVisible();
  await expect(inventory).toContainText("3 records");
});

test("inventory supports durable saved views, column controls, and row density", async ({
  page,
}) => {
  await page.goto("/#inventory?stock=attention");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await page.getByRole("checkbox", { name: "Location", exact: true }).uncheck();
  await page.getByRole("button", { name: "Compact", exact: true }).click();
  await page.getByLabel("Sort products").selectOption("stock-asc");
  await page.getByRole("button", { name: "Save current view" }).click();
  await page.getByLabel("View name").fill("Restock priority");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save view", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Restock priority", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.locator(".compact-table")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Location", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("tbody tr").first()).toContainText(
    "Quiet Wall Clock",
  );
});

test("bulk stock changes are applied together and can feed a multi-product restock", async ({
  page,
}) => {
  await page.goto("/#inventory");
  await page
    .getByRole("checkbox", { name: "Select Arc Table Lamp", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select Forma Lounge Chair", exact: true })
    .check();
  await page.getByRole("button", { name: "Adjust stock", exact: true }).click();
  await page.getByLabel("New stock for Arc Table Lamp").fill("47");
  await page.getByLabel("New stock for Forma Lounge Chair").fill("7");
  await page
    .getByLabel("Reason for adjustment")
    .fill("Physical inventory count");
  await page.getByRole("button", { name: "Apply adjustment" }).click();
  const state = await saved(page);
  expect(state.products[0].stock).toBe(47);
  expect(state.products[1].stock).toBe(7);
  expect(state.activities[0].detail).toBe("Physical inventory count");
  await page.getByRole("button", { name: "Restock", exact: true }).click();
  await expect(page.getByLabel("Product 1", { exact: true })).toHaveValue("p1");
  await expect(page.getByLabel("Product 2", { exact: true })).toHaveValue("p2");
});

test("legacy browser records and page text survive the new builder", async ({
  page,
}) => {
  const legacy = createDemoState();
  delete legacy.documents[0].blocks;
  legacy.documents[0].content =
    "Our custom operating procedure.\n\nIMPORTANT\n☑ Already complete\n☐ Keep this task";
  legacy.products[0].stock = 77;
  await page.addInitScript((state) => {
    if (!localStorage.getItem("forma.workspace.v1"))
      localStorage.setItem("forma.workspace.v1", JSON.stringify(state));
  }, legacy);
  await page.goto("/");
  await expect(
    page
      .getByRole("textbox", { name: /text/ })
      .filter({ visible: true })
      .first(),
  ).toHaveValue("Our custom operating procedure.");
  await expect(
    page.getByRole("checkbox", { name: "Already complete", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Keep this task", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("region", { name: "Linked Inventory database" }),
  ).toBeVisible();
  expect((await saved(page)).products[0].stock).toBe(77);
});

test("mobile builder has one page scroll and auto-sized text blocks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Page title")).toHaveValue("Operations hub");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".block-input")
      .evaluateAll((elements) =>
        elements.every(
          (element) => element.scrollHeight <= element.clientHeight + 2,
        ),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .locator("aside")
    .getByRole("link", { name: "Inventory", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inventory", exact: true }),
  ).toBeVisible();
});
