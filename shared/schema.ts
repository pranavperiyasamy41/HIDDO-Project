import { z } from "zod";

// Import Prisma types
import type {
  User as PrismaUser,
  Post as PrismaPost,
  Story as PrismaStory,
  Comment as PrismaComment,
  Like as PrismaLike,
  Explorer as PrismaExplorer,
  Save as PrismaSave,
  Notification as PrismaNotification,
  Session as PrismaSession,
  StoryView as PrismaStoryView,
} from "../generated/prisma";

// Zod schemas for validation
export const upsertUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  gender: z.string().optional(),
  isVerified: z.boolean().optional(),
});

export const insertPostSchema = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  categories: z.array(z.string()).default([]),
  imageUrls: z.array(z.string()),
  musicUrl: z.string().optional(),
  visibility: z.enum(["everyone", "explorers", "private"]).default("everyone"),
});

export const insertStorySchema = z.object({
  userId: z.string(),
  mediaUrl: z.string(),
  mediaType: z.enum(["image", "video"]),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  expiresAt: z.coerce.date(),
});

export const insertCommentSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  content: z.string(),
  parentId: z.string().optional(),
});

export const insertLikeSchema = z.object({
  userId: z.string(),
  postId: z.string(),
});

export const insertExplorerSchema = z.object({
  followerId: z.string(),
  followingId: z.string(),
  status: z.enum(["pending", "accepted", "blocked"]).default("pending"),
});

export const insertSaveSchema = z.object({
  userId: z.string(),
  postId: z.string(),
});

export const insertNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(["like", "comment", "explorer_request", "story_view"]),
  title: z.string(),
  message: z.string(),
  data: z.any().optional(),
  isRead: z.boolean().default(false),
});

export const insertStoryViewSchema = z.object({
  storyId: z.string(),
  userId: z.string(),
});

// Export types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = PrismaUser;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = PrismaPost;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = PrismaStory;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = PrismaComment;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = PrismaLike;
export type InsertExplorer = z.infer<typeof insertExplorerSchema>;
export type Explorer = PrismaExplorer;
export type InsertSave = z.infer<typeof insertSaveSchema>;
export type Save = PrismaSave;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = PrismaNotification;
export type InsertStoryView = z.infer<typeof insertStoryViewSchema>;
export type StoryView = PrismaStoryView;
export type Session = PrismaSession;