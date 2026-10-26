"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Factory, Plus, Trash2 } from "lucide-react";
import {
  available,
  money,
  shortDate,
  uid,
  type Action,
  type AppState,
} from "@/lib/domain";
import {
  roundQuantity,
  typeOf,
  unitOf,
  type Component,
} from "@/lib/manufacturing";
import { Empty, Modal, ProductArt, Status } from "./ui";
import type { RecordModal } from "./forms";

interface Props {
  modal: RecordModal;
  state: AppState;
  onClose: () => void;
  onAction: (action: Action, message: string) => boolean;
  onOpen?: (modal: RecordModal) => void;
}
export function ManufacturingDialog(props: Props) {
  switch (props.modal.type) {
    case "bom":
      return <BomForm {...props} bomId={props.modal.bomId} />;
    case "production":
      return <ProductionForm {...props} bomId={props.modal.bomId} />;
    case "production-detail":
      return <ProductionDetail {...props} id={props.modal.id} />;
    case "supplier":
      return <SupplierForm {...props} supplierId={props.modal.supplierId} />;
    default:
      return null;
  }
}

function BomForm({
  state,
  bomId,
  onClose,
  onAction,
  onOpen,
}: Props & { bomId?: string }) {
  const bom = state.manufacturing.boms.find((b) => b.id === bomId);
  const outputs = state.products.filter(
    (p) =>
      typeOf(p) === "finished" &&
      !state.manufacturing.boms.some(
        (b) => b.productId === p.id && b.id !== bomId,
      ),
  );
  const [outputId, setOutputId] = useState(
    bom?.productId ?? outputs[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(bom?.outputQuantity ?? 1);
  const inputs = state.products
    .filter((p) => p.id !== outputId)
    .sort(
      (a, b) =>
        Number(typeOf(b) === "material") - Number(typeOf(a) === "material"),
    );
  const [components, setComponents] = useState<Component[]>(
    bom?.components ??
      (inputs[0] ? [{ productId: inputs[0].id, quantity: 1 }] : []),
  );
  const [labor, setLabor] = useState(bom?.laborCost ?? 0);
  const [overhead, setOverhead] = useState(bom?.overheadCost ?? 0);
  const output = state.products.find((p) => p.id === outputId);
  const estimate =
    components.reduce(
      (n, c) =>
        n +
        c.quantity *
          (state.products.find((p) => p.id === c.productId)?.cost ?? 0),
      0,
    ) +
    labor +
    overhead;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      onAction(
        {
          type: "save-bom",
          bom: {
            id: bom?.id ?? uid(),
            name: String(f.get("name")),
            productId: outputId,
            outputQuantity: quantity,
            components,
            laborCost: labor,
            overheadCost: overhead,
          },
        },
        "Bill of materials saved. Future production uses this revision.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={bom ? "Edit bill of materials" : "New bill of materials"}
      subtitle="Define what you consume, what you make, and the cost of making it."
      onClose={onClose}
      wide
    >
      {outputs.length && inputs.length ? (
        <form className="record-form" onSubmit={submit}>
          <label>
            Recipe name
            <input
              name="name"
              defaultValue={bom?.name}
              placeholder="e.g. Standard product assembly"
              maxLength={100}
              required
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label>
              Finished product
              <select
                aria-label="Output product"
                value={outputId}
                onChange={(e) => {
                  setOutputId(e.target.value);
                  setComponents((old) =>
                    old.filter((c) => c.productId !== e.target.value),
                  );
                }}
                required
              >
                {outputs.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · {unitOf(p)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Recipe output quantity
              <input
                aria-label="Recipe output quantity"
                type="number"
                min={output && unitOf(output) === "pcs" ? 1 : 0.000001}
                step={output && unitOf(output) === "pcs" ? 1 : 0.000001}
                max={1e9}
                value={Number.isNaN(quantity) ? "" : quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value === "" ? NaN : Number(e.target.value),
                  )
                }
                required
              />
            </label>
          </div>
          <div className="manufacturing-section-label">
            INPUTS PER RECIPE{" "}
            <span>Each quantity uses the input item’s base unit.</span>
          </div>
          <div className="bom-lines">
            {components.map((c, i) => {
              const item = state.products.find((p) => p.id === c.productId);
              return (
                <div className="bom-line" key={i}>
                  <label>
                    Input item
                    <select
                      aria-label={`Material ${i + 1}`}
                      value={c.productId}
                      onChange={(e) =>
                        setComponents((old) =>
                          old.map((line, n) =>
                            n === i
                              ? { ...line, productId: e.target.value }
                              : line,
                          ),
                        )
                      }
                      required
                    >
                      {inputs.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={components.some(
                            (c, n) => n !== i && c.productId === p.id,
                          )}
                        >
                          {p.name} · {unitOf(p)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity ({item ? unitOf(item) : ""})
                    <input
                      aria-label={`Material quantity ${i + 1}`}
                      type="number"
                      min={item && unitOf(item) === "pcs" ? 1 : 0.000001}
                      step={item && unitOf(item) === "pcs" ? 1 : 0.000001}
                      max={1e9}
                      value={Number.isNaN(c.quantity) ? "" : c.quantity}
                      onChange={(e) =>
                        setComponents((old) =>
                          old.map((line, n) =>
                            n === i
                              ? {
                                  ...line,
                                  quantity:
                                    e.target.value === ""
                                      ? NaN
                                      : Number(e.target.value),
                                }
                              : line,
                          ),
                        )
                      }
                      required
                    />
                  </label>
                  <span className="bom-line-cost">
                    {money((item?.cost ?? 0) * c.quantity || 0)}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove material ${i + 1}`}
                    onClick={() =>
                      setComponents((old) => old.filter((_, n) => i !== n))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            className="text-button"
            type="button"
            disabled={components.length >= inputs.length}
            onClick={() => {
              const p = inputs.find(
                (p) => !components.some((c) => c.productId === p.id),
              );
              if (p)
                setComponents([
                  ...components,
                  { productId: p.id, quantity: 1 },
                ]);
            }}
          >
            <Plus size={14} />
            Add input
          </button>
          <div className="form-grid conversion-costs">
            <label>
              Labor per recipe ($)
              <input
                type="number"
                min="0"
                step="0.01"
                max={1e9}
                value={Number.isNaN(labor) ? "" : labor}
                onChange={(e) =>
                  setLabor(e.target.value === "" ? NaN : Number(e.target.value))
                }
                required
              />
            </label>
            <label>
              Overhead per recipe ($)
              <input
                type="number"
                min="0"
                step="0.01"
                max={1e9}
                value={Number.isNaN(overhead) ? "" : overhead}
                onChange={(e) =>
                  setOverhead(
                    e.target.value === "" ? NaN : Number(e.target.value),
                  )
                }
                required
              />
            </label>
          </div>
          <div className="order-form-total">
            <span>
              Estimated recipe cost
              <small>Inputs + labor + overhead · before tax</small>
            </span>
            <strong>{money(Number.isFinite(estimate) ? estimate : 0)}</strong>
          </div>
          <div className="form-note">
            Production orders snapshot this recipe and its quantities. Editing a
            recipe does not change existing orders.
          </div>
          <div className="form-footer">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary">
              Save bill of materials
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <Empty
          title="Add your inputs and output first"
          text="You need a finished product and at least one material or component to define a recipe."
          action={
            <button
              className="button button-primary"
              onClick={() =>
                onOpen?.({
                  type: "product",
                  itemType: outputs.length ? "material" : "finished",
                })
              }
            >
              Add inventory item
            </button>
          }
        />
      )}
    </Modal>
  );
}

function ProductionForm({
  state,
  bomId,
  onClose,
  onAction,
  onOpen,
}: Props & { bomId?: string }) {
  const [selected, setSelected] = useState(
    bomId ?? state.manufacturing.boms[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const bom = state.manufacturing.boms.find((b) => b.id === selected);
  const output = state.products.find((p) => p.id === bom?.productId);
  const factor = bom ? quantity / bom.outputQuantity : 0;
  const requirements =
    bom?.components.map((c) => ({
      ...c,
      required: roundQuantity(c.quantity * factor),
      item: state.products.find((p) => p.id === c.productId)!,
    })) ?? [];
  const shortage = requirements.filter(
    (c) => c.required > available(state, c.productId),
  );
  const estimate =
    requirements.reduce((n, c) => n + c.required * c.item.cost, 0) +
    (bom ? (bom.laborCost + bom.overheadCost) * factor : 0);
  const due = new Date();
  due.setDate(due.getDate() + 7);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      onAction(
        {
          type: "plan-production",
          bomId: selected,
          quantity,
          dueAt: String(f.get("dueAt")),
        },
        "Production planned. Input stock is reserved.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title="Plan production"
      subtitle="Reserve materials now. Add finished goods only when production is completed."
      onClose={onClose}
      wide
    >
      {bom && output ? (
        <form className="record-form" onSubmit={submit}>
          <label>
            Bill of materials
            <select
              aria-label="Bill of materials"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
              autoFocus
            >
              {state.manufacturing.boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · rev {b.revision}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Quantity to make ({unitOf(output)})
              <input
                aria-label="Quantity to make"
                type="number"
                min={unitOf(output) === "pcs" ? 1 : 0.000001}
                step={unitOf(output) === "pcs" ? 1 : 0.000001}
                max={1e9}
                required
                value={Number.isNaN(quantity) ? "" : quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value === "" ? NaN : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Planned completion
              <input
                type="date"
                name="dueAt"
                defaultValue={due.toISOString().slice(0, 10)}
                required
              />
            </label>
          </div>
          <div className="production-output-preview">
            <Factory size={20} />
            <span>
              <strong>{output.name}</strong>
              <small>
                {Number.isFinite(quantity) ? quantity : 0} {unitOf(output)} will
                be added to finished stock on completion
              </small>
            </span>
          </div>
          <div className="table-scroll production-requirements">
            <table>
              <thead>
                <tr>
                  <th>Input</th>
                  <th className="align-right">Required</th>
                  <th className="align-right">Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((c) => (
                  <tr key={c.productId}>
                    <td>{c.item.name}</td>
                    <td className="align-right">
                      {Number.isFinite(c.required) ? c.required : "—"}{" "}
                      {unitOf(c.item)}
                    </td>
                    <td className="align-right">
                      {available(state, c.productId)} {unitOf(c.item)}
                    </td>
                    <td>
                      <Status
                        status={
                          c.required > available(state, c.productId)
                            ? "Shortage"
                            : "Available"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shortage.length > 0 && (
            <div className="manufacturing-shortage">
              <span>
                {shortage.length} input item{shortage.length === 1 ? "" : "s"}{" "}
                short. Receive more material or reduce the batch.
              </span>
              <button
                type="button"
                className="button button-small"
                onClick={() =>
                  onOpen?.({
                    type: "purchase",
                    productIds: shortage.map((c) => c.productId),
                  })
                }
              >
                Purchase inputs
                <ArrowRight size={13} />
              </button>
            </div>
          )}
          <div className="order-form-total">
            <span>
              Estimated production cost
              <small>
                Using current input costs; actual cost is captured on
                completion.
              </small>
            </span>
            <strong>{money(Number.isFinite(estimate) ? estimate : 0)}</strong>
          </div>
          <div className="form-footer">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={shortage.length > 0}
            >
              Reserve & plan production
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <Empty
          title="Define a bill of materials first"
          text="Tell Forma which inputs become which product, then plan your first batch."
          action={
            <button
              className="button button-primary"
              onClick={() => onOpen?.({ type: "bom" })}
            >
              <Plus size={15} />
              New bill of materials
            </button>
          }
        />
      )}
    </Modal>
  );
}

function ProductionDetail({
  state,
  id,
  onClose,
  onAction,
}: Props & { id: string }) {
  const job = state.manufacturing.jobs.find((j) => j.id === id);
  if (!job) return null;
  const output = state.products.find((p) => p.id === job.productId)!;
  const estimate =
    job.components.reduce(
      (n, c) =>
        n + c.quantity * state.products.find((p) => p.id === c.productId)!.cost,
      0,
    ) +
    job.laborCost +
    job.overheadCost;
  return (
    <Modal
      title={job.number}
      subtitle={`${job.bomName} · revision ${job.revision} · due ${shortDate(job.dueAt)}`}
      onClose={onClose}
      wide
    >
      <div className="detail-content">
        <div className="detail-status">
          <Status status={job.status} />
          <span className="muted">
            {job.completedAt
              ? `Completed ${shortDate(job.completedAt)}`
              : "Materials reserved until completion or cancellation"}
          </span>
        </div>
        <div className="production-output-preview">
          <ProductArt product={output} />
          <span>
            <strong>{output.name}</strong>
            <small>
              {job.quantity} {unitOf(output)}{" "}
              {job.status === "Completed"
                ? "added to finished stock"
                : "planned output"}
            </small>
          </span>
        </div>
        <div className="table-scroll production-requirements">
          <table>
            <thead>
              <tr>
                <th>Input</th>
                <th className="align-right">
                  {job.status === "Completed" ? "Consumed" : "Required"}
                </th>
                <th className="align-right">
                  {job.status === "Completed"
                    ? "Captured cost"
                    : "Current cost"}
                </th>
              </tr>
            </thead>
            <tbody>
              {job.components.map((c) => {
                const p = state.products.find((p) => p.id === c.productId)!;
                const captured = state.manufacturing.movements.find(
                  (m) =>
                    m.reference === job.number &&
                    m.productId === p.id &&
                    m.kind === "Production input",
                );
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="align-right">
                      {c.quantity} {unitOf(p)}
                    </td>
                    <td className="align-right">
                      {money(c.quantity * (captured?.unitCost ?? p.cost))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="production-cost-breakdown">
          <span>
            Labor <b>{money(job.laborCost)}</b>
          </span>
          <span>
            Overhead <b>{money(job.overheadCost)}</b>
          </span>
        </div>
        <div className="detail-total">
          <span>
            {job.status === "Completed"
              ? "Actual production cost"
              : "Estimated production cost"}
          </span>
          <strong>
            {money(
              job.materialCost === undefined
                ? estimate
                : job.materialCost + job.laborCost + job.overheadCost,
            )}
          </strong>
        </div>
        {job.unitCost !== undefined && (
          <div className="form-note">
            Production cost: {money(job.unitCost)} per {unitOf(output)}.
            Finished stock uses a weighted average of opening stock and this
            batch.
          </div>
        )}
        <div className="detail-actions">
          {["Planned", "In progress"].includes(job.status) && (
            <button
              className="text-button danger-text"
              onClick={() =>
                onAction(
                  { type: "cancel-production", id },
                  "Production cancelled. Material reservations released.",
                )
              }
            >
              Cancel production
            </button>
          )}
          <div />
          {job.status === "Planned" && (
            <button
              className="button button-primary"
              onClick={() =>
                onAction(
                  { type: "start-production", id },
                  "Production started.",
                )
              }
            >
              <Factory size={15} />
              Start production
            </button>
          )}
          {job.status === "In progress" && (
            <button
              className="button button-primary"
              onClick={() =>
                onAction(
                  { type: "complete-production", id },
                  "Production completed. Materials consumed and finished stock added.",
                )
              }
            >
              <Check size={15} />
              Complete production
            </button>
          )}
          {["Completed", "Cancelled"].includes(job.status) && (
            <button className="button" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SupplierForm({
  state,
  supplierId,
  onClose,
  onAction,
}: Props & { supplierId?: string }) {
  const supplier = state.manufacturing.suppliers.find(
    (s) => s.id === supplierId,
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      onAction(
        {
          type: "save-supplier",
          supplier: {
            id: supplier?.id ?? uid(),
            name: String(f.get("name")),
            contact: String(f.get("contact")),
            email: String(f.get("email")),
            phone: String(f.get("phone")),
          },
        },
        "Supplier saved.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={supplier ? "Edit supplier" : "New supplier"}
      subtitle="The people and businesses you buy materials and components from."
      onClose={onClose}
    >
      <form className="record-form" onSubmit={submit}>
        <label>
          Supplier name
          <input
            name="name"
            defaultValue={supplier?.name}
            required
            maxLength={100}
            autoFocus
          />
        </label>
        <label>
          Contact person (optional)
          <input
            name="contact"
            defaultValue={supplier?.contact}
            maxLength={100}
          />
        </label>
        <div className="form-grid">
          <label>
            Email (optional)
            <input
              name="email"
              type="email"
              defaultValue={supplier?.email}
              maxLength={150}
            />
          </label>
          <label>
            Phone (optional)
            <input name="phone" defaultValue={supplier?.phone} maxLength={60} />
          </label>
        </div>
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary">
            Save supplier
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
