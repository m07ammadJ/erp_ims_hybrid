import type { AppState, Product, Activity } from "./domain";

export type ItemType = "material" | "finished";
export const units = ["pcs", "kg", "g", "l", "ml", "m", "m²", "m³"] as const;
export type Unit = (typeof units)[number];
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
}
export interface Component {
  productId: string;
  quantity: number;
}
export interface BillOfMaterials {
  id: string;
  name: string;
  productId: string;
  outputQuantity: number;
  components: Component[];
  laborCost: number;
  overheadCost: number;
  revision: number;
}
export interface ProductionOrder {
  id: string;
  number: string;
  bomId: string;
  bomName: string;
  revision: number;
  productId: string;
  quantity: number;
  components: Component[];
  laborCost: number;
  overheadCost: number;
  status: "Planned" | "In progress" | "Completed" | "Cancelled";
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  materialCost?: number;
  unitCost?: number;
}
export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  kind:
    | "Opening"
    | "Purchase"
    | "Production input"
    | "Production output"
    | "Sale"
    | "Adjustment";
  reference: string;
  at: string;
  note: string;
}
export interface ManufacturingState {
  suppliers: Supplier[];
  boms: BillOfMaterials[];
  jobs: ProductionOrder[];
  movements: StockMovement[];
}
export type ManufacturingAction =
  | { type: "save-supplier"; supplier: Supplier }
  | { type: "save-bom"; bom: Omit<BillOfMaterials, "revision"> }
  | { type: "plan-production"; bomId: string; quantity: number; dueAt: string }
  | {
      type: "start-production" | "complete-production" | "cancel-production";
      id: string;
    };
export const emptyManufacturing = (): ManufacturingState => ({
  suppliers: [],
  boms: [],
  jobs: [],
  movements: [],
});
export function upgradeManufacturing(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1 &&
    !("manufacturing" in value)
  )
    return { ...value, manufacturing: emptyManufacturing() };
  return value;
}
export function validManufacturing(
  value: unknown,
  products: Product[],
): value is ManufacturingState {
  if (!value || typeof value !== "object") return false;
  const m = value as ManufacturingState;
  if (![m.suppliers, m.boms, m.jobs, m.movements].every(Array.isArray))
    return false;
  const unique = (list: { id: string }[]) =>
    list.every((i) => i && typeof i.id === "string") &&
    new Set(list.map((i) => i.id)).size === list.length;
  const components = (list: Component[]) =>
    Array.isArray(list) &&
    list.length > 0 &&
    new Set(list.map((i) => i.productId)).size === list.length &&
    list.every((c) => {
      const p = products.find((p) => p.id === c.productId);
      return p && validQuantity(c.quantity, p);
    });
  return (
    [m.suppliers, m.boms, m.jobs, m.movements].every(unique) &&
    m.suppliers.every((s) =>
      [s.id, s.name, s.contact, s.email, s.phone].every(
        (v) => typeof v === "string",
      ),
    ) &&
    m.boms.every((b) => {
      const p = products.find((p) => p.id === b.productId);
      return (
        p &&
        typeOf(p) === "finished" &&
        typeof b.name === "string" &&
        validQuantity(b.outputQuantity, p) &&
        components(b.components) &&
        cost(b.laborCost) &&
        cost(b.overheadCost) &&
        Number.isSafeInteger(b.revision) &&
        b.revision > 0
      );
    }) &&
    m.jobs.every((j) => {
      const p = products.find((p) => p.id === j.productId);
      return (
        p &&
        [j.number, j.bomId, j.bomName, j.createdAt, j.dueAt].every(
          (v) => typeof v === "string",
        ) &&
        ["Planned", "In progress", "Completed", "Cancelled"].includes(
          j.status,
        ) &&
        validQuantity(j.quantity, p) &&
        components(j.components) &&
        cost(j.laborCost) &&
        cost(j.overheadCost) &&
        (j.materialCost === undefined || cost(j.materialCost)) &&
        (j.unitCost === undefined || cost(j.unitCost))
      );
    }) &&
    m.movements.every(
      (mv) =>
        products.some((p) => p.id === mv.productId) &&
        [mv.at, mv.reference, mv.note].every((v) => typeof v === "string") &&
        [
          "Opening",
          "Purchase",
          "Production input",
          "Production output",
          "Sale",
          "Adjustment",
        ].includes(mv.kind) &&
        Number.isFinite(mv.quantity) &&
        Math.abs(mv.quantity) <= 1e9 &&
        cost(mv.unitCost),
    )
  );
}
export function demoManufacturing(): {
  materials: Product[];
  manufacturing: ManufacturingState;
} {
  const materials: Product[] = [
    {
      id: "m-clay",
      name: "Stoneware clay",
      sku: "RM-CLAY-001",
      category: "Raw materials",
      itemType: "material",
      unit: "kg",
      price: 0,
      cost: 2.8,
      stock: 120.5,
      reorderAt: 40,
      location: "Materials · R-01",
      kind: "vase",
      color: "#eae1da",
    },
    {
      id: "m-glaze",
      name: "Clear glaze",
      sku: "RM-GLZ-002",
      category: "Raw materials",
      itemType: "material",
      unit: "l",
      price: 0,
      cost: 18,
      stock: 8.25,
      reorderAt: 5,
      location: "Materials · R-02",
      kind: "vase",
      color: "#e1e8ea",
    },
    {
      id: "m-box",
      name: "Protective packaging",
      sku: "RM-PKG-003",
      category: "Packaging",
      itemType: "material",
      unit: "pcs",
      price: 0,
      cost: 1.2,
      stock: 200,
      reorderAt: 50,
      location: "Materials · R-03",
      kind: "tray",
      color: "#eee4d5",
    },
    {
      id: "m-oak",
      name: "Oak timber",
      sku: "RM-OAK-004",
      category: "Raw materials",
      itemType: "material",
      unit: "m",
      price: 0,
      cost: 12.5,
      stock: 65,
      reorderAt: 20,
      location: "Materials · R-04",
      kind: "shelf",
      color: "#ede1d2",
    },
  ];
  return {
    materials,
    manufacturing: {
      suppliers: [
        {
          id: "s1",
          name: "Atlas Materials",
          contact: "Sam Rivera",
          email: "sam@example.com",
          phone: "",
        },
        {
          id: "s2",
          name: "Timber Supply Co.",
          contact: "Jamie Chen",
          email: "jamie@example.com",
          phone: "",
        },
        {
          id: "s3",
          name: "Packaging Works",
          contact: "",
          email: "",
          phone: "",
        },
      ],
      boms: [
        {
          id: "bom-vase",
          name: "Ceramic vase · standard batch",
          productId: "p3",
          outputQuantity: 1,
          components: [
            { productId: "m-clay", quantity: 1.25 },
            { productId: "m-glaze", quantity: 0.08 },
            { productId: "m-box", quantity: 1 },
          ],
          laborCost: 12,
          overheadCost: 4,
          revision: 1,
        },
        {
          id: "bom-shelf",
          name: "Oak shelf · standard assembly",
          productId: "p4",
          outputQuantity: 1,
          components: [
            { productId: "m-oak", quantity: 1.2 },
            { productId: "m-box", quantity: 1 },
          ],
          laborCost: 15,
          overheadCost: 3,
          revision: 1,
        },
      ],
      jobs: [],
      movements: materials.map((p) => ({
        id: `opening-${p.id}`,
        productId: p.id,
        quantity: p.stock,
        unitCost: p.cost,
        kind: "Opening",
        reference: "Demo opening stock",
        at: "2026-10-26T09:00:00Z",
        note: "Fictional opening material balance",
      })),
    },
  };
}
export const unitOf = (item: Product) => item.unit ?? "pcs";
export const typeOf = (item: Product) => item.itemType ?? "finished";
export const roundQuantity = (value: number) =>
  Math.round((value + Number.EPSILON) * 1e6) / 1e6;
export function validQuantity(value: number, item: Product, allowZero = false) {
  return (
    Number.isFinite(value) &&
    value >= (allowZero ? 0 : 0.000001) &&
    value <= 1e9 &&
    Math.abs(value - roundQuantity(value)) < 1e-9 &&
    (unitOf(item) !== "pcs" || Number.isSafeInteger(value))
  );
}
export const productionReserved = (state: AppState, id: string) =>
  roundQuantity(
    state.manufacturing.jobs
      .filter((j) => j.status === "Planned" || j.status === "In progress")
      .reduce(
        (n, j) =>
          n +
          j.components
            .filter((c) => c.productId === id)
            .reduce((s, c) => s + c.quantity, 0),
        0,
      ),
  );
export function manufacturingAvailable(state: AppState, id: string) {
  const sales = state.orders
    .filter((o) => o.status === "Processing")
    .reduce(
      (n, o) =>
        n +
        o.items
          .filter((i) => i.productId === id)
          .reduce((s, i) => s + i.quantity, 0),
      0,
    );
  return roundQuantity(
    (state.products.find((p) => p.id === id)?.stock ?? 0) -
      sales -
      productionReserved(state, id),
  );
}
export function movement(
  productId: string,
  quantity: number,
  unitCost: number,
  kind: StockMovement["kind"],
  reference: string,
  note = "",
): StockMovement {
  return {
    id: crypto.randomUUID(),
    productId,
    quantity: roundQuantity(quantity),
    unitCost,
    kind,
    reference,
    at: new Date().toISOString(),
    note,
  };
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function cost(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1e12;
}
export function isManufacturingAction(action: {
  type: string;
}): action is ManufacturingAction {
  return [
    "save-supplier",
    "save-bom",
    "plan-production",
    "start-production",
    "complete-production",
    "cancel-production",
  ].includes(action.type);
}
export function manufacturingTransition(
  state: AppState,
  action: ManufacturingAction,
): AppState {
  const m = state.manufacturing;
  let next: AppState = { ...state, manufacturing: { ...m } };
  let activity: Pick<Activity, "text" | "detail" | "type">;
  if (action.type === "save-supplier") {
    const supplier = Object.fromEntries(
      Object.entries(action.supplier).map(([k, v]) => [k, v.trim()]),
    ) as unknown as Supplier;
    assert(supplier.name, "Supplier name is required.");
    assert(
      !supplier.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email),
      "Enter a valid supplier email or leave it blank.",
    );
    assert(
      !m.suppliers.some(
        (s) =>
          s.id !== supplier.id &&
          s.name.toLowerCase() === supplier.name.toLowerCase(),
      ),
      "This supplier already exists.",
    );
    next.manufacturing.suppliers = m.suppliers.some((s) => s.id === supplier.id)
      ? m.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
      : [...m.suppliers, supplier];
    activity = {
      text: "Supplier saved",
      detail: supplier.name,
      type: "workspace",
    };
  } else if (action.type === "save-bom") {
    const b = { ...action.bom, name: action.bom.name.trim() };
    const output = state.products.find((p) => p.id === b.productId);
    assert(
      output && typeOf(output) === "finished",
      "Choose a finished product as the recipe output.",
    );
    assert(
      b.name && validQuantity(b.outputQuantity, output),
      "Give this bill of materials a name and a valid output quantity.",
    );
    assert(
      cost(b.laborCost) && cost(b.overheadCost),
      "Labor and overhead must be non-negative amounts.",
    );
    assert(
      b.components.length > 0 &&
        new Set(b.components.map((c) => c.productId)).size ===
          b.components.length,
      "Add unique input items to the bill of materials.",
    );
    for (const c of b.components) {
      const p = state.products.find((p) => p.id === c.productId);
      assert(
        p && p.id !== b.productId && validQuantity(c.quantity, p),
        "Every input needs a valid quantity in its base unit; a product cannot consume itself.",
      );
    }
    assert(
      !m.boms.some(
        (other) => other.id !== b.id && other.productId === b.productId,
      ),
      "This product already has a bill of materials. Edit that recipe instead.",
    );
    const previous = m.boms.find((other) => other.id === b.id);
    const bom: BillOfMaterials = {
      ...b,
      revision: (previous?.revision ?? 0) + 1,
      components: b.components.map((c) => ({ ...c })),
    };
    const boms = m.boms.filter((other) => other.id !== bom.id).concat(bom);
    function cycle(id: string, path: Set<string>): boolean {
      if (path.has(id)) return true;
      const recipe = boms.find((r) => r.productId === id);
      if (!recipe) return false;
      const seen = new Set(path).add(id);
      return recipe.components.some((c) => cycle(c.productId, seen));
    }
    assert(
      !cycle(bom.productId, new Set()),
      "This recipe creates a circular dependency between products.",
    );
    next.manufacturing.boms = previous
      ? m.boms.map((other) => (other.id === bom.id ? bom : other))
      : [...m.boms, bom];
    activity = {
      text: "Bill of materials saved",
      detail: `${bom.name} · revision ${bom.revision}`,
      type: "workspace",
    };
  } else if (action.type === "plan-production") {
    const bom = m.boms.find((b) => b.id === action.bomId);
    assert(bom, "Choose a bill of materials.");
    const product = state.products.find((p) => p.id === bom.productId)!;
    assert(
      validQuantity(action.quantity, product),
      `Enter a valid production quantity in ${unitOf(product)}.`,
    );
    assert(
      !Number.isNaN(Date.parse(action.dueAt)),
      "Choose a valid planned completion date.",
    );
    const factor = action.quantity / bom.outputQuantity;
    const components = bom.components.map((c) => ({
      productId: c.productId,
      quantity: roundQuantity(c.quantity * factor),
    }));
    for (const c of components) {
      const item = state.products.find((p) => p.id === c.productId)!;
      assert(
        validQuantity(c.quantity, item),
        `The batch requires a fractional piece or too-small quantity of ${item.name}. Adjust the batch size.`,
      );
      assert(
        manufacturingAvailable(state, c.productId) >= c.quantity,
        `Material shortage: ${item.name} requires ${c.quantity} ${unitOf(item)}; ${manufacturingAvailable(state, item.id)} ${unitOf(item)} is available.`,
      );
    }
    const job: ProductionOrder = {
      id: crypto.randomUUID(),
      number: `MO-${String(Math.max(1000, ...m.jobs.map((j) => Number(j.number.split("-")[1]) || 0)) + 1)}`,
      bomId: bom.id,
      bomName: bom.name,
      revision: bom.revision,
      productId: bom.productId,
      quantity: action.quantity,
      components,
      laborCost: roundQuantity(bom.laborCost * factor),
      overheadCost: roundQuantity(bom.overheadCost * factor),
      status: "Planned",
      createdAt: new Date().toISOString(),
      dueAt: action.dueAt,
    };
    const estimatedCost =
      components.reduce(
        (n, c) =>
          n +
          c.quantity * state.products.find((p) => p.id === c.productId)!.cost,
        0,
      ) +
      job.laborCost +
      job.overheadCost;
    assert(
      cost(job.laborCost) && cost(job.overheadCost) && cost(estimatedCost),
      "This production order exceeds the maximum supported cost.",
    );
    next.manufacturing.jobs = [job, ...m.jobs];
    activity = {
      text: `${job.number} planned`,
      detail: `${job.quantity} ${unitOf(product)} ${product.name} · input stock reserved`,
      type: "production",
    };
  } else {
    const job = m.jobs.find((j) => j.id === action.id);
    assert(job, "Production order not found.");
    if (action.type === "start-production") {
      assert(
        job.status === "Planned",
        "Only planned production can be started.",
      );
      next.manufacturing.jobs = m.jobs.map((j) =>
        j.id === job.id ? { ...j, status: "In progress" } : j,
      );
      activity = {
        text: `${job.number} started`,
        detail: job.bomName,
        type: "production",
      };
    } else if (action.type === "cancel-production") {
      assert(
        job.status === "Planned" || job.status === "In progress",
        "Completed or cancelled production cannot be cancelled.",
      );
      next.manufacturing.jobs = m.jobs.map((j) =>
        j.id === job.id ? { ...j, status: "Cancelled" } : j,
      );
      activity = {
        text: `${job.number} cancelled`,
        detail: "All input reservations released; no stock was consumed",
        type: "production",
      };
    } else {
      assert(
        job.status === "In progress",
        "Start this production order before completing it. A job can only be completed once.",
      );
      const output = state.products.find((p) => p.id === job.productId)!;
      assert(
        roundQuantity(output.stock + job.quantity) <= 1e9,
        "Completion would exceed the maximum stock quantity.",
      );
      for (const c of job.components) {
        const p = state.products.find((p) => p.id === c.productId)!;
        assert(
          p && p.stock >= c.quantity,
          "Input stock is no longer sufficient to complete this order.",
        );
      }
      const materialCost = roundQuantity(
        job.components.reduce(
          (sum, c) =>
            sum +
            c.quantity * state.products.find((p) => p.id === c.productId)!.cost,
          0,
        ),
      );
      const fullCost = roundQuantity(
        materialCost + job.laborCost + job.overheadCost,
      );
      const unitCost = roundQuantity(fullCost / job.quantity);
      assert(
        cost(fullCost) && cost(unitCost) && unitCost < 1e9,
        "This production order exceeds the maximum supported cost.",
      );
      next.products = state.products.map((p) => {
        if (p.id === output.id)
          return {
            ...p,
            stock: roundQuantity(p.stock + job.quantity),
            cost: roundQuantity(
              (p.stock * p.cost + fullCost) / (p.stock + job.quantity),
            ),
          };
        const input = job.components.find((c) => c.productId === p.id);
        return input
          ? { ...p, stock: roundQuantity(p.stock - input.quantity) }
          : p;
      });
      next.manufacturing.jobs = m.jobs.map((j) =>
        j.id === job.id
          ? {
              ...j,
              status: "Completed",
              completedAt: new Date().toISOString(),
              materialCost,
              unitCost,
            }
          : j,
      );
      next.manufacturing.movements = [
        ...job.components.map((c) =>
          movement(
            c.productId,
            -c.quantity,
            state.products.find((p) => p.id === c.productId)!.cost,
            "Production input",
            job.number,
          ),
        ),
        movement(
          job.productId,
          job.quantity,
          unitCost,
          "Production output",
          job.number,
        ),
        ...m.movements,
      ];
      activity = {
        text: `${job.number} completed`,
        detail: `${job.quantity} ${unitOf(output)} added to finished stock · materials consumed`,
        type: "production",
      };
    }
  }
  next = {
    ...next,
    activities: [
      { id: crypto.randomUUID(), at: new Date().toISOString(), ...activity },
      ...state.activities,
    ].slice(0, 100),
  };
  return next;
}
