import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Post, User } from "@shared/schema";

export default function Profile() {
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

  // Fetch user posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/users", user?.id, "posts"],
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch user's saved posts
  const { data: savedPosts = [], isLoading: savedLoading } = useQuery<Post[]>({
    queryKey: ["/api/saves"],
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <i className="fas fa-compass text-primary-foreground text-2xl"></i>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 flex items-center justify-between max-w-md mx-auto">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
          <i className="fas fa-arrow-left text-xl"></i>
        </Button>
        <h2 className="text-lg font-semibold">{user?.username || 'Profile'}</h2>
        <Button variant="ghost" size="sm" data-testid="button-settings">
          <i className="fas fa-cog text-xl"></i>
        </Button>
      </header>

      <div className="max-w-md mx-auto">
        {/* Profile Info */}
        <div className="p-6 text-center border-b border-border">
          <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
                data-testid="img-profile-avatar"
              />
            ) : (
              <i className="fas fa-user text-2xl text-muted-foreground"></i>
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2" data-testid="text-profile-name">
            {user?.displayName || `${user?.firstName} ${user?.lastName}` || user?.username}
          </h3>
          
          <p className="text-muted-foreground mb-4" data-testid="text-profile-bio">
            {user?.bio || 'Urban explorer & photographer 📸'}
            <br />
            {user?.location && (
              <>
                Currently in: <span className="font-medium">{user.location}</span>
              </>
            )}
          </p>
          
          {/* Stats */}
          <div className="flex justify-center space-x-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-posts-count">
                {posts.length}
              </div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-explorers-count">
                0
              </div>
              <div className="text-sm text-muted-foreground">Explorers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-following-count">
                0
              </div>
              <div className="text-sm text-muted-foreground">Following</div>
            </div>
          </div>

          <div className="flex space-x-3 justify-center">
            <Button className="flex-1" data-testid="button-edit-profile">
              Edit Profile
            </Button>
            <Button variant="outline" data-testid="button-share-profile">
              Share Profile
            </Button>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold mb-3">Achievements</h4>
          <div className="flex space-x-3 overflow-x-auto">
            <div className="flex-shrink-0 text-center">
              <div className="w-12 h-12 bg-chart-1 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-mountain text-white"></i>
              </div>
              <span className="text-xs">Explorer</span>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="w-12 h-12 bg-chart-2 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-camera text-white"></i>
              </div>
              <span className="text-xs">Photographer</span>
            </div>
            <div className="flex-shrink-0 text-center">
              <div className="w-12 h-12 bg-chart-3 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-users text-white"></i>
              </div>
              <span className="text-xs">Social</span>
            </div>
          </div>
        </div>

        {/* Posts Tabs */}
        <div className="p-4">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts" className="flex items-center space-x-2" data-testid="tab-posts">
                <i className="fas fa-th"></i>
                <span>Posts</span>
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center space-x-2" data-testid="tab-saved">
                <i className="fas fa-bookmark"></i>
                <span>Saved</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-4">
              {postsLoading ? (
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-camera text-muted-foreground text-xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your first adventure with the world
                  </p>
                  <Button data-testid="button-create-first-post">
                    <i className="fas fa-plus mr-2"></i>
                    Create Post
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1" data-testid="posts-grid">
                  {posts.map((post) => (
                    <div 
                      key={post.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid={`post-thumbnail-${post.id}`}
                    >
                      {post.imageUrls && post.imageUrls.length > 0 ? (
                        <img
                          src={post.imageUrls[0]}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-image text-muted-foreground"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="saved" className="mt-4">
              {savedLoading ? (
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : savedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-bookmark text-muted-foreground text-xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No saved posts</h3>
                  <p className="text-muted-foreground">
                    Posts you save will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1" data-testid="saved-posts-grid">
                  {savedPosts.map((post) => (
                    <div 
                      key={post.id}
                      className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid={`saved-post-thumbnail-${post.id}`}
                    >
                      {post.imageUrls && post.imageUrls.length > 0 ? (
                        <img
                          src={post.imageUrls[0]}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="fas fa-image text-muted-foreground"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
