import type { GitHubScannerConfig } from "./actions/automations";

export const AUTOMATION_TYPES = [
  {
    type: "github_scanner",
    label: "GitHub Commit Scanner",
    description:
      "Scans Decentral-America GitHub repos for recent commits and generates a blog post about the changes.",
    icon: "🤖",
  },
] as const;

export const DEFAULT_GITHUB_SCANNER_CONFIG: GitHubScannerConfig = {
  repos: [],
  sinceDays: 30,
  wordCountMin: 900,
  wordCountMax: 1500,
  tone: "friendly",
  audienceLevel: "BEGINNER",
  blogCategory: "INDUSTRY_NEWS",
  authorName: "DecentralChain Editorial",
  creditAuthors: true,
  customInstructions: "",
  pillarSlug: "decentralchain-news-and-updates",
};
