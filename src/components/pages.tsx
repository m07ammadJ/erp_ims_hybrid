"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Database,
  RotateCcw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { type Action } from "@/lib/domain";
import { Modal } from "./ui";
import type { ViewProps } from "./dashboard";

export function downloadText(
  filename: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type WithAction = ViewProps & {
  onAction: (action: Action, message: string) => boolean;
};

export function Settings({
  state,
  onAction,
  notify,
  reset,
}: WithAction & { reset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    onAction(
      {
        type: "settings",
        name: String(f.get("name")),
        owner: String(f.get("owner")),
      },
      "Workspace updated. A little more you.",
    );
  }
  return (
    <div className="settings-view animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Settings2 size={14} />A space that feels like yours
          </div>
          <h1>
            Workspace settings<span className="heading-period">.</span>
          </h1>
          <p>Workspace details, data, and preferences.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Workspace details</h2>
            <p>A name, a face, a little personality.</p>
          </div>
          <span className="workspace-mark">
            f<span>✦</span>
          </span>
        </div>
        <form
          key={state.settings.name + state.settings.owner}
          className="settings-form"
          onSubmit={submit}
        >
          <div className="form-grid">
            <label>
              Workspace name
              <input
                name="name"
                required
                defaultValue={state.settings.name}
                maxLength={80}
              />
            </label>
            <label>
              Your display name
              <input
                name="owner"
                required
                defaultValue={state.settings.owner}
                maxLength={80}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Currency
              <input value="USD — US Dollar" readOnly />
              <small>All product prices and reports use USD.</small>
            </label>
            <label>
              Workspace mode
              <input value="Local demo workspace" readOnly />
              <small>Your records are stored in this browser.</small>
            </label>
          </div>
          <button className="button button-primary">
            <Check size={15} />
            Save changes
          </button>
        </form>
      </section>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>Your data, in your hands</h2>
            <p>Take a copy of your workspace with you.</p>
          </div>
          <Database size={20} className="muted" />
        </div>
        <div className="settings-data">
          <div className="settings-note">
            <ShieldCheck size={21} />
            <div>
              <strong>A functional prototype with local persistence</strong>
              <p>
                Orders, inventory, and pages are saved in this browser. There is
                no server, account system, multi-user sync, or payment
                processing connected. Clearing browser storage removes your
                changes. Export a backup before you do.
              </p>
            </div>
          </div>
          <div className="backup-row">
            <span>
              <strong>Export a full backup</strong>
              <small>
                Products, customers, transactions, and pages as JSON.
              </small>
            </span>
            <button
              className="button"
              onClick={() => {
                downloadText(
                  `forma-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(state, null, 2),
                  "application/json",
                );
                notify("Your full workspace backup is downloaded.");
              }}
            >
              <ArrowDownToLine size={15} />
              Export backup
            </button>
          </div>
        </div>
      </section>
      <section className="panel settings-panel danger-panel">
        <div>
          <h2>A fresh start</h2>
          <p>Replace this browser’s data with the original sample workspace.</p>
        </div>
        <button className="button" onClick={() => setConfirm(true)}>
          <RotateCcw size={14} />
          Reset demo data
        </button>
      </section>
      {confirm && (
        <Modal
          title="Make a fresh start?"
          subtitle="This replaces all local records, pages, and settings with the original demo data."
          onClose={() => setConfirm(false)}
        >
          <div className="confirm-content">
            <p>
              Export a backup first if you want to keep your changes. This
              action cannot be undone in the app.
            </p>
            <div className="form-footer">
              <button className="button" onClick={() => setConfirm(false)}>
                Keep my workspace
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  reset();
                  setConfirm(false);
                  notify("A fresh workspace, full of possibilities.");
                }}
              >
                Reset demo data
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="A little help along the way"
      subtitle="Welcome to Forma. Your connected business workspace."
      onClose={onClose}
    >
      <div className="help-content">
        <div className="help-section">
          <span>01</span>
          <div>
            <h3>Start with what you have</h3>
            <p>
              Add your products and customers, or explore the sample collection.
              Edit any product to set its stock and reorder point.
            </p>
          </div>
        </div>
        <div className="help-section">
          <span>02</span>
          <div>
            <h3>Let everything connect</h3>
            <p>
              Create an order to reserve stock. Ship it to deduct inventory.
              Create and receive purchase orders to replenish your shelves.
            </p>
          </div>
        </div>
        <div className="help-section">
          <span>03</span>
          <div>
            <h3>Give your ideas a home</h3>
            <p>
              Keep processes and plans in workspace pages. Add headings, lists,
              and checklists, then preview your page to tick things off.
            </p>
          </div>
        </div>
        <div className="shortcut-list">
          <span>
            Search your workspace<kbd>Ctrl / ⌘ K</kbd>
          </span>
          <span>
            Open search<kbd>/</kbd>
          </span>
          <span>
            Close a dialog<kbd>Esc</kbd>
          </span>
          <span>
            Save a page while editing<kbd>Ctrl / ⌘ S</kbd>
          </span>
        </div>
        <p className="data-note">
          This demo stores data in your browser. You can export a full backup in
          Workspace settings.
        </p>
      </div>
    </Modal>
  );
}
