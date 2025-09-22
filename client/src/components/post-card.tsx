import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Post } from "@shared/schema";

interface PostCardProps {
  post: Post;
  onLike: (isLiked: boolean) => void;
  onSave: (isSaved: boolean) => void;
  onComment: () => void;
  onShare: () => void;
  "data-testid"?: string;
}

export default function PostCard({ 
  post, 
  onLike, 
  onSave, 
  onComment, 
  onShare,
  "data-testid": testId 
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(isLiked);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave(isSaved);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <Card className="border-b border-border rounded-none" data-testid={testId}>
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src="" alt="User avatar" />
              <AvatarFallback>
                <i className="fas fa-user"></i>
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-sm" data-testid="text-post-username">
                user_explorer
              </h4>
              {post.location && (
                <p className="text-sm text-muted-foreground flex items-center" data-testid="text-post-location">
                  <i className="fas fa-map-marker-alt mr-1"></i>
                  {post.location}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" data-testid="button-post-menu">
            <i className="fas fa-ellipsis-h"></i>
          </Button>
        </div>

        {/* Post Image */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="w-full h-80 bg-muted relative overflow-hidden">
            <img
              src={post.imageUrls[0]}
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid="img-post-image"
            />
            {post.imageUrls.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                1/{post.imageUrls.length}
              </div>
            )}
          </div>
        )}

        {/* Post Actions & Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`flex items-center space-x-2 p-0 h-auto ${
                  isLiked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                } transition-colors`}
                onClick={handleLike}
                data-testid="button-post-like"
              >
                <i className={`${isLiked ? "fas" : "far"} fa-heart text-xl`}></i>
                <span className="font-medium">{post.likeCount || 0}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors p-0 h-auto"
                onClick={onComment}
                data-testid="button-post-comment"
              >
                <i className="fas fa-comment text-xl"></i>
                <span>{post.commentCount || 0}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground transition-colors p-0 h-auto"
                onClick={onShare}
                data-testid="button-post-share"
              >
                <i className="fas fa-paper-plane text-xl"></i>
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className={`${
                isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
              } transition-colors p-0 h-auto`}
              onClick={handleSave}
              data-testid="button-post-save"
            >
              <i className={`${isSaved ? "fas" : "far"} fa-bookmark text-xl`}></i>
            </Button>
          </div>
          
          <div className="mb-3">
            <p className="text-sm" data-testid="text-post-content">
              <span className="font-semibold">user_explorer</span>{" "}
              {post.description}
            </p>
            {post.categories && post.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {post.categories.map((category, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full"
                    data-testid={`tag-${category.toLowerCase()}`}
                  >
                    #{category.toLowerCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {post.commentCount && post.commentCount > 0 && (
            <Button 
              variant="link" 
              className="text-sm text-muted-foreground p-0 h-auto mb-2"
              onClick={onComment}
              data-testid="button-view-comments"
            >
              View all {post.commentCount} comments
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground" data-testid="text-post-timestamp">
            {post.createdAt ? formatTimeAgo(post.createdAt) : "Just now"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
