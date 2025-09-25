import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigation from "@/components/bottom-navigation";
import type { Post, User, Notification } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch user stats
  const { data: userPosts = [], isLoading: postsLoading, error: postsError } = useQuery<Post[]>({
    queryKey: [`/api/users/${user?.id}/posts`],
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading, error: notificationsError } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Handle errors
  useEffect(() => {
    if (postsError && isUnauthorizedError(postsError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    } else if (postsError) {
      toast({
        title: "Error",
        description: "Failed to load your posts",
        variant: "destructive",
      });
    }

    if (notificationsError && isUnauthorizedError(notificationsError)) {
      toast({
        title: "Unauthorized", 
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    } else if (notificationsError) {
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    }
  }, [postsError, notificationsError, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <i className="fas fa-compass text-primary-foreground text-2xl"></i>
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <i className="fas fa-tachometer-alt text-primary-foreground text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.displayName || user?.firstName || 'Explorer'}!</p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" className="relative" data-testid="button-logout" onClick={() => window.location.href = "/api/logout"}>
              <i className="fas fa-sign-out-alt text-lg"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6" data-testid="dashboard-content">
        {/* User Profile Card */}
        <Card className="mb-6" data-testid="profile-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
                    data-testid="img-profile"
                  />
                ) : (
                  <i className="fas fa-user text-primary-foreground text-xl" data-testid="icon-profile-placeholder"></i>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg" data-testid="text-display-name">
                  {user?.displayName || `${user?.firstName} ${user?.lastName}`.trim() || 'Explorer'}
                </CardTitle>
                <CardDescription data-testid="text-email">
                  {user?.email || 'No email provided'}
                </CardDescription>
                {user?.username && (
                  <p className="text-sm text-muted-foreground" data-testid="text-username">@{user.username}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6" data-testid="stats-grid">
          <Card>
            <CardContent className="p-4 text-center">
              {postsLoading ? (
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
              ) : (
                <div className="text-2xl font-bold text-primary" data-testid="text-posts-count">
                  {userPosts.length}
                </div>
              )}
              <p className="text-sm text-muted-foreground">Posts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              {notificationsLoading ? (
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
              ) : (
                <div className="text-2xl font-bold text-destructive" data-testid="text-notifications-count">
                  {unreadNotifications}
                </div>
              )}
              <p className="text-sm text-muted-foreground">Notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6" data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Get started with your exploration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/create">
              <Button className="w-full justify-start" data-testid="button-create-post">
                <i className="fas fa-plus mr-3"></i>
                Create New Post
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-profile">
                <i className="fas fa-user mr-3"></i>
                View Profile
              </Button>
            </Link>
            <Link href="/map">
              <Button variant="outline" className="w-full justify-start" data-testid="button-explore-map">
                <i className="fas fa-map mr-3"></i>
                Explore Map
              </Button>
            </Link>
            <Link href="/home">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-feed">
                <i className="fas fa-home mr-3"></i>
                View Feed
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card data-testid="recent-activity-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-bell text-muted-foreground"></i>
                </div>
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start exploring to see your activity here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification, index) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50" data-testid={`notification-${index}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.isRead ? 'bg-muted' : 'bg-primary'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" data-testid={`notification-title-${index}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`notification-message-${index}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {notifications.length > 5 && (
                  <Button variant="ghost" className="w-full text-sm" data-testid="button-view-all-notifications">
                    View all notifications
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}