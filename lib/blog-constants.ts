import { BlogCategory, BlogAudienceLevel, BlogSearchIntent, BlogContentType } from "./blog-types";

export const BLOG_POSTS_PER_PAGE = 9;

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  [BlogCategory.AI_AGENTS]: "AI Agents",
  [BlogCategory.TRADING_BOTS]: "Trading Bots",
  [BlogCategory.AUTOMATION]: "Automation",
  [BlogCategory.TUTORIALS]: "Tutorials",
  [BlogCategory.INDUSTRY_NEWS]: "Industry News",
  [BlogCategory.WEB3]: "Web3",
};

export const BLOG_CATEGORY_ICONS: Record<BlogCategory, string> = {
  [BlogCategory.AI_AGENTS]: "🤖",
  [BlogCategory.TRADING_BOTS]: "📈",
  [BlogCategory.AUTOMATION]: "⚡",
  [BlogCategory.TUTORIALS]: "📚",
  [BlogCategory.INDUSTRY_NEWS]: "📰",
  [BlogCategory.WEB3]: "🔗",
};

export const BLOG_AUDIENCE_LABELS: Record<BlogAudienceLevel, string> = {
  [BlogAudienceLevel.BEGINNER]: "Beginner",
  [BlogAudienceLevel.INTERMEDIATE]: "Intermediate",
  [BlogAudienceLevel.ADVANCED]: "Advanced",
};

export const BLOG_SEARCH_INTENT_LABELS: Record<BlogSearchIntent, string> = {
  [BlogSearchIntent.INFORMATIONAL]: "Informational",
  [BlogSearchIntent.COMMERCIAL]: "Commercial",
  [BlogSearchIntent.NAVIGATIONAL]: "Navigational",
};

export const BLOG_CONTENT_TYPE_LABELS: Record<BlogContentType, string> = {
  [BlogContentType.PILLAR]: "Pillar",
  [BlogContentType.SUPPORTING]: "Supporting",
};
