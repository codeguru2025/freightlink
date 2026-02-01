# FreightLink ZW

## Overview

FreightLink ZW is a digital freight marketplace platform for Zimbabwe that connects shippers (clients posting loads) with transporters (truck owners/drivers bidding for loads). The platform is designed as a mobile-first, low-bandwidth-optimized web application built for commercial readiness in the Zimbabwean market.

## Recent Changes

- **2026-02-01**: Extended Features Implementation
  - Added Documents system for verification (ID, license, insurance, proof of delivery)
  - Added Messaging system for user-to-user communication
  - Added Reviews and Ratings system for completed jobs
  - Added Disputes system with admin resolution workflow
  - New database tables: documents, messages, reviews, disputes
  - New API routes for all new features with role-based access
  - Updated sidebar navigation for all user roles
  - Admin can verify/reject documents and manage disputes

- **2026-02-01**: PWA Implementation with native app experience
  - Applied FreightLink ZW logo throughout the application (header, sidebar, footer)
  - Updated theme colors to match logo (blue #1E5AA8, green #1D8B45, orange #F7941D)
  - Added PWA manifest with app icons for installability
  - Created service worker for offline functionality with SPA navigation fallback
  - Added splash screen with tagline "Connecting Shippers & Transporters Across Zimbabwe"
  - Implemented install prompt for adding app to home screen
  - Added PWA meta tags, Apple touch icons, and Open Graph tags
  - Mobile-first design optimizations with safe area insets

- **2026-02-01**: Full MVP implementation complete
  - Landing page with Zimbabwe-inspired branding
  - User authentication via Replit Auth with role selection
  - Shipper features: post loads, view/accept bids, track jobs
  - Transporter features: browse marketplace, place bids, manage trucks, track jobs
  - Complete API with Zod validation and authorization
  - Mobile-first responsive design

The application enables:
- Shippers to post cargo loads and accept bids from transporters
- Transporters to browse available loads, submit bids, and manage their truck fleet
- Job tracking and status management throughout the delivery lifecycle
- Document upload and verification for user/vehicle credentials
- Messaging between shippers and transporters
- Ratings and reviews for completed jobs
- Dispute handling with admin resolution

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with FreightLink ZW brand colors (blue/green/orange)
- **PWA**: Service worker, manifest.json, splash screen, install prompt
- **Build Tool**: Vite for fast development and optimized production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit Auth integration with OpenID Connect (OIDC)
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` for shared type definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Key Entities**: Users, UserProfiles, Trucks, Loads, Bids, Jobs, Documents, Messages, Reviews, Disputes

### Application Structure
```
client/           # React frontend application
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Route page components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utilities and query client
server/           # Express backend
├── routes.ts         # API route definitions
├── storage.ts        # Database operations interface
├── db.ts            # Database connection
└── replit_integrations/  # Replit Auth setup
shared/           # Shared code between client and server
├── schema.ts         # Drizzle database schema
└── models/           # Type definitions
```

### Key Design Patterns
- **Storage Interface Pattern**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Query-based Data Fetching**: React Query handles caching, refetching, and optimistic updates
- **Role-based Access**: User profiles have roles (shipper, transporter, admin) that determine available features
- **Status Enums**: Load status (posted → bidding → accepted → in_transit → delivered) and bid status (pending → accepted/rejected/withdrawn) state machines

## External Dependencies

### Authentication
- **Replit Auth**: OpenID Connect integration for user authentication
- **Passport.js**: Authentication middleware with OIDC strategy
- **express-session**: Session management with PostgreSQL store

### Database
- **PostgreSQL**: Primary database (provisioned via Replit)
- **Drizzle ORM**: Type-safe database queries and schema management
- **drizzle-zod**: Schema validation integration

### UI Framework
- **Radix UI**: Accessible primitive components (dialogs, dropdowns, forms, etc.)
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant styling
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Type safety across the stack