import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { InsertPost } from "@shared/schema";

const CATEGORIES = [
  'Nature', 'Food', 'Architecture', 'Culture', 'Adventure', 'Art', 'Photography', 'Travel'
];

export default function CreatePost() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    categories: [] as string[],
    imageUrls: [] as string[],
    musicUrl: '',
    visibility: 'everyone'
  });

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

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: InsertPost) => {
      const response = await apiRequest("POST", "/api/posts", postData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your post has been shared!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/feed"] });
      window.history.back();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please add a title for your post",
        variant: "destructive",
      });
      return;
    }

    if (formData.imageUrls.length === 0) {
      toast({
        title: "Missing Images",
        description: "Please add at least one photo",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate({
      title: formData.title,
      description: formData.description,
      location: formData.location || undefined,
      latitude: formData.latitude,
      longitude: formData.longitude,
      categories: formData.categories.length > 0 ? formData.categories : undefined,
      imageUrls: formData.imageUrls,
      musicUrl: formData.musicUrl || undefined,
      visibility: formData.visibility,
    });
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleImageUpload = () => {
    // In a real implementation, this would open file picker and upload to Cloudinary
    // For now, we'll add a placeholder image URL
    const placeholderUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
    setFormData(prev => ({
      ...prev,
      imageUrls: [...prev.imageUrls, placeholderUrl].slice(0, 10) // Max 10 images
    }));
    
    toast({
      title: "Photo Added",
      description: "Placeholder image added. In a real app, this would upload your photo.",
    });
  };

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
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            data-testid="button-cancel"
          >
            <i className="fas fa-times text-xl"></i>
          </Button>
          <h2 className="text-lg font-semibold">New Post</h2>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createPostMutation.isPending}
            data-testid="button-share"
          >
            {createPostMutation.isPending ? 'Sharing...' : 'Share'}
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Photo Upload Area */}
          <div className="p-4">
            <Card 
              className="border-2 border-dashed border-border rounded-xl h-64 flex items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={handleImageUpload}
              data-testid="button-upload-photo"
            >
              <CardContent className="p-0">
                {formData.imageUrls.length > 0 ? (
                  <div className="text-center">
                    <img
                      src={formData.imageUrls[0]}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {formData.imageUrls.length} photo{formData.imageUrls.length > 1 ? 's' : ''} added
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <i className="fas fa-camera text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground mb-2">Tap to add photos</p>
                    <p className="text-sm text-muted-foreground">You can add up to 10 photos</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Details */}
            <div className="space-y-4 mt-6">
              <Input
                type="text"
                placeholder="Add a title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-lg font-semibold border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                data-testid="input-title"
              />
              
              <Textarea
                placeholder="Share your experience... What makes this place special?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="border-0 border-b border-border rounded-none px-0 resize-none focus-visible:ring-0 focus-visible:border-primary"
                rows={4}
                data-testid="textarea-description"
              />

              {/* Location Selection */}
              <div className="flex items-center space-x-3 py-3 border-b border-border">
                <i className="fas fa-map-marker-alt text-xl text-muted-foreground"></i>
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Add location..."
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="border-0 p-0 focus-visible:ring-0"
                    data-testid="input-location"
                  />
                </div>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary font-medium text-sm"
                  onClick={() => {
                    // In a real app, this would open Google Places search
                    toast({
                      title: "Location Search",
                      description: "Google Places integration not implemented yet",
                    });
                  }}
                  data-testid="button-search-location"
                >
                  Search
                </Button>
              </div>

              {/* Category Selection */}
              <div className="py-3">
                <p className="text-sm font-medium text-foreground mb-3">Choose categories:</p>
                <div className="flex flex-wrap gap-2" data-testid="categories-container">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={formData.categories.includes(category) ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-sm"
                      onClick={() => toggleCategory(category)}
                      data-testid={`button-category-${category.toLowerCase()}`}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Advanced Options */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-music text-xl text-muted-foreground"></i>
                    <span className="font-medium">Add Music</span>
                  </div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary font-medium text-sm"
                    onClick={() => {
                      toast({
                        title: "Music Library",
                        description: "Music integration not implemented yet",
                      });
                    }}
                    data-testid="button-add-music"
                  >
                    Browse
                  </Button>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-eye text-xl text-muted-foreground"></i>
                    <span className="font-medium">Visibility</span>
                  </div>
                  <Select 
                    value={formData.visibility} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger className="w-32 border-0 p-0 h-auto text-primary font-medium text-sm focus:ring-0" data-testid="select-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="explorers">Explorers Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
