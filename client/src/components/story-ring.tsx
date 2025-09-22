import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Story } from "@shared/schema";

interface StoryRingProps {
  story?: Story;
  isAddStory?: boolean;
  onTap: () => void;
  "data-testid"?: string;
}

export default function StoryRing({ 
  story, 
  isAddStory = false, 
  onTap,
  "data-testid": testId 
}: StoryRingProps) {
  if (isAddStory) {
    return (
      <div className="flex-shrink-0 text-center" data-testid={testId}>
        <Button
          variant="ghost"
          className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center mb-2 p-0 hover:bg-accent"
          onClick={onTap}
        >
          <i className="fas fa-plus text-xl text-muted-foreground"></i>
        </Button>
        <span className="text-xs">Your Story</span>
      </div>
    );
  }

  // Determine if story has been viewed (simplified logic)
  const isViewed = false; // In a real app, this would check if current user has viewed this story

  return (
    <div className="flex-shrink-0 text-center" data-testid={testId}>
      <Button
        variant="ghost"
        className="p-0 rounded-full"
        onClick={onTap}
      >
        <div className={`w-20 h-20 rounded-full p-1 ${
          isViewed 
            ? "bg-border" 
            : "bg-gradient-to-r from-destructive via-chart-3 to-chart-5"
        }`}>
          <div className="w-full h-full bg-muted rounded-full overflow-hidden">
            {story?.mediaUrl ? (
              <img
                src={story.mediaUrl}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fas fa-user text-muted-foreground"></i>
              </div>
            )}
          </div>
        </div>
      </Button>
      <span className="text-xs mt-2 block">
        {story ? "user_story" : "Story"}
      </span>
    </div>
  );
}
