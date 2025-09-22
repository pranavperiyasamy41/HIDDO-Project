import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/", icon: "fas fa-home", label: "Home" },
    { path: "/explore", icon: "fas fa-search", label: "Explore" },
    { path: "/create", icon: "fas fa-plus", label: "Create", isSpecial: true },
    { path: "/map", icon: "fas fa-map", label: "Map" },
    { path: "/profile", icon: "fas fa-user", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center py-2 h-auto ${
                location === item.path 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              } transition-colors`}
              onClick={() => setLocation(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              {item.isSpecial ? (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mb-1">
                  <i className={`${item.icon} text-primary-foreground`}></i>
                </div>
              ) : (
                <i className={`${item.icon} text-xl mb-1`}></i>
              )}
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
