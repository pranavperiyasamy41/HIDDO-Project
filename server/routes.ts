import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertPostSchema,
  insertStorySchema,
  insertCommentSchema,
  insertLikeSchema,
  insertExplorerSchema,
  insertSaveSchema,
  insertNotificationSchema,
  insertPendingUserSchema,
  upsertUserSchema,
  verifyEmailSchema,
  completeAccountSchema,
  completeProfileSchema,
  insertVerificationSessionSchema,
} from "@shared/schema";
import { z } from "zod";
import { sendVerificationEmail } from "./emailService";
import { randomUUID } from "crypto";

interface AuthenticatedUser {
  claims: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email verification routes
  app.post('/api/auth/signup-email', async (req: Request, res: Response) => {
    try {
      const validatedData = insertPendingUserSchema.parse(req.body);
      
      // Normalize email
      validatedData.email = validatedData.email.toLowerCase().trim();
      
      // Check if user already exists (but don't reveal this to prevent enumeration)
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        // Return generic success message to prevent enumeration
        return res.json({ message: "If your email is valid, you'll receive a verification link shortly. Please check your inbox." });
      }
      
      // Invalidate any existing verification tokens for this email
      await storage.deleteVerificationTokensByEmail(validatedData.email);
      
      // Create pending user
      await storage.createPendingUser(validatedData);
      
      // Generate verification token
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createVerificationToken({
        email: validatedData.email,
        token,
        type: "email_verification",
        expiresAt,
      });
      
      // Send verification email
      await sendVerificationEmail(validatedData.email, token);
      
      // Always return success to prevent email enumeration
      res.json({ message: "If your email is valid, you'll receive a verification link shortly. Please check your inbox." });
    } catch (error) {
      console.error("Email signup error:", error);
      // Always return generic message to prevent email enumeration
      res.json({ message: "If your email is valid, you'll receive a verification link shortly. Please check your inbox." });
    }
  });

  app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      
      // Get and validate token
      const verificationToken = await storage.getVerificationToken(validatedData.token);
      if (!verificationToken) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }
      
      // Check token type
      if (verificationToken.type !== "email_verification") {
        return res.status(400).json({ message: "Invalid token type" });
      }
      
      // Check expiry (additional safety check)
      if (verificationToken.expiresAt < new Date()) {
        await storage.deleteVerificationToken(validatedData.token);
        return res.status(400).json({ message: "Verification token has expired" });
      }
      
      // Get pending user
      const pendingUser = await storage.getPendingUserByEmail(verificationToken.email);
      if (!pendingUser) {
        return res.status(400).json({ message: "Pending user not found" });
      }
      
      // Mark pending user as verified
      await storage.updatePendingUserVerification(verificationToken.email, true);
      
      // Create verification session for next step
      const sessionToken = randomUUID();
      const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      await storage.createVerificationSession({
        email: verificationToken.email,
        sessionToken,
        expiresAt: sessionExpiresAt,
        used: false,
      });
      
      // Delete the verification token
      await storage.deleteVerificationToken(validatedData.token);
      
      res.json({ 
        message: "Email verified successfully", 
        verificationSession: sessionToken,
        pendingUser: {
          firstName: pendingUser.firstName,
          lastName: pendingUser.lastName,
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(400).json({ message: "Invalid verification token" });
    }
  });

  app.post('/api/auth/complete-profile', async (req: Request, res: Response) => {
    try {
      const validatedData = completeProfileSchema.parse(req.body);
      
      // Get and validate verification session
      const verificationSession = await storage.getVerificationSession(validatedData.verificationSession);
      if (!verificationSession) {
        return res.status(400).json({ message: "Invalid or expired verification session" });
      }
      
      // Get pending user using email from verified session (not from request body)
      const pendingUser = await storage.getPendingUserByEmail(verificationSession.email);
      if (!pendingUser) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      if (!pendingUser.isVerified) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Check if user already has profile completed (firstName exists)
      if (pendingUser.firstName && pendingUser.lastName) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Update pending user with profile data
      const success = await storage.updatePendingUserProfile(verificationSession.email, {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });
      
      if (!success) {
        return res.status(500).json({ message: "Failed to complete profile" });
      }
      
      res.json({ 
        message: "Profile completed successfully",
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });
    } catch (error) {
      console.error("Profile completion error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  app.post('/api/auth/complete-account', async (req: Request, res: Response) => {
    try {
      const validatedData = completeAccountSchema.parse(req.body);
      
      // Normalize username
      validatedData.username = validatedData.username.toLowerCase().trim();
      
      // Get and validate verification session
      const verificationSession = await storage.getVerificationSession(validatedData.verificationSession);
      if (!verificationSession) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Get pending user using email from verified session (not from request body)
      const pendingUser = await storage.getPendingUserByEmail(verificationSession.email);
      if (!pendingUser || !pendingUser.isVerified) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Ensure profile is completed (firstName and lastName must exist)
      if (!pendingUser.firstName || !pendingUser.lastName) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Check if user already exists with this email (critical security check)
      const existingUserByEmail = await storage.getUserByEmail(verificationSession.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Invalid session" });
      }
      
      // Check if username is already taken
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      
      // Create the full user account
      const userData = {
        id: randomUUID(),
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        username: validatedData.username,
        displayName: validatedData.displayName || `${pendingUser.firstName} ${pendingUser.lastName}`.trim(),
        bio: validatedData.bio,
        location: validatedData.location,
        gender: validatedData.gender,
        isVerified: true,
      };
      
      const user = await storage.upsertUser(userData);
      
      // Mark verification session as used and clean up
      await storage.markVerificationSessionUsed(validatedData.verificationSession);
      await storage.deletePendingUser(verificationSession.email);
      
      res.json({ 
        message: "Account created successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        }
      });
    } catch (error) {
      console.error("Account completion error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to complete account setup" });
    }
  });

  // User routes
  app.get('/api/users/search', isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      
      // Simple search by username (in a real app, this would be more sophisticated)
      const user = await storage.getUserByUsername(q);
      res.json(user ? [user] : []);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/users/:id/posts', isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getUserPosts(req.params.id);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  // Post routes
  app.get('/api/posts/feed', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const posts = await storage.getFeedPosts(userId, limit);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get('/api/posts/nearby', isAuthenticated, async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = radius ? parseFloat(radius as string) : 10;
      
      const posts = await storage.getNearbyPosts(latitude, longitude, radiusKm);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching nearby posts:", error);
      res.status(500).json({ message: "Failed to fetch nearby posts" });
    }
  });

  app.post('/api/posts', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postData = insertPostSchema.parse({ ...req.body, userId });
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get('/api/posts/:id', isAuthenticated, async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.delete('/api/posts/:id', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const post = await storage.getPost(req.params.id);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (post.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }
      
      const deleted = await storage.deletePost(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Story routes
  app.get('/api/stories', isAuthenticated, async (req, res) => {
    try {
      const stories = await storage.getActiveStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post('/api/stories', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
      
      const storyData = insertStorySchema.parse({ 
        ...req.body, 
        userId,
        expiresAt 
      });
      const story = await storage.createStory(storyData);
      res.status(201).json(story);
    } catch (error) {
      console.error("Error creating story:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid story data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  // Like routes
  app.post('/api/posts/:id/like', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postId = req.params.id;
      
      // Check if already liked
      const existingLike = await storage.getUserLike(userId, postId);
      if (existingLike) {
        return res.status(400).json({ message: "Post already liked" });
      }
      
      const like = await storage.createLike({ userId, postId });
      
      // Create notification for post owner
      const post = await storage.getPost(postId);
      if (post && post.userId !== userId) {
        const user = await storage.getUser(userId);
        await storage.createNotification({
          userId: post.userId,
          type: 'like',
          title: 'New Like',
          message: `${user?.displayName || user?.username || 'Someone'} liked your post`,
          data: { postId, likeId: like.id },
          isRead: false
        });
      }
      
      res.status(201).json(like);
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ message: "Failed to like post" });
    }
  });

  app.delete('/api/posts/:id/like', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postId = req.params.id;
      
      const removed = await storage.removeLike(userId, postId);
      if (!removed) {
        return res.status(404).json({ message: "Like not found" });
      }
      
      res.json({ message: "Like removed successfully" });
    } catch (error) {
      console.error("Error unliking post:", error);
      res.status(500).json({ message: "Failed to unlike post" });
    }
  });

  // Comment routes
  app.get('/api/posts/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/posts/:id/comments', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postId = req.params.id;
      
      const commentData = insertCommentSchema.parse({ 
        ...req.body, 
        userId, 
        postId 
      });
      const comment = await storage.createComment(commentData);
      
      // Create notification for post owner
      const post = await storage.getPost(postId);
      if (post && post.userId !== userId) {
        const user = await storage.getUser(userId);
        await storage.createNotification({
          userId: post.userId,
          type: 'comment',
          title: 'New Comment',
          message: `${user?.displayName || user?.username || 'Someone'} commented on your post`,
          data: { postId, commentId: comment.id },
          isRead: false
        });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Explorer routes
  app.get('/api/explorers', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const explorers = await storage.getUserExplorers(userId);
      res.json(explorers);
    } catch (error) {
      console.error("Error fetching explorers:", error);
      res.status(500).json({ message: "Failed to fetch explorers" });
    }
  });

  app.get('/api/explorers/following', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const following = await storage.getUserFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ message: "Failed to fetch following" });
    }
  });

  app.get('/api/explorers/requests', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const requests = await storage.getPendingExplorerRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching explorer requests:", error);
      res.status(500).json({ message: "Failed to fetch explorer requests" });
    }
  });

  app.post('/api/explorers/:id/follow', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const followingId = req.params.id;
      
      if (userId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      
      // Check if already following or request exists
      const existing = await storage.getExplorerConnection(userId, followingId);
      if (existing) {
        return res.status(400).json({ message: "Connection already exists" });
      }
      
      const explorer = await storage.createExplorerConnection({
        followerId: userId,
        followingId,
        status: 'pending'
      });
      
      // Create notification for the user being followed
      const user = await storage.getUser(userId);
      await storage.createNotification({
        userId: followingId,
        type: 'explorer_request',
        title: 'New Explorer Request',
        message: `${user?.displayName || user?.username || 'Someone'} wants to be your explorer`,
        data: { explorerId: explorer.id, fromUserId: userId },
        isRead: false
      });
      
      res.status(201).json(explorer);
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.post('/api/explorers/:id/accept', isAuthenticated, async (req: Request, res) => {
    try {
      const explorer = await storage.updateExplorerStatus(req.params.id, 'accepted');
      if (!explorer) {
        return res.status(404).json({ message: "Explorer request not found" });
      }
      res.json(explorer);
    } catch (error) {
      console.error("Error accepting explorer request:", error);
      res.status(500).json({ message: "Failed to accept explorer request" });
    }
  });

  app.post('/api/explorers/:id/reject', isAuthenticated, async (req: Request, res) => {
    try {
      const explorer = await storage.updateExplorerStatus(req.params.id, 'blocked');
      if (!explorer) {
        return res.status(404).json({ message: "Explorer request not found" });
      }
      res.json(explorer);
    } catch (error) {
      console.error("Error rejecting explorer request:", error);
      res.status(500).json({ message: "Failed to reject explorer request" });
    }
  });

  // Save routes
  app.get('/api/saves', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const saves = await storage.getUserSaves(userId);
      res.json(saves);
    } catch (error) {
      console.error("Error fetching saves:", error);
      res.status(500).json({ message: "Failed to fetch saves" });
    }
  });

  app.post('/api/posts/:id/save', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postId = req.params.id;
      
      const save = await storage.createSave({ userId, postId });
      res.status(201).json(save);
    } catch (error) {
      console.error("Error saving post:", error);
      res.status(500).json({ message: "Failed to save post" });
    }
  });

  app.delete('/api/posts/:id/save', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const postId = req.params.id;
      
      const removed = await storage.removeSave(userId, postId);
      if (!removed) {
        return res.status(404).json({ message: "Save not found" });
      }
      
      res.json({ message: "Save removed successfully" });
    } catch (error) {
      console.error("Error unsaving post:", error);
      res.status(500).json({ message: "Failed to unsave post" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/read-all', isAuthenticated, async (req: Request, res) => {
    try {
      const userId = (req.user as AuthenticatedUser).claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Cleanup expired stories periodically
  setInterval(async () => {
    try {
      await storage.deleteExpiredStories();
    } catch (error) {
      console.error("Error cleaning up expired stories:", error);
    }
  }, 60000); // Every minute

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        // Echo back for now (in a real app, handle different message types)
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'ack', data }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
