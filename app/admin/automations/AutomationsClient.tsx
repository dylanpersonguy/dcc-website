"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createAutomation,
  deleteAutomation,
  toggleAutomation,
} from "@/lib/actions/automations";
import {
  AUTOMATION_TYPES,
  DEFAULT_GITHUB_SCANNER_CONFIG,
} from "@/lib/automation-constants";

interface AutomationRun {
  id: string;
  status: string;
  message: string | null;
  resultPostId: string | null;
  resultSlug: string | null;
  createdAt: string;
}

interface Automation {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunMessage: string | null;
  runCount: number;
  createdAt: string;
  runs: AutomationRun[];
}

export default function AutomationsClient({
  automations: initial,
}: {
  automations: Automation[];
}) {
  const [automations, setAutomations] = useState(initial);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(AUTOMATION_TYPES[0].type);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const config =
        newType === "github_scanner"
          ? { ...DEFAULT_GITHUB_SCANNER_CONFIG }
          : {};
      const automation = await createAutomation(newName.trim(), newType, config);
      setAutomations((prev) => [
        { ...automation, config: config as Record<string, unknown>, runs: [], createdAt: new Date().toISOString(), lastRunAt: null, lastRunStatus: null, lastRunMessage: null, runCount: 0 },
        ...prev,
      ]);
      setShowAddModal(false);
      setNewName("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    });
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      await toggleAutomation(id, enabled);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled } : a))
      );
    });
  }

  const typeInfo = (type: string) =>
    AUTOMATION_TYPES.find((t) => t.type === type) || {
      label: type,
      icon: "⚙️",
      description: "",
    };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Automations
          </h1>
          <p className="mt-1 text-sm text-muted">
            Create and manage automated workflows for content generation.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          + Add New Automation
        </button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-surface p-6 space-y-5 shadow-2xl">
            <h2 className="text-lg font-heading font-semibold text-foreground">
              New Automation
            </h2>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Automation Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Weekly SDK Update Scanner"
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Type Selector */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Automation Type
              </label>
              <div className="space-y-2">
                {AUTOMATION_TYPES.map((at) => (
                  <label
                    key={at.type}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newType === at.type
                        ? "border-primary/30 bg-primary/5"
                        : "border-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="automationType"
                      value={at.type}
                      checked={newType === at.type}
                      onChange={() => setNewType(at.type)}
                      className="mt-0.5 accent-[#00E5FF]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{at.icon}</span>
                        <span className="text-sm font-medium text-foreground">
                          {at.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {at.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewName("");
                }}
                className="px-4 py-2 rounded-lg border border-white/[0.08] text-foreground/70 text-sm font-medium hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Automation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {automations.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-surface p-12 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            No automations yet
          </h3>
          <p className="text-sm text-muted mt-1">
            Click &quot;Add New Automation&quot; to get started.
          </p>
        </div>
      )}

      {/* Automation Cards */}
      <div className="space-y-4">
        {automations.map((automation) => {
          const info = typeInfo(automation.type);
          return (
            <div
              key={automation.id}
              className="rounded-xl border border-white/[0.06] bg-surface overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {info.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">
                      {automation.name}
                    </h3>
                    <p className="text-xs text-muted">
                      {info.label} &middot; {automation.runCount} runs
                      {automation.lastRunAt && (
                        <>
                          {" "}
                          &middot; Last run{" "}
                          {new Date(automation.lastRunAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Status badge */}
                  {automation.lastRunStatus && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        automation.lastRunStatus === "success"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {automation.lastRunStatus}
                    </span>
                  )}

                  {/* Enable / Disable */}
                  <button
                    onClick={() =>
                      handleToggle(automation.id, !automation.enabled)
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      automation.enabled ? "bg-primary/60" : "bg-white/10"
                    }`}
                    title={automation.enabled ? "Disable" : "Enable"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        automation.enabled
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Configure */}
                  <Link
                    href={`/admin/automations/${automation.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    Configure
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete "${automation.name}"? This cannot be undone.`
                        )
                      )
                        handleDelete(automation.id);
                    }}
                    className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1m-8 0h12M6 3v10m4-10v10M3 3l1 11a1 1 0 001 1h6a1 1 0 001-1l1-11"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Recent runs */}
              {automation.runs.length > 0 && (
                <div className="border-t border-white/[0.04] px-6 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
                    Recent Runs
                  </p>
                  <div className="space-y-1">
                    {automation.runs.slice(0, 3).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              run.status === "success"
                                ? "bg-green-400"
                                : run.status === "error"
                                  ? "bg-red-400"
                                  : "bg-yellow-400"
                            }`}
                          />
                          <span className="text-foreground/70 truncate">
                            {run.message || run.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {run.resultPostId && (
                            <Link
                              href={`/admin/blog/${run.resultPostId}/edit`}
                              className="text-primary hover:underline"
                            >
                              Edit post
                            </Link>
                          )}
                          <span className="text-muted">
                            {new Date(run.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
