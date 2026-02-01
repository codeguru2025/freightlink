# FreightLink ZW

## Overview

FreightLink ZW is a digital freight marketplace platform for Zimbabwe that connects shippers (clients posting loads) with transporters (truck owners/drivers bidding for loads). The platform is designed as a mobile-first, low-bandwidth-optimized web application built for commercial readiness in the Zimbabwean market.

## Recent Changes

- **2026-02-01**: Full MVP implementation complete
  - Landing page with Zimbabwe-inspired branding (green/yellow theme)
  - User authentication via Replit Auth with role selection
  - Shipper features: post loads, view/accept bids, track jobs
  - Transporter features: browse marketplace, place bids, manage trucks, track jobs
  - Complete API with Zod validation and authorization
  - Mobile-first responsive design

The application enables:
- Shippers to post cargo loads and accept bids from transporters
- Transporters to browse available loads, submit bids, and manage their truck fleet
- Job tracking and status management throughout the delivery lifecycle

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Zimbabwe-inspired color theme (green/gold palette)
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
- **Key Entities**: Users, UserProfiles, Trucks, Loads, Bids, Jobs

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