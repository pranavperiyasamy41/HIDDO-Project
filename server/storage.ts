import {
  type User,
  type UpsertUser,
  type Post,
  type InsertPost,
  type Story,
  type InsertStory,
  type Comment,
  type InsertComment,
  type Like,
  type InsertLike,
  type Explorer,
  type InsertExplorer,
  type Save,
  type InsertSave,
  type Notification,
  type InsertNotification,
  type StoryView,
  type InsertStoryView,
} from "@shared/schema";
import { PrismaClient } from "../generated/prisma";
import { randomUUID } from "crypto";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mongodb://localhost:27017/myapp"
    }
  }
});

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getUserPosts(userId: string): Promise<Post[]>;
  getFeedPosts(userId: string, limit?: number): Promise<Post[]>;
  getNearbyPosts(latitude: number, longitude: number, radiusKm?: number): Promise<Post[]>;
  updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  
  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getUserStories(userId: string): Promise<Story[]>;
  getActiveStories(): Promise<Story[]>;
  deleteExpiredStories(): Promise<void>;
  
  // Social interactions
  createLike(like: InsertLike): Promise<Like>;
  removeLike(userId: string, postId: string): Promise<boolean>;
  getUserLike(userId: string, postId: string): Promise<Like | undefined>;
  
  createComment(comment: InsertComment): Promise<Comment>;
  getPostComments(postId: string): Promise<Comment[]>;
  
  createExplorerConnection(explorer: InsertExplorer): Promise<Explorer>;
  getExplorerConnection(followerId: string, followingId: string): Promise<Explorer | undefined>;
  getUserExplorers(userId: string): Promise<User[]>;
  getUserFollowing(userId: string): Promise<User[]>;
  getPendingExplorerRequests(userId: string): Promise<Explorer[]>;
  updateExplorerStatus(id: string, status: string): Promise<Explorer | undefined>;
  
  createSave(save: InsertSave): Promise<Save>;
  removeSave(userId: string, postId: string): Promise<boolean>;
  getUserSaves(userId: string): Promise<Post[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
}

export class PrismaStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = await prisma.user.upsert({
      where: { externalId: userData.id || "" },
      update: {
        ...userData,
        updatedAt: new Date(),
      },
      create: {
        id: userData.id || crypto.randomUUID(),
        externalId: userData.id,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { username }
    });
    return user || undefined;
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    const post = await prisma.post.create({
      data: {
        id: randomUUID(),
        ...postData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const post = await prisma.post.findUnique({
      where: { id }
    });
    return post || undefined;
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async getFeedPosts(userId: string, limit = 20): Promise<Post[]> {
    return await prisma.post.findMany({
      where: {
        OR: [
          { userId },
          { visibility: "everyone" }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }

  async getNearbyPosts(latitude: number, longitude: number, radiusKm = 10): Promise<Post[]> {
    // Simple proximity query - in production, you'd use MongoDB geospatial queries
    return await prisma.post.findMany({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    try {
      const post = await prisma.post.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date(),
        }
      });
      return post;
    } catch {
      return undefined;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      await prisma.post.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  // Story operations
  async createStory(storyData: InsertStory): Promise<Story> {
    const story = await prisma.story.create({
      data: {
        id: randomUUID(),
        ...storyData,
        createdAt: new Date(),
      }
    });
    return story;
  }

  async getUserStories(userId: string): Promise<Story[]> {
    return await prisma.story.findMany({
      where: { 
        userId,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getActiveStories(): Promise<Story[]> {
    return await prisma.story.findMany({
      where: {
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async deleteExpiredStories(): Promise<void> {
    await prisma.story.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }

  // Social interactions
  async createLike(likeData: InsertLike): Promise<Like> {
    const like = await prisma.like.create({
      data: {
        id: randomUUID(),
        ...likeData,
        createdAt: new Date(),
      }
    });
    
    // Update post like count
    await prisma.post.update({
      where: { id: likeData.postId },
      data: {
        likeCount: { increment: 1 }
      }
    });
    
    return like;
  }

  async removeLike(userId: string, postId: string): Promise<boolean> {
    try {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      
      // Update post like count
      await prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 }
        }
      });
      
      return true;
    } catch {
      return false;
    }
  }

  async getUserLike(userId: string, postId: string): Promise<Like | undefined> {
    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });
    return like || undefined;
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const comment = await prisma.comment.create({
      data: {
        id: randomUUID(),
        ...commentData,
        createdAt: new Date(),
      }
    });
    
    // Update post comment count
    await prisma.post.update({
      where: { id: commentData.postId },
      data: {
        commentCount: { increment: 1 }
      }
    });
    
    return comment;
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    return await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createExplorerConnection(explorerData: InsertExplorer): Promise<Explorer> {
    const explorer = await prisma.explorer.create({
      data: {
        id: randomUUID(),
        ...explorerData,
        createdAt: new Date(),
      }
    });
    return explorer;
  }

  async getExplorerConnection(followerId: string, followingId: string): Promise<Explorer | undefined> {
    const explorer = await prisma.explorer.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
    return explorer || undefined;
  }

  async getUserExplorers(userId: string): Promise<User[]> {
    const explorers = await prisma.explorer.findMany({
      where: {
        followingId: userId,
        status: "accepted"
      },
      include: {
        follower: true
      }
    });
    return explorers.map(e => e.follower);
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    const following = await prisma.explorer.findMany({
      where: {
        followerId: userId,
        status: "accepted"
      },
      include: {
        following: true
      }
    });
    return following.map(f => f.following);
  }

  async getPendingExplorerRequests(userId: string): Promise<Explorer[]> {
    return await prisma.explorer.findMany({
      where: {
        followingId: userId,
        status: "pending"
      }
    });
  }

  async updateExplorerStatus(id: string, status: string): Promise<Explorer | undefined> {
    try {
      const explorer = await prisma.explorer.update({
        where: { id },
        data: { status }
      });
      return explorer;
    } catch {
      return undefined;
    }
  }

  async createSave(saveData: InsertSave): Promise<Save> {
    const save = await prisma.save.create({
      data: {
        id: randomUUID(),
        ...saveData,
        createdAt: new Date(),
      }
    });
    return save;
  }

  async removeSave(userId: string, postId: string): Promise<boolean> {
    try {
      await prisma.save.delete({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserSaves(userId: string): Promise<Post[]> {
    const saves = await prisma.save.findMany({
      where: { userId },
      include: {
        post: true
      },
      orderBy: { createdAt: "desc" }
    });
    return saves.map(s => s.post);
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        id: randomUUID(),
        ...notificationData,
        data: notificationData.data || {},
        createdAt: new Date(),
      }
    });
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
      return true;
    } catch {
      return false;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { 
          userId,
          isRead: false 
        },
        data: { isRead: true }
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new PrismaStorage();