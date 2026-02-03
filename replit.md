# FreightLink ZW

## Overview

FreightLink ZW is a digital freight marketplace platform for Zimbabwe that connects shippers (clients posting loads) with transporters (truck owners/drivers bidding for loads). The platform is designed as a mobile-first, low-bandwidth-optimized web application built for commercial readiness in the Zimbabwean market.

## Recent Changes

- **2026-02-03**: Reports & Summaries Feature
  - Added user reports page (/reports) for shippers and transporters
  - Shipper reports: total loads posted, active jobs, completed jobs, loads history
  - Transporter reports: total bids, active jobs, completed trips, wallet deposits, transactions history
  - Admin reports page (/admin/reports) with comprehensive platform data
  - Admin can view: all loads, all jobs, all users, all transactions
  - Excel and PDF export functionality for admin (xlsx, jsPDF libraries)
  - Export buttons for each data category with format selection
  - Platform revenue tracking from commission deductions
  - Navigation links added to sidebar for all user roles

- **2026-02-03**: Wallet & Commission System for Transporters
  - Added wallet system for transporters to manage funds for commission payments
  - Paynow integration for wallet top-up via EcoCash and OneMoney mobile money
  - New database tables: wallets, wallet_transactions
  - Transaction types: deposit, commission_deduction, refund, withdrawal
  - Transaction statuses: pending, completed, failed, cancelled
  - Wallet page (/wallet) with balance display, top-up dialog, transaction history
  - Marketplace shows wallet balance banner for transporters
  - Sidebar navigation "Wallet" for transporter role
  - **Testing Mode**: Commission deduction and marketplace filtering disabled
  - **Testing Mode**: Wallet top-up works instantly without Paynow credentials
  - **Production TODO**: Enable 10% commission on transit start, enable wallet filtering, configure PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY

- **2026-02-03**: Proof of Delivery (POD) & Payment System
  - Added comprehensive POD workflow for triggering payments after delivery
  - New document types: delivery_note, shipment_note, waybill, signed_pod
  - Payment status tracking: pending → pod_submitted → pod_confirmed → payment_requested → paid
  - Dedicated POD management page (/pod) with tabs for each payment status
  - Job detail page integration with POD submission, confirmation, and payment actions
  - Transporters: Upload POD documents, submit POD, request payment
  - Shippers: Confirm POD, mark payment as complete
  - New sidebar navigation "POD & Payments" for both shipper and transporter roles

- **2026-02-01**: Job Detail Page Integration
  - Created comprehensive job detail page (/jobs/:id) with full feature integration
  - Messaging integration: "Message" button navigates to conversations with partner
  - Reviews integration: Leave review dialog for completed jobs with star ratings
  - Disputes integration: Raise dispute dialog for reporting job issues
  - Document upload integration: Upload proof of delivery and job-related documents
  - Forms use React Hook Form with Zod validation for proper data handling
  - All interactive elements include data-testid attributes for testing
  - Star rating component uses theme tokens for proper dark/light mode support

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
- Proof of Delivery (POD) workflow for payment triggering
- Document upload and verification for user/vehicle credentials
- Messaging between shippers and transporters
- Ratings and reviews for completed jobs
- Dispute handling with admin resolution
- Wallet management with mobile money top-up (EcoCash/OneMoney via Paynow)
- 10% commission system for transporters (auto-deducted when starting transit)
- Reports and summaries for all users (admins get Excel/PDF export)

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