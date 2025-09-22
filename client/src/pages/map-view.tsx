import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post } from "@shared/schema";

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  title: string;
}

// Mock map markers for demo
const mockMarkers: MapMarker[] = [
  { id: '1', latitude: 40.7829, longitude: -73.9654, type: 'photo', title: 'Central Park Photo' },
  { id: '2', latitude: 40.7580, longitude: -73.9855, type: 'food', title: 'Great Restaurant' },
  { id: '3', latitude: 40.7614, longitude: -73.9776, type: 'adventure', title: 'Rock Climbing Spot' },
  { id: '4', latitude: 40.7505, longitude: -73.9934, type: 'architecture', title: 'Amazing Building' },
];

export default function MapView() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Default to NYC if geolocation fails
          setUserLocation({ lat: 40.7614, lng: -73.9776 });
        }
      );
    } else {
      setUserLocation({ lat: 40.7614, lng: -73.9776 });
    }
  }, []);

  // Fetch nearby posts (using mock location for now)
  const { data: nearbyPosts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/nearby", userLocation?.lat, userLocation?.lng],
    enabled: !!userLocation,
    retry: false,
  });

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return 'fas fa-camera';
      case 'food':
        return 'fas fa-utensils';
      case 'adventure':
        return 'fas fa-mountain';
      case 'architecture':
        return 'fas fa-building';
      default:
        return 'fas fa-map-marker-alt';
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'photo':
        return 'bg-destructive';
      case 'food':
        return 'bg-primary';
      case 'adventure':
        return 'bg-chart-2';
      case 'architecture':
        return 'bg-chart-3';
      default:
        return 'bg-muted-foreground';
    }
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
    <div className="h-screen bg-background">
      <div className="max-w-md mx-auto h-full flex flex-col">
        {/* Map Header */}
        <header className="bg-card border-b border-border px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </Button>
          <h2 className="text-lg font-semibold">Explore Map</h2>
          <Button variant="ghost" size="sm" data-testid="button-filter">
            <i className="fas fa-filter text-xl"></i>
          </Button>
        </header>

        {/* Map Container */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/20 dark:to-green-900/20">
          {/* Mock Google Map */}
          <div className="w-full h-full relative overflow-hidden" data-testid="map-container">
            {/* Map Markers */}
            {mockMarkers.map((marker) => (
              <div
                key={marker.id}
                className={`absolute w-8 h-8 ${getMarkerColor(marker.type)} rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform z-10 ${selectedMarker?.id === marker.id ? 'animate-bounce' : ''}`}
                style={{
                  top: `${20 + (Math.sin(parseInt(marker.id)) * 30)}%`,
                  left: `${20 + (Math.cos(parseInt(marker.id)) * 50)}%`,
                }}
                onClick={() => setSelectedMarker(marker)}
                data-testid={`map-marker-${marker.id}`}
              >
                <i className={`${getMarkerIcon(marker.type)} text-sm`}></i>
              </div>
            ))}

            {/* Current Location */}
            {userLocation && (
              <div 
                className="absolute w-4 h-4 bg-primary rounded-full border-4 border-white shadow-lg z-20"
                style={{ 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)' 
                }}
                data-testid="current-location-marker"
              >
                <div className="w-full h-full bg-primary rounded-full animate-ping opacity-75"></div>
              </div>
            )}

            {/* Map legend/overlay */}
            <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-destructive rounded-full"></div>
                <span>Photos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Food</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-chart-2 rounded-full"></div>
                <span>Adventure</span>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm" 
              className="w-10 h-10 bg-card/80 backdrop-blur-sm shadow-md"
              data-testid="button-zoom-in"
            >
              <i className="fas fa-plus"></i>
            </Button>
            <Button
              variant="outline" 
              size="sm"
              className="w-10 h-10 bg-card/80 backdrop-blur-sm shadow-md"
              data-testid="button-zoom-out"
            >
              <i className="fas fa-minus"></i>
            </Button>
          </div>

          {/* Current Location Button */}
          <Button
            size="sm"
            className="absolute bottom-6 right-4 w-12 h-12 bg-card text-primary shadow-lg rounded-full"
            onClick={() => {
              toast({
                title: "Location",
                description: "Centered on your current location",
              });
            }}
            data-testid="button-center-location"
          >
            <i className="fas fa-location-crosshairs text-xl"></i>
          </Button>
        </div>

        {/* Map Bottom Panel */}
        <div className="bg-card border-t border-border max-h-48 overflow-y-auto">
          {selectedMarker ? (
            <div className="p-4">
              <div className="flex items-center space-x-3 p-3 bg-background rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center">
                  <i className={`${getMarkerIcon(selectedMarker.type)} text-white`}></i>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium" data-testid={`text-selected-marker-title`}>
                    {selectedMarker.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">Tap to view details</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <span>❤️ 45</span>
                    <span>💬 8</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMarker(null)}
                  data-testid="button-close-marker"
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </div>
          ) : postsLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 bg-background rounded-xl">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : nearbyPosts.length > 0 ? (
            <div className="p-4 space-y-3" data-testid="nearby-posts">
              <h4 className="font-semibold mb-3">Nearby Posts</h4>
              {nearbyPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="flex items-center space-x-3 p-3 bg-background rounded-xl">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {post.imageUrls && post.imageUrls.length > 0 ? (
                      <img
                        src={post.imageUrls[0]}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-image text-muted-foreground"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{post.title}</h4>
                    <p className="text-xs text-muted-foreground">0.2 km away</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>❤️ {post.likeCount || 0}</span>
                      <span>💬 {post.commentCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-search text-muted-foreground"></i>
              </div>
              <h4 className="font-semibold mb-2">No posts nearby</h4>
              <p className="text-sm text-muted-foreground">
                Try exploring a different area or be the first to post here!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
