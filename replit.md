# Hiddo Platform

## Overview

Hiddo is a mobile-first social exploration application that combines location-based content sharing with real-world discovery. Users can create posts tied to specific locations, share stories, discover nearby content, and connect with fellow explorers. The platform features a clean, modern interface with both dark and light modes, progressive web app capabilities, and comprehensive social features including likes, comments, saves, and real-time notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built using React 18 with TypeScript for type safety and modern development practices. The UI leverages shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable interface elements. Tailwind CSS handles responsive styling with a mobile-first approach, supporting both light and dark themes through CSS custom properties. The application uses Wouter for lightweight client-side routing and React Query (TanStack Query) for efficient data fetching, caching, and synchronization with the backend.

### Backend Architecture
The server is built with Express.js running on Node.js, providing a RESTful API architecture. The application uses TypeScript throughout for consistency and type safety. Authentication is handled through Replit's OpenID Connect integration with Passport.js, supporting both Google OAuth and traditional email-based authentication. Session management uses PostgreSQL-backed storage with connect-pg-simple for persistence.

### Data Storage Solutions
PostgreSQL serves as the primary database, accessed through Drizzle ORM for type-safe database operations. The database schema includes comprehensive tables for users, posts, stories, comments, likes, saves, notifications, and explorer relationships. All tables include proper foreign key relationships and cascade deletions. Sessions are stored in a dedicated PostgreSQL table for authentication persistence.

### Real-time Communication
WebSocket integration enables real-time features including live notifications, instant messaging capabilities, and real-time updates for social interactions. The WebSocket implementation includes automatic reconnection logic and proper error handling for reliable real-time communication.

### Progressive Web App Features
The application is configured as a PWA with service workers for offline functionality, push notifications for mobile engagement, and installation capabilities for mobile home screens. The PWA configuration includes proper manifest files, icons, and caching strategies for critical resources.

## External Dependencies

### Authentication Services
- **Replit Auth**: OpenID Connect integration for user authentication
- **Google OAuth**: Alternative authentication method through Google services
- **Passport.js**: Authentication middleware for Express.js

### Database and ORM
- **PostgreSQL**: Primary database via Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations and migrations
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible UI component primitives
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Font Awesome**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Type safety across frontend and backend
- **esbuild**: Fast JavaScript bundler for production builds
- **React Query**: Data fetching and state management library

### Maps and Location Services
- **Google Maps API**: Location services, mapping, and places integration
- **Google Places API**: Location search and place details functionality

### Media and File Management
- **Cloudinary**: Image storage, optimization, and CDN delivery (planned integration)

### Communication
- **WebSocket**: Real-time bidirectional communication
- **Google SMTP**: Email delivery service for notifications and verification