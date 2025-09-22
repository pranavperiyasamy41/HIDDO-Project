import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotificationData {
  id: string;
  type: 'like' | 'comment' | 'explorer_request' | 'story_view';
  message: string;
  timestamp: Date;
}

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Simulate receiving notifications
  useEffect(() => {
    const simulateNotification = (message: string, type: NotificationData['type']) => {
      const notification: NotificationData = {
        id: Math.random().toString(),
        type,
        message,
        timestamp: new Date()
      };

      setNotifications(prev => [notification, ...prev].slice(0, 3)); // Keep max 3

      // Auto remove after 4 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 4000);
    };

    // Simulate some notifications after a delay
    const timeouts = [
      setTimeout(() => simulateNotification("sarah_adventures liked your post", 'like'), 2000),
      setTimeout(() => simulateNotification("New explorer request from mike_foodie", 'explorer_request'), 5000),
      setTimeout(() => simulateNotification("alex_photo commented on your story", 'comment'), 8000),
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const getIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'like':
        return 'fas fa-heart text-destructive';
      case 'comment':
        return 'fas fa-comment text-primary';
      case 'explorer_request':
        return 'fas fa-user-plus text-chart-2';
      case 'story_view':
        return 'fas fa-eye text-chart-3';
      default:
        return 'fas fa-info-circle text-muted-foreground';
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm" data-testid="notification-container">
      {notifications.map((notification, index) => (
        <Card
          key={notification.id}
          className={`bg-card border border-border shadow-lg p-4 transform transition-all duration-300 ${
            index === 0 ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid={`notification-${notification.type}`}
        >
          <div className="flex items-center space-x-3">
            <i className={getIcon(notification.type)}></i>
            <p className="text-sm flex-1" data-testid="text-notification-message">
              {notification.message}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
              onClick={() => removeNotification(notification.id)}
              data-testid="button-dismiss-notification"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
