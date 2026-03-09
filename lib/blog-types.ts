export {
  BlogContentType,
  BlogSearchIntent,
  BlogAudienceLevel,
  BlogOrphanStatus,
  BlogPostStatus,
  BlogCategory,
  CannibalizationRisk,
  SerpIntentMatch,
  CommentStatus,
  LinkingTaskType,
  TaskPriority,
  TaskStatus,
  LinkPlacement,
  LinkRuleStatus,
} from "./generated/prisma/enums";

import type {
  BlogPost,
  BlogComment,
  LinkingTask,
  InternalLinkRule,
} from "./generated/prisma/client";

export type { BlogPost, BlogComment, LinkingTask, InternalLinkRule };

/* ─── Composite Types ─── */

export interface BlogPostWithRelations extends BlogPost {
  pillarPage: BlogPost | null;
  childPosts: BlogPost[];
  comments: BlogComment[];
  linkingTasks: LinkingTask[];
  outgoingLinkRules: (InternalLinkRule & { toPost: BlogPost })[];
  incomingLinkRules: (InternalLinkRule & { fromPost: BlogPost })[];
  _count: { comments: number };
}

export type BlogPostListItem = Pick<
  BlogPost,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "featuredImage"
  | "authorName"
  | "status"
  | "publishedDate"
  | "wordCount"
  | "readingTime"
  | "views"
  | "blogCategory"
  | "contentType"
  | "primaryKeyword"
  | "orphanStatus"
  | "cannibalizationRisk"
> & { _count: { comments: number } };

export interface InternalLinkEntry {
  post_id: string;
  anchor_text: string;
}

export interface ExternalLinkEntry {
  url: string;
  anchor_text: string;
  nofollow: boolean;
}

export interface SEOScoreResult {
  overall: number;
  titleScore: number;
  descriptionScore: number;
  keywordDensity: number;
  readability: number;
  internalLinks: number;
  headingStructure: number;
  issues: string[];
  suggestions: string[];
}
