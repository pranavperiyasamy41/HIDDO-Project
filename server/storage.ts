import {
  users,
  posts,
  stories,
  comments,
  likes,
  explorers,
  saves,
  storyViews,
  notifications,
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
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private posts: Map<string, Post> = new Map();
  private stories: Map<string, Story> = new Map();
  private comments: Map<string, Comment> = new Map();
  private likes: Map<string, Like> = new Map();
  private explorers: Map<string, Explorer> = new Map();
  private saves: Map<string, Save> = new Map();
  private storyViews: Map<string, any> = new Map();
  private notifications: Map<string, Notification> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = Array.from(this.users.values()).find(u => u.id === userData.id);
    
    if (existingUser) {
      const updated = { ...existingUser, ...userData, updatedAt: new Date() };
      this.users.set(existingUser.id, updated);
      return updated;
    } else {
      const id = userData.id || randomUUID();
      const user: User = {
        ...userData,
        id,
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
      this.users.set(id, user);
      return user;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    const id = randomUUID();
    const post: Post = {
      ...postData,
      id,
      description: postData.description || null,
      location: postData.location || null,
      latitude: postData.latitude || null,
      longitude: postData.longitude || null,
      categories: postData.categories || null,
      musicUrl: postData.musicUrl || null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getFeedPosts(userId: string, limit = 20): Promise<Post[]> {
    // Get posts from user's explorers and own posts
    const userExplorers = await this.getUserFollowing(userId);
    const explorerIds = userExplorers.map(u => u.id);
    explorerIds.push(userId);

    return Array.from(this.posts.values())
      .filter(post => explorerIds.includes(post.userId) && post.visibility !== 'private')
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  async getNearbyPosts(latitude: number, longitude: number, radiusKm = 10): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => {
        if (!post.latitude || !post.longitude) return false;
        // Simple distance calculation (not perfectly accurate but good enough for demo)
        const latDiff = Math.abs(post.latitude - latitude);
        const lonDiff = Math.abs(post.longitude - longitude);
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Rough km conversion
        return distance <= radiusKm;
      })
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updated = { ...post, ...updates, updatedAt: new Date() };
    this.posts.set(id, updated);
    return updated;
  }

  async deletePost(id: string): Promise<boolean> {
    return this.posts.delete(id);
  }

  // Story operations
  async createStory(storyData: InsertStory): Promise<Story> {
    const id = randomUUID();
    const story: Story = {
      ...storyData,
      id,
      viewCount: 0,
      createdAt: new Date(),
    };
    this.stories.set(id, story);
    return story;
  }

  async getUserStories(userId: string): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values())
      .filter(story => story.userId === userId && story.expiresAt > now)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getActiveStories(): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values())
      .filter(story => story.expiresAt > now)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async deleteExpiredStories(): Promise<void> {
    const now = new Date();
    Array.from(this.stories.entries()).forEach(([id, story]) => {
      if (story.expiresAt <= now) {
        this.stories.delete(id);
      }
    });
  }

  // Social interactions
  async createLike(likeData: InsertLike): Promise<Like> {
    const id = randomUUID();
    const like: Like = {
      ...likeData,
      id,
      createdAt: new Date(),
    };
    this.likes.set(id, like);
    
    // Update post like count
    const post = this.posts.get(likeData.postId);
    if (post) {
      await this.updatePost(post.id, { likeCount: (post.likeCount || 0) + 1 });
    }
    
    return like;
  }

  async removeLike(userId: string, postId: string): Promise<boolean> {
    const like = Array.from(this.likes.values())
      .find(l => l.userId === userId && l.postId === postId);
    
    if (!like) return false;
    
    this.likes.delete(like.id);
    
    // Update post like count
    const post = this.posts.get(postId);
    if (post && post.likeCount! > 0) {
      await this.updatePost(post.id, { likeCount: post.likeCount! - 1 });
    }
    
    return true;
  }

  async getUserLike(userId: string, postId: string): Promise<Like | undefined> {
    return Array.from(this.likes.values())
      .find(like => like.userId === userId && like.postId === postId);
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const comment: Comment = {
      ...commentData,
      id,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    
    // Update post comment count
    const post = this.posts.get(commentData.postId);
    if (post) {
      await this.updatePost(post.id, { commentCount: (post.commentCount || 0) + 1 });
    }
    
    return comment;
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createExplorerConnection(explorerData: InsertExplorer): Promise<Explorer> {
    const id = randomUUID();
    const explorer: Explorer = {
      ...explorerData,
      id,
      createdAt: new Date(),
    };
    this.explorers.set(id, explorer);
    return explorer;
  }

  async getExplorerConnection(followerId: string, followingId: string): Promise<Explorer | undefined> {
    return Array.from(this.explorers.values())
      .find(e => e.followerId === followerId && e.followingId === followingId);
  }

  async getUserExplorers(userId: string): Promise<User[]> {
    const explorerConnections = Array.from(this.explorers.values())
      .filter(e => e.followingId === userId && e.status === 'accepted');
    
    const explorerIds = explorerConnections.map(e => e.followerId);
    return Array.from(this.users.values()).filter(user => explorerIds.includes(user.id));
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    const followingConnections = Array.from(this.explorers.values())
      .filter(e => e.followerId === userId && e.status === 'accepted');
    
    const followingIds = followingConnections.map(e => e.followingId);
    return Array.from(this.users.values()).filter(user => followingIds.includes(user.id));
  }

  async getPendingExplorerRequests(userId: string): Promise<Explorer[]> {
    return Array.from(this.explorers.values())
      .filter(e => e.followingId === userId && e.status === 'pending');
  }

  async updateExplorerStatus(id: string, status: string): Promise<Explorer | undefined> {
    const explorer = this.explorers.get(id);
    if (!explorer) return undefined;
    
    const updated = { ...explorer, status };
    this.explorers.set(id, updated);
    return updated;
  }

  async createSave(saveData: InsertSave): Promise<Save> {
    const id = randomUUID();
    const save: Save = {
      ...saveData,
      id,
      createdAt: new Date(),
    };
    this.saves.set(id, save);
    return save;
  }

  async removeSave(userId: string, postId: string): Promise<boolean> {
    const save = Array.from(this.saves.values())
      .find(s => s.userId === userId && s.postId === postId);
    
    if (!save) return false;
    return this.saves.delete(save.id);
  }

  async getUserSaves(userId: string): Promise<Post[]> {
    const userSaves = Array.from(this.saves.values())
      .filter(save => save.userId === userId);
    
    const postIds = userSaves.map(save => save.postId);
    return Array.from(this.posts.values())
      .filter(post => postIds.includes(post.id))
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...notificationData,
      id,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    const updated = { ...notification, isRead: true };
    this.notifications.set(id, updated);
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead);
    
    userNotifications.forEach(notification => {
      const updated = { ...notification, isRead: true };
      this.notifications.set(notification.id, updated);
    });
    
    return true;
  }
}

export const storage = new MemStorage();
