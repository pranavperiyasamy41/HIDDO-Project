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
  type VerificationToken,
  type InsertVerificationToken,
  type PendingUser,
  type InsertPendingUser,
  type VerificationSession,
  type InsertVerificationSession,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

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

  // Email verification
  createVerificationToken(token: InsertVerificationToken): Promise<VerificationToken>;
  getVerificationToken(token: string): Promise<VerificationToken | undefined>;
  getVerificationTokenByEmail(email: string): Promise<VerificationToken | undefined>;
  deleteVerificationToken(token: string): Promise<boolean>;
  deleteVerificationTokensByEmail(email: string): Promise<number>;
  
  // Pending users
  createPendingUser(user: InsertPendingUser): Promise<PendingUser>;
  getPendingUserByEmail(email: string): Promise<PendingUser | undefined>;
  deletePendingUser(email: string): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updatePendingUserProfile(email: string, profileData: { firstName: string; lastName: string }): Promise<boolean>;
  updatePendingUserVerification(email: string, isVerified: boolean): Promise<boolean>;
  
  // Verification sessions
  createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession>;
  getVerificationSession(sessionToken: string): Promise<VerificationSession | undefined>;
  markVerificationSessionUsed(sessionToken: string): Promise<boolean>;
  deleteVerificationSession(sessionToken: string): Promise<boolean>;
  
  // Rate limiting
  checkEmailSignupRateLimit(email: string): Promise<{ allowed: boolean; retryAfter?: number }>;
  recordEmailSignupAttempt(email: string): Promise<void>;
  checkVerificationRateLimit(email: string): Promise<{ allowed: boolean; locked: boolean; retryAfter?: number }>;
  recordVerificationAttempt(email: string, success: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private posts: Map<string, Post> = new Map();
  private stories: Map<string, Story> = new Map();
  private comments: Map<string, Comment> = new Map();
  private likes: Map<string, Like> = new Map();
  private explorers: Map<string, Explorer> = new Map();
  private saves: Map<string, Save> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private storyViews: Map<string, StoryView> = new Map();
  private verificationTokens: Map<string, VerificationToken> = new Map();
  private pendingUsers: Map<string, PendingUser> = new Map();
  private verificationSessions: Map<string, VerificationSession> = new Map();
  
  // Rate limiting storage
  private emailSignupAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private verifyAttempts: Map<string, { count: number; lastAttempt: Date; locked: boolean; lockUntil?: Date }> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = Array.from(this.users.values()).find(
      u => u.externalId === userData.id
    );
    
    if (existingUser) {
      const updated: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(existingUser.id, updated);
      return updated;
    } else {
      const user: User = {
        id: userData.id || randomUUID(),
        externalId: userData.id || null,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        username: userData.username || null,
        displayName: userData.displayName || null,
        bio: userData.bio || null,
        location: userData.location || null,
        gender: userData.gender || null,
        isVerified: userData.isVerified || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(user.id, user);
      return user;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    const post: Post = {
      id: randomUUID(),
      userId: postData.userId,
      title: postData.title,
      description: postData.description || null,
      location: postData.location || null,
      latitude: postData.latitude || null,
      longitude: postData.longitude || null,
      categories: postData.categories,
      imageUrls: postData.imageUrls,
      musicUrl: postData.musicUrl || null,
      visibility: postData.visibility,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.set(post.id, post);
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFeedPosts(userId: string, limit = 20): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(p => p.userId === userId || p.visibility === "everyone")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getNearbyPosts(latitude: number, longitude: number, radiusKm = 10): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(p => p.latitude !== null && p.longitude !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updated = {
      ...post,
      ...updates,
      updatedAt: new Date(),
    };
    this.posts.set(id, updated);
    return updated;
  }

  async deletePost(id: string): Promise<boolean> {
    return this.posts.delete(id);
  }

  // Story operations
  async createStory(storyData: InsertStory): Promise<Story> {
    const story: Story = {
      id: randomUUID(),
      userId: storyData.userId,
      mediaUrl: storyData.mediaUrl,
      mediaType: storyData.mediaType,
      location: storyData.location || null,
      latitude: storyData.latitude || null,
      longitude: storyData.longitude || null,
      expiresAt: storyData.expiresAt,
      viewCount: 0,
      createdAt: new Date(),
    };
    this.stories.set(story.id, story);
    return story;
  }

  async getUserStories(userId: string): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values())
      .filter(s => s.userId === userId && s.expiresAt >= now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActiveStories(): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values())
      .filter(s => s.expiresAt >= now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteExpiredStories(): Promise<void> {
    const now = new Date();
    for (const [id, story] of Array.from(this.stories.entries())) {
      if (story.expiresAt < now) {
        this.stories.delete(id);
      }
    }
  }

  // Social interactions
  async createLike(likeData: InsertLike): Promise<Like> {
    const like: Like = {
      id: randomUUID(),
      ...likeData,
      createdAt: new Date(),
    };
    this.likes.set(like.id, like);
    
    // Update post like count
    const post = this.posts.get(likeData.postId);
    if (post) {
      post.likeCount += 1;
      this.posts.set(post.id, post);
    }
    
    return like;
  }

  async removeLike(userId: string, postId: string): Promise<boolean> {
    const like = Array.from(this.likes.values()).find(
      l => l.userId === userId && l.postId === postId
    );
    
    if (!like) return false;
    
    this.likes.delete(like.id);
    
    // Update post like count
    const post = this.posts.get(postId);
    if (post) {
      post.likeCount = Math.max(0, post.likeCount - 1);
      this.posts.set(post.id, post);
    }
    
    return true;
  }

  async getUserLike(userId: string, postId: string): Promise<Like | undefined> {
    return Array.from(this.likes.values()).find(
      l => l.userId === userId && l.postId === postId
    );
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const comment: Comment = {
      id: randomUUID(),
      postId: commentData.postId,
      userId: commentData.userId,
      content: commentData.content,
      parentId: commentData.parentId || null,
      createdAt: new Date(),
    };
    this.comments.set(comment.id, comment);
    
    // Update post comment count
    const post = this.posts.get(commentData.postId);
    if (post) {
      post.commentCount += 1;
      this.posts.set(post.id, post);
    }
    
    return comment;
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createExplorerConnection(explorerData: InsertExplorer): Promise<Explorer> {
    const explorer: Explorer = {
      id: randomUUID(),
      ...explorerData,
      createdAt: new Date(),
    };
    this.explorers.set(explorer.id, explorer);
    return explorer;
  }

  async getExplorerConnection(followerId: string, followingId: string): Promise<Explorer | undefined> {
    return Array.from(this.explorers.values()).find(
      e => e.followerId === followerId && e.followingId === followingId
    );
  }

  async getUserExplorers(userId: string): Promise<User[]> {
    const explorerConnections = Array.from(this.explorers.values())
      .filter(e => e.followingId === userId && e.status === "accepted");
    
    return explorerConnections
      .map(e => this.users.get(e.followerId))
      .filter((user): user is User => user !== undefined);
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    const followingConnections = Array.from(this.explorers.values())
      .filter(e => e.followerId === userId && e.status === "accepted");
    
    return followingConnections
      .map(e => this.users.get(e.followingId))
      .filter((user): user is User => user !== undefined);
  }

  async getPendingExplorerRequests(userId: string): Promise<Explorer[]> {
    return Array.from(this.explorers.values())
      .filter(e => e.followingId === userId && e.status === "pending");
  }

  async updateExplorerStatus(id: string, status: string): Promise<Explorer | undefined> {
    const explorer = this.explorers.get(id);
    if (!explorer) return undefined;
    
    const updated = { ...explorer, status };
    this.explorers.set(id, updated);
    return updated;
  }

  async createSave(saveData: InsertSave): Promise<Save> {
    const save: Save = {
      id: randomUUID(),
      ...saveData,
      createdAt: new Date(),
    };
    this.saves.set(save.id, save);
    return save;
  }

  async removeSave(userId: string, postId: string): Promise<boolean> {
    const save = Array.from(this.saves.values()).find(
      s => s.userId === userId && s.postId === postId
    );
    
    if (!save) return false;
    this.saves.delete(save.id);
    return true;
  }

  async getUserSaves(userId: string): Promise<Post[]> {
    const userSaves = Array.from(this.saves.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return userSaves
      .map(s => this.posts.get(s.postId))
      .filter((post): post is Post => post !== undefined);
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      id: randomUUID(),
      ...notificationData,
      data: notificationData.data || {},
      createdAt: new Date(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    for (const [id, notification] of Array.from(this.notifications.entries())) {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        this.notifications.set(id, notification);
      }
    }
    return true;
  }

  // Email verification methods
  async createVerificationToken(tokenData: InsertVerificationToken): Promise<VerificationToken> {
    const token: VerificationToken = {
      id: randomUUID(),
      email: tokenData.email,
      token: tokenData.token,
      type: tokenData.type,
      expiresAt: tokenData.expiresAt,
      createdAt: new Date(),
    };
    this.verificationTokens.set(token.token, token);
    return token;
  }

  async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const verificationToken = this.verificationTokens.get(token);
    if (!verificationToken) return undefined;
    
    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      this.verificationTokens.delete(token);
      return undefined;
    }
    
    return verificationToken;
  }

  async getVerificationTokenByEmail(email: string): Promise<VerificationToken | undefined> {
    const verificationToken = Array.from(this.verificationTokens.values())
      .find(token => token.email === email);
    
    if (!verificationToken) return undefined;
    
    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      this.verificationTokens.delete(verificationToken.token);
      return undefined;
    }
    
    return verificationToken;
  }

  async deleteVerificationToken(token: string): Promise<boolean> {
    return this.verificationTokens.delete(token);
  }

  async deleteVerificationTokensByEmail(email: string): Promise<number> {
    let deletedCount = 0;
    for (const [token, verificationToken] of Array.from(this.verificationTokens.entries())) {
      if (verificationToken.email === email) {
        this.verificationTokens.delete(token);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  // Pending users methods
  async createPendingUser(userData: InsertPendingUser): Promise<PendingUser> {
    // Check if user already exists
    const existingUser = this.pendingUsers.get(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    // Check if verified user already exists
    const verifiedUser = await this.getUserByEmail(userData.email);
    if (verifiedUser) {
      throw new Error("User with this email already exists");
    }
    
    const user: PendingUser = {
      id: randomUUID(),
      email: userData.email,
      isVerified: userData.isVerified ?? false,
      createdAt: new Date(),
    };
    this.pendingUsers.set(user.email, user);
    return user;
  }

  async getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
    return this.pendingUsers.get(email);
  }

  async deletePendingUser(email: string): Promise<boolean> {
    return this.pendingUsers.delete(email);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async updatePendingUserProfile(email: string, profileData: { firstName: string; lastName: string }): Promise<boolean> {
    const pendingUser = this.pendingUsers.get(email);
    if (!pendingUser) return false;
    
    const updated = { 
      ...pendingUser, 
      firstName: profileData.firstName,
      lastName: profileData.lastName,
    };
    this.pendingUsers.set(email, updated);
    return true;
  }

  async updatePendingUserVerification(email: string, isVerified: boolean): Promise<boolean> {
    const pendingUser = this.pendingUsers.get(email);
    if (!pendingUser) return false;
    
    const updated = { ...pendingUser, isVerified };
    this.pendingUsers.set(email, updated);
    return true;
  }

  // Verification sessions methods
  async createVerificationSession(sessionData: InsertVerificationSession): Promise<VerificationSession> {
    const session: VerificationSession = {
      id: randomUUID(),
      email: sessionData.email,
      sessionToken: sessionData.sessionToken,
      expiresAt: sessionData.expiresAt,
      used: sessionData.used ?? false,
      createdAt: new Date(),
    };
    this.verificationSessions.set(session.sessionToken, session);
    return session;
  }

  async getVerificationSession(sessionToken: string): Promise<VerificationSession | undefined> {
    const session = this.verificationSessions.get(sessionToken);
    if (!session) return undefined;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.verificationSessions.delete(sessionToken);
      return undefined;
    }
    
    // Check if session is already used
    if (session.used) {
      return undefined;
    }
    
    return session;
  }

  async markVerificationSessionUsed(sessionToken: string): Promise<boolean> {
    const session = this.verificationSessions.get(sessionToken);
    if (!session) return false;
    
    const updated = { ...session, used: true };
    this.verificationSessions.set(sessionToken, updated);
    return true;
  }

  async deleteVerificationSession(sessionToken: string): Promise<boolean> {
    return this.verificationSessions.delete(sessionToken);
  }

  // Rate limiting methods
  async checkEmailSignupRateLimit(email: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = new Date();
    const attempts = this.emailSignupAttempts.get(email);
    
    if (!attempts) {
      return { allowed: true };
    }
    
    // Reset count if more than 1 hour has passed
    const hoursSinceLastAttempt = (now.getTime() - attempts.lastAttempt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastAttempt >= 1) {
      this.emailSignupAttempts.delete(email);
      return { allowed: true };
    }
    
    // Limit to 5 attempts per hour
    if (attempts.count >= 5) {
      const retryAfter = Math.ceil((attempts.lastAttempt.getTime() + (60 * 60 * 1000) - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }
    
    // Enforce 60-second cooldown between attempts
    const secondsSinceLastAttempt = (now.getTime() - attempts.lastAttempt.getTime()) / 1000;
    if (secondsSinceLastAttempt < 60) {
      const retryAfter = Math.ceil(60 - secondsSinceLastAttempt);
      return { allowed: false, retryAfter };
    }
    
    return { allowed: true };
  }

  async recordEmailSignupAttempt(email: string): Promise<void> {
    const now = new Date();
    const attempts = this.emailSignupAttempts.get(email);
    
    if (!attempts) {
      this.emailSignupAttempts.set(email, { count: 1, lastAttempt: now });
    } else {
      // Reset count if more than 1 hour has passed
      const hoursSinceLastAttempt = (now.getTime() - attempts.lastAttempt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt >= 1) {
        this.emailSignupAttempts.set(email, { count: 1, lastAttempt: now });
      } else {
        this.emailSignupAttempts.set(email, { count: attempts.count + 1, lastAttempt: now });
      }
    }
  }

  async checkVerificationRateLimit(email: string): Promise<{ allowed: boolean; locked: boolean; retryAfter?: number }> {
    const now = new Date();
    const attempts = this.verifyAttempts.get(email);
    
    if (!attempts) {
      return { allowed: true, locked: false };
    }
    
    // Check if account is locked
    if (attempts.locked && attempts.lockUntil && now < attempts.lockUntil) {
      const retryAfter = Math.ceil((attempts.lockUntil.getTime() - now.getTime()) / 1000);
      return { allowed: false, locked: true, retryAfter };
    }
    
    // Reset lock if lockout period has passed
    if (attempts.locked && attempts.lockUntil && now >= attempts.lockUntil) {
      this.verifyAttempts.set(email, { count: 0, lastAttempt: now, locked: false });
      return { allowed: true, locked: false };
    }
    
    // Reset count if more than 15 minutes has passed
    const minutesSinceLastAttempt = (now.getTime() - attempts.lastAttempt.getTime()) / (1000 * 60);
    if (minutesSinceLastAttempt >= 15) {
      this.verifyAttempts.set(email, { count: 0, lastAttempt: now, locked: false });
      return { allowed: true, locked: false };
    }
    
    return { allowed: true, locked: false };
  }

  async recordVerificationAttempt(email: string, success: boolean): Promise<void> {
    const now = new Date();
    const attempts = this.verifyAttempts.get(email);
    
    if (success) {
      // Clear attempts on successful verification
      this.verifyAttempts.delete(email);
      return;
    }
    
    if (!attempts) {
      this.verifyAttempts.set(email, { count: 1, lastAttempt: now, locked: false });
    } else {
      const newCount = attempts.count + 1;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (newCount >= 5) {
        const lockUntil = new Date(now.getTime() + 15 * 60 * 1000);
        this.verifyAttempts.set(email, { count: newCount, lastAttempt: now, locked: true, lockUntil });
      } else {
        this.verifyAttempts.set(email, { count: newCount, lastAttempt: now, locked: false });
      }
    }
  }
}

export const storage = new MemStorage();