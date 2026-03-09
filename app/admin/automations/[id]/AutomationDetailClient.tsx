"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateAutomationConfig,
  updateAutomationName,
  fetchGitHubRepos,
  fetchRepoCommits,
  runGitHubScanner,
  type GitHubScannerConfig,
  type GitHubRepo,
  type CommitGroup,
} from "@/lib/actions/automations";
import {
  DEFAULT_GITHUB_SCANNER_CONFIG,
  AUTOMATION_TYPES,
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

type Tab = "config" | "run" | "history";

export default function AutomationDetailClient({
  automation: initial,
}: {
  automation: Automation;
}) {
  const [automation, setAutomation] = useState(initial);
  const [tab, setTab] = useState<Tab>("config");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const info = AUTOMATION_TYPES.find((t) => t.type === automation.type) || {
    label: automation.type,
    icon: "⚙️",
  };

  // Config state
  const rawConfig = automation.config as unknown as GitHubScannerConfig;
  const [config, setConfig] = useState<GitHubScannerConfig>({
    ...DEFAULT_GITHUB_SCANNER_CONFIG,
    ...rawConfig,
  });
  const [name, setName] = useState(automation.name);

  // Run state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(
    new Set(config.repos)
  );
  const [commitGroups, setCommitGroups] = useState<CommitGroup[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [runStep, setRunStep] = useState<
    "repos" | "commits" | "generating" | "done"
  >("repos");
  const [runResult, setRunResult] = useState<{
    postId: string;
    slug: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ─── Save config ─── */
  function handleSave() {
    startTransition(async () => {
      const finalConfig = { ...config, repos: Array.from(selectedRepos) };
      await updateAutomationConfig(
        automation.id,
        finalConfig as unknown as Record<string, unknown>
      );
      if (name !== automation.name) {
        await updateAutomationName(automation.id, name);
      }
      setConfig(finalConfig);
      setAutomation((prev) => ({
        ...prev,
        name,
        config: finalConfig as unknown as Record<string, unknown>,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  /* ─── Run flow ─── */
  function handleLoadRepos() {
    setError(null);
    startTransition(async () => {
      const res = await fetchGitHubRepos();
      if (!res.success || !res.repos) {
        setError(res.error || "Failed to load repos");
        return;
      }
      setRepos(res.repos);
      // Pre-select repos from config
      if (config.repos.length > 0) {
        setSelectedRepos(new Set(config.repos));
      }
    });
  }

  function toggleRepo(repoName: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoName)) next.delete(repoName);
      else next.add(repoName);
      return next;
    });
  }

  function handleScanCommits() {
    if (selectedRepos.size === 0) return;
    setError(null);
    startTransition(async () => {
      const since = new Date(
        Date.now() - config.sinceDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const res = await fetchRepoCommits(Array.from(selectedRepos), since);
      if (!res.success || !res.commitGroups) {
        setError(res.error || "Failed to fetch commits");
        return;
      }
      if (res.commitGroups.length === 0) {
        setError("No commits found in the selected time range.");
        return;
      }
      setCommitGroups(res.commitGroups);
      const map = new Map<string, Set<string>>();
      for (const g of res.commitGroups) {
        map.set(g.repo, new Set(g.commits.map((c) => c.sha)));
      }
      setSelectedCommits(map);
      setRunStep("commits");
    });
  }

  function toggleCommit(repo: string, sha: string) {
    setSelectedCommits((prev) => {
      const next = new Map(prev);
      const repoSet = new Set(next.get(repo) || []);
      if (repoSet.has(sha)) repoSet.delete(sha);
      else repoSet.add(sha);
      next.set(repo, repoSet);
      return next;
    });
  }

  function totalSelectedCommits() {
    let total = 0;
    for (const s of selectedCommits.values()) total += s.size;
    return total;
  }

  function handleGenerate() {
    setError(null);
    setRunStep("generating");
    startTransition(async () => {
      const filtered: CommitGroup[] = commitGroups
        .map((g) => {
          const selSet = selectedCommits.get(g.repo);
          if (!selSet || selSet.size === 0) return null;
          return { ...g, commits: g.commits.filter((c) => selSet.has(c.sha)) };
        })
        .filter(Boolean) as CommitGroup[];

      if (filtered.length === 0) {
        setError("No commits selected.");
        setRunStep("commits");
        return;
      }

      const res = await runGitHubScanner(automation.id, filtered);
      if (!res.success) {
        setError(res.error || "Generation failed");
        setRunStep("commits");
        return;
      }
      setRunResult({ postId: res.postId!, slug: res.slug! });
      setRunStep("done");
    });
  }

  function resetRun() {
    setRunStep("repos");
    setCommitGroups([]);
    setSelectedCommits(new Map());
    setRunResult(null);
    setError(null);
  }

  const totalCommits = commitGroups.reduce(
    (sum, g) => sum + g.commits.length,
    0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/admin/automations"
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          &larr; All Automations
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
            {info.icon}
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {automation.name}
            </h1>
            <p className="text-xs text-muted">
              {info.label} &middot; {automation.runCount} runs &middot; Created{" "}
              {new Date(automation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {(
          [
            { key: "config", label: "Configuration" },
            { key: "run", label: "Run Now" },
            { key: "history", label: "Run History" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Configuration Tab ─── */}
      {tab === "config" && (
        <div className="rounded-xl border border-white/[0.06] bg-surface p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Automation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-md rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Range */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Scan Time Range
              </label>
              <select
                value={config.sinceDays}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    sinceDays: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Writing Tone
              </label>
              <select
                value={config.tone}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, tone: e.target.value }))
                }
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="friendly">Friendly & Conversational</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual & Fun</option>
                <option value="formal">Formal & Precise</option>
              </select>
            </div>

            {/* Audience Level */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Audience Level
              </label>
              <select
                value={config.audienceLevel}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    audienceLevel: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="BEGINNER">Beginner (anyone can understand)</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced (technical audience)</option>
              </select>
            </div>

            {/* Blog Category */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Blog Category
              </label>
              <select
                value={config.blogCategory}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    blogCategory: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="INDUSTRY_NEWS">Industry News</option>
                <option value="AI_AGENTS">AI Agents</option>
                <option value="AUTOMATION">Automation</option>
                <option value="TRADING_BOTS">Trading Bots</option>
                <option value="TUTORIALS">Tutorials</option>
                <option value="WEB3">Web3</option>
              </select>
            </div>

            {/* Word Count Min */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Min Word Count
              </label>
              <input
                type="number"
                value={config.wordCountMin}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    wordCountMin: Number(e.target.value),
                  }))
                }
                min={300}
                max={5000}
                step={100}
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Word Count Max */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Max Word Count
              </label>
              <input
                type="number"
                value={config.wordCountMax}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    wordCountMax: Number(e.target.value),
                  }))
                }
                min={300}
                max={5000}
                step={100}
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Author Name
              </label>
              <input
                type="text"
                value={config.authorName}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    authorName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Pillar Page Slug */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Parent Pillar Page Slug
              </label>
              <input
                type="text"
                value={config.pillarSlug}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    pillarSlug: e.target.value,
                  }))
                }
                placeholder="decentralchain-news-and-updates"
                className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>

          {/* Credit Authors Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setConfig((p) => ({
                  ...p,
                  creditAuthors: !p.creditAuthors,
                }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.creditAuthors ? "bg-primary/60" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  config.creditAuthors ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm text-foreground">
              Credit commit authors by name in blog posts
            </span>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Custom AI Instructions (optional)
            </label>
            <textarea
              value={config.customInstructions}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  customInstructions: e.target.value,
                }))
              }
              rows={4}
              placeholder="Add any special instructions for the AI writer, e.g. 'Always mention the DCC token price impact' or 'Focus on security improvements'"
              className="w-full rounded-lg border border-white/[0.08] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/40 resize-y"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Configuration"}
            </button>
            {saved && (
              <span className="text-sm text-green-400">Saved!</span>
            )}
          </div>
        </div>
      )}

      {/* ─── Run Now Tab ─── */}
      {tab === "run" && (
        <div className="rounded-xl border border-white/[0.06] bg-surface p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!automation.enabled && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              This automation is disabled. Enable it from the main list to run.
            </div>
          )}

          {/* Step 1: Select Repos */}
          {runStep === "repos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  1. Select Repositories
                </h3>
                <button
                  onClick={handleLoadRepos}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {isPending && repos.length === 0
                    ? "Loading..."
                    : repos.length > 0
                      ? "Refresh"
                      : "Load Repos"}
                </button>
              </div>

              {repos.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>
                      {repos.length} repos &middot; {selectedRepos.size}{" "}
                      selected
                    </span>
                    <button
                      onClick={() =>
                        setSelectedRepos(new Set(repos.map((r) => r.name)))
                      }
                      className="text-primary hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedRepos(new Set())}
                      className="text-primary hover:underline"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {repos.map((repo) => (
                      <label
                        key={repo.name}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedRepos.has(repo.name)
                            ? "border-primary/30 bg-primary/5"
                            : "border-white/[0.06] hover:border-white/[0.12]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRepos.has(repo.name)}
                          onChange={() => toggleRepo(repo.name)}
                          className="mt-0.5 accent-[#00E5FF]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p className="text-xs text-muted truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                            {repo.language && <span>{repo.language}</span>}
                            <span>
                              Pushed{" "}
                              {new Date(repo.pushed_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleScanCommits}
                      disabled={isPending || selectedRepos.size === 0}
                      className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isPending
                        ? "Scanning..."
                        : `Scan ${selectedRepos.size} Repos`}
                    </button>
                  </div>
                </>
              )}

              {repos.length === 0 && !isPending && (
                <div className="text-center py-12 text-muted text-sm">
                  Click &quot;Load Repos&quot; to fetch repositories from the
                  Decentral-America org.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review Commits */}
          {(runStep === "commits" || runStep === "generating") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  2. Review Commits
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>
                    {totalCommits} commits across {commitGroups.length} repos
                    &middot; {totalSelectedCommits()} selected
                  </span>
                  <button
                    onClick={resetRun}
                    className="text-primary hover:underline"
                  >
                    Start Over
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {commitGroups.map((group) => (
                  <div
                    key={group.repo}
                    className="rounded-lg border border-white/[0.06]"
                  >
                    <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {group.repo}
                        </span>
                        <span className="text-xs text-muted">
                          ({group.commits.length} commits)
                        </span>
                      </div>
                      <a
                        href={group.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View on GitHub &rarr;
                      </a>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {group.commits.map((commit) => {
                        const repoSet = selectedCommits.get(group.repo);
                        const isSelected = repoSet?.has(commit.sha) || false;
                        return (
                          <label
                            key={commit.sha}
                            className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                              isSelected ? "bg-primary/[0.03]" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleCommit(group.repo, commit.sha)
                              }
                              className="mt-0.5 accent-[#00E5FF]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-foreground/90 truncate">
                                {commit.commit.message.split("\n")[0]}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                                <span>{commit.commit.author.name}</span>
                                <span>
                                  {new Date(
                                    commit.commit.author.date
                                  ).toLocaleDateString()}
                                </span>
                                <code className="text-[10px] text-muted/60">
                                  {commit.sha.slice(0, 7)}
                                </code>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={
                    isPending ||
                    totalSelectedCommits() === 0 ||
                    !automation.enabled
                  }
                  className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {runStep === "generating"
                    ? "Generating Blog Post..."
                    : `Generate Blog Post (${totalSelectedCommits()} commits)`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {runStep === "done" && runResult && (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-3xl">
                ✅
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Blog Post Created
              </h3>
              <p className="text-sm text-muted">
                A draft post has been generated and saved. Review it before
                publishing.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href={`/admin/blog/${runResult.postId}/edit`}
                  className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Edit Draft
                </Link>
                <button
                  onClick={resetRun}
                  className="px-5 py-2.5 rounded-lg border border-white/[0.08] text-foreground/70 text-sm font-medium hover:bg-white/[0.04] transition-colors"
                >
                  Run Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── History Tab ─── */}
      {tab === "history" && (
        <div className="rounded-xl border border-white/[0.06] bg-surface overflow-hidden">
          {automation.runs.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">
              No runs yet. Go to &quot;Run Now&quot; to execute this automation.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {automation.runs.map((run) => (
                  <tr key={run.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                          run.status === "success"
                            ? "bg-green-500/10 text-green-400"
                            : run.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            run.status === "success"
                              ? "bg-green-400"
                              : run.status === "error"
                                ? "bg-red-400"
                                : "bg-yellow-400"
                          }`}
                        />
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 max-w-xs truncate">
                      {run.message || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {run.resultPostId && (
                        <Link
                          href={`/admin/blog/${run.resultPostId}/edit`}
                          className="text-primary hover:underline text-xs"
                        >
                          Edit post
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
