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

export const insertVerificationTokenSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^[0-9]{6}$/, "Token must be exactly 6 digits"),
  type: z.enum(["email_verification", "password_reset"]).default("email_verification"),
  expiresAt: z.coerce.date(),
});

export const insertPendingUserSchema = z.object({
  email: z.string().email(),
  isVerified: z.boolean().default(false),
});

export const completeProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  verificationSession: z.string().min(1, "Verification session required"),
});

export const insertVerificationSessionSchema = z.object({
  email: z.string().email(),
  sessionToken: z.string(),
  expiresAt: z.coerce.date(),
  used: z.boolean().default(false),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^[0-9]{6}$/, "Token must be exactly 6 digits"),
});

export const completeAccountSchema = z.object({
  verificationSession: z.string().min(1, "Verification session required"),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"]).optional(),
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
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type InsertPendingUser = z.infer<typeof insertPendingUserSchema>;
export type CompleteProfile = z.infer<typeof completeProfileSchema>;
export type InsertVerificationSession = z.infer<typeof insertVerificationSessionSchema>;

// Simple types for verification tokens and pending users (since not in Prisma)
export interface VerificationToken {
  id: string;
  email: string;
  token: string;
  type: "email_verification" | "password_reset";
  expiresAt: Date;
  createdAt: Date;
}

export interface PendingUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface VerificationSession {
  id: string;
  email: string;
  sessionToken: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}