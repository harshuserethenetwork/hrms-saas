# 🏗️ HRMS SaaS — Authentication, Onboarding & RBAC Architecture

> A complete guide for every developer — from beginner to senior — explaining exactly **how authentication works**, **how company onboarding flows**, and **how Role-Based Access Control (RBAC) is structured** in this codebase.

---

## 📋 Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Project Folder Structure](#2-project-folder-structure)
3. [How Each File Interacts — The Big Picture](#3-how-each-file-interacts--the-big-picture)
4. [Prisma Schema Deep Dive](#4-prisma-schema-deep-dive)
   - [Core Tables & Their Purpose](#core-tables--their-purpose)
   - [Table Relationships Explained](#table-relationships-explained)
   - [Enums & Their Meaning](#enums--their-meaning)
5. [Authentication System (BetterAuth)](#5-authentication-system-betterauth)
   - [What is BetterAuth?](#what-is-betterauth)
   - [auth.ts — The Auth Configuration](#authts--the-auth-configuration)
   - [db.ts — The Database Client](#dbts--the-database-client)
   - [The Auth API Route (Catch-All)](#the-auth-api-route-catch-all)
   - [Login Flow — Step by Step](#login-flow--step-by-step)
   - [Logout Flow](#logout-flow)
6. [Company Onboarding Flow](#6-company-onboarding-flow)
   - [Validation Layer (Zod)](#validation-layer-zod)
   - [Domain Types (DTOs)](#domain-types-dtos)
   - [The Onboarding API Route](#the-onboarding-api-route)
   - [The Use Case — OnboardCompanyUseCase](#the-use-case--onboardcompanyusecase)
   - [What happens inside the Transaction?](#what-happens-inside-the-transaction)
7. [RBAC — Role-Based Access Control](#7-rbac--role-based-access-control)
   - [Core Concept: What is RBAC?](#core-concept-what-is-rbac)
   - [The Permission Catalog](#the-permission-catalog)
   - [Default Roles and Their Permissions](#default-roles-and-their-permissions)
   - [How Roles Are Assigned](#how-roles-are-assigned)
   - [How to Add a New Permission](#how-to-add-a-new-permission)
   - [How to Add a New Role](#how-to-add-a-new-role)
8. [Clean Architecture Pattern Used](#8-clean-architecture-pattern-used)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Environment Variables](#10-environment-variables)
11. [Common Questions (FAQ)](#11-common-questions-faq)

---

## 1. Tech Stack Overview

| Tool           | Version | Purpose                                             |
| -------------- | ------- | --------------------------------------------------- |
| **Next.js**    | 16.x    | Full-stack React framework (App Router)             |
| **TypeScript** | 5.x     | Type safety across the whole codebase               |
| **BetterAuth** | 1.6.x   | Authentication library (sessions, cookies, hashing) |
| **Prisma**     | 7.x     | ORM (Object Relational Mapper) for database         |
| **PostgreSQL** | —       | Primary relational database                         |
| **Zod**        | 4.x     | Schema validation for incoming request data         |
| **pg**         | 8.x     | Node.js PostgreSQL connection pool driver           |

> **Why BetterAuth instead of NextAuth?**
> BetterAuth is a newer, framework-agnostic auth library. It handles password hashing, session creation, cookie management, and token flows — but it is fully customizable. It adapts to your own Prisma database schema via an official Prisma adapter.

---

## 2. Project Folder Structure

```
hrms-saas/
├── prisma/
│   ├── schema.prisma          ← Database schema (tables + relationships)
│   └── seed.ts                ← Seed script (empty for now)
├── prisma.config.ts           ← Prisma CLI configuration (tells Prisma where schema & migrations live)
│
├── src/
│   ├── lib/
│   │   ├── auth.ts            ← BetterAuth instance configuration
│   │   ├── db.ts              ← Prisma client singleton (with pg connection pool)
│   │   └── utils.ts           ← General utility functions (cn helper)
│   │
│   ├── app/
│   │   ├── layout.tsx         ← Root layout (wraps app in Providers)
│   │   ├── page.tsx           ← Root page (placeholder)
│   │   │
│   │   ├── (auth)/            ← Route group for unauthenticated pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx   ← Login page (UI)
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/       ← Route group for authenticated pages
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── leave/
│   │   │   ├── attendance/
│   │   │   ├── payroll/
│   │   │   └── settings/
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/
│   │       │       └── route.ts   ← BetterAuth catch-all API handler
│   │       └── onboarding/
│   │           └── route.ts       ← Company registration API endpoint
│   │
│   ├── modules/
│   │   └── onboarding/            ← Clean Architecture module
│   │       ├── domain/            ← Business rules, types, validation
│   │       │   ├── types.ts       ← DTOs (Data Transfer Objects)
│   │       │   └── validation.ts  ← Zod schemas for request validation
│   │       ├── application/       ← Use cases (business logic orchestration)
│   │       │   └── onboard-company.usecase.ts
│   │       └── infrastructure/    ← External data, default data, adapters
│   │           └── default-catalog.ts  ← Default roles & permissions
│   │
│   └── providers/
│       ├── index.tsx          ← Combines all providers
│       ├── auth-provider.tsx  ← Auth context wrapper (future)
│       ├── query-provider.tsx ← React Query provider
│       └── theme-provider.tsx ← Dark/light theme provider
│
└── architecture/
    └── AUTH_AND_RBAC.md       ← This file!
```

---

## 3. How Each File Interacts — The Big Picture

Let's trace **exactly how the files talk to each other** during an onboarding request:

```
Browser (user fills sign-up form)
        │
        │ POST /api/onboarding
        ▼
src/app/api/onboarding/route.ts
        │
        ├─ imports validation schema from ──► src/modules/onboarding/domain/validation.ts
        │                                        (Zod schema validates the raw request body)
        │
        ├─ creates instance of ──────────► src/modules/onboarding/application/onboard-company.usecase.ts
        │                                        (The use case runs the full onboarding transaction)
        │   │
        │   ├─ uses auth instance from ─► src/lib/auth.ts
        │   │                                 (To hash the password using BetterAuth's hasher)
        │   │
        │   ├─ uses prisma client from ─► src/lib/db.ts
        │   │                                 (To talk to PostgreSQL via a connection pool)
        │   │
        │   └─ imports default data from ► src/modules/onboarding/infrastructure/default-catalog.ts
        │                                     (DEFAULT_PERMISSIONS and DEFAULT_ROLES arrays)
        │
        └─ after use case completes, calls ► auth.api.signInEmail()
                                              (BetterAuth automatically creates a session + sets cookies)
```

```
BetterAuth configuration flow:
src/lib/auth.ts
    │
    ├─ uses prismaAdapter(prisma) ──────► src/lib/db.ts (the Prisma client)
    │
    └─ is exported and imported in:
        ├─ src/app/api/auth/[...all]/route.ts   (handles all /api/auth/* endpoints)
        └─ src/modules/onboarding/application/onboard-company.usecase.ts (to hash passwords)
```

---

## 4. Prisma Schema Deep Dive

The schema lives at `prisma/schema.prisma`. It describes the **entire database structure**.

### Core Tables & Their Purpose

#### 🏢 `Organization` (table: `organizations`)

This is the **root tenant** in our multi-tenant SaaS system. Every company that signs up creates one Organization.

```prisma
model Organization {
  id                 String             @id @default(uuid())
  name               String             // "Acme Corp"
  slug               String             @unique  // "acme-corp" — used in URLs
  website            String?
  email              String?
  phone              String?
  timezone           String             @default("UTC")
  country            String?
  currency           String?
  status             OrganizationStatus @default(ACTIVE)
  subscriptionPlan   SubscriptionPlan   @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  createdAt          DateTime           @default(now())
  createdBy          String?
  updatedAt          DateTime           @updatedAt
  updatedBy          String?
  deletedAt          DateTime?          // Soft delete: instead of removing row, we set this

  // Relations
  invitations        OrganizationInvitation[]
  members            OrganizationMember[]
  roles              Role[]
  userRoles          UserRole[]
}
```

**Key design decisions:**

- `slug` is **unique** — used in URLs like `app.hrms.com/acme-corp`
- `deletedAt` is **soft delete** — the row stays in DB, but the app treats it as deleted
- `subscriptionPlan` controls what features the org can access (billing)
- The org "owns" its members, roles, and invitations (all cascade delete when org is deleted)

---

#### 👤 `User` (table: `users`)

Represents a **human being** who can log into the system. A user can belong to **multiple organizations** via the `OrganizationMember` join table.

```prisma
model User {
  id                  String     @id @default(uuid())
  email               String     @unique
  name                String     // Display name (short)
  fullName            String     // Full legal name
  status              UserStatus @default(INVITED)
  emailVerified       Boolean    @default(false)
  failedLoginAttempts Int        @default(0)  // Brute force protection
  lastLoginAt         DateTime?
  lockedUntil         DateTime?  // Account lockout after too many failed attempts
  passwordChangedAt   DateTime?
  sessionVersion      Int        @default(1)  // Increment to invalidate all sessions
  avatarUrl           String?
  image               String?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
  deletedAt           DateTime?

  // Relations
  accounts            Account[]  // Auth providers (password, Google OAuth etc.)
  sessions            Session[]
  memberships         OrganizationMember[]
  sentInvitations     OrganizationInvitation[] @relation("InvitationCreatedBy")
  targetedInvitations OrganizationInvitation[] @relation("InvitationTargetUser")
}
```

**Key design decisions:**

- `failedLoginAttempts` and `lockedUntil` — **brute force protection**: after too many wrong passwords, the account is temporarily locked
- `sessionVersion` — if you want to **log out all devices at once**, just increment this; any existing sessions with an old version are invalidated
- A user can be `INVITED` (registered but not yet activated) vs `ACTIVE` (fully onboarded)

---

#### 🔗 `OrganizationMember` (table: `organization_members`)

This is the **bridge/join table** between a User and an Organization. It represents **membership**.

```prisma
model OrganizationMember {
  id             String                   @id @default(uuid())
  organizationId String
  userId         String
  status         OrganizationMemberStatus @default(PENDING)
  invitedAt      DateTime?
  joinedAt       DateTime?
  leftAt         DateTime?

  // Relations
  organization   Organization @relation(...)
  user           User         @relation(...)
  userRoles      UserRole[]   // What roles this member has in this org
  acceptedInvitation OrganizationInvitation?

  @@unique([organizationId, userId])  // A user can only be a member once per org
}
```

**Why do we need this table instead of putting `organizationId` directly on User?**

Because **one user can belong to multiple companies**. For example, a freelance consultant might be a member of 5 different company accounts. The `OrganizationMember` table handles this many-to-many relationship cleanly.

**Status lifecycle:**

```
PENDING → ACTIVE → INACTIVE / SUSPENDED / REMOVED
```

---

#### 🎭 `Role` (table: `roles`)

A role is a **named collection of permissions**. Instead of assigning individual permissions to each user, we assign roles.

```prisma
model Role {
  id             String   @id @default(uuid())
  name           String
  organizationId String   // Roles belong to ONE specific organization
  isSystem       Boolean  @default(false)  // System roles cannot be deleted
  description    String?
  parentRoleId   String?  // For role inheritance (hierarchy)

  // Relations
  organization    Organization      @relation(...)
  rolePermissions RolePermission[]  // What permissions this role has
  userRoles       UserRole[]        // Who has been assigned this role
  parentRole      Role?             @relation("RoleHierarchy", ...)
  childRoles      Role[]            @relation("RoleHierarchy")

  @@unique([organizationId, name])  // Two roles in the same org can't have the same name
}
```

**Key design decisions:**

- Roles are **per-organization** — "Company Admin" in Org A is completely separate from "Company Admin" in Org B
- `isSystem: true` means the role was created by the system (cannot be deleted or renamed by users)
- `parentRoleId` supports **role inheritance** (a Manager role could inherit from an Employee role)

---

#### 🔑 `Permission` (table: `permissions`)

A permission is an **atomic action** a user can take. Permissions are **global** (not per-organization).

```prisma
model Permission {
  id              String           @id @default(uuid())
  module          String           // "employees", "leaves", "payroll"
  action          String           // "create", "read", "update", "delete"
  code            String           @unique  // "employees:create"
  description     String?

  rolePermissions RolePermission[]

  @@unique([module, action])
}
```

**Convention:** Permission codes follow the pattern `module:action`, e.g.:

- `employees:create`
- `leaves:approve`
- `payroll:read`

**Why are permissions global (not per-org)?**

Permissions represent **what actions exist** in the system. Whether you're in Company A or Company B, the action "approve a leave" is the same concept. What differs is **which roles** in each organization have that permission — that's handled by the Role → RolePermission link.

---

#### 🔒 `UserRole` (table: `user_roles`)

This assigns a Role to an OrganizationMember. It's the final link: "In Organization X, User Y has Role Z."

```prisma
model UserRole {
  id                   String             @id @default(uuid())
  organizationId       String
  organizationMemberId String             // The specific membership record
  roleId               String             // The role being assigned
  assignedAt           DateTime           @default(now())
  assignedBy           String?            // Who made this assignment (audit trail)

  @@unique([organizationMemberId, roleId])  // A member can't have the same role twice
}
```

---

#### 🔗 `RolePermission` (table: `role_permissions`)

Join table between Role and Permission. "Role X has Permission Y."

```prisma
model RolePermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String

  role         Role       @relation(...)
  permission   Permission @relation(...)

  @@unique([roleId, permissionId])  // A role can't have the same permission twice
}
```

---

#### 📧 `OrganizationInvitation` (table: `organization_invitations`)

When an admin invites someone to join their organization, this record is created.

```prisma
model OrganizationInvitation {
  id             String          @id @default(uuid())
  email          String          // Who was invited
  token          String          @unique  // Secure random token sent in the invite email
  status         InvitationStatus @default(PENDING)
  organizationId String
  roleId         String?         // What role they'll get when they accept
  invitedBy      String          // Which user sent the invite
  targetUserId   String?         // If the invited person is already a user
  firstName      String?
  lastName       String?
  acceptedAt     DateTime?
  acceptedMemberId String?       // Links to OrganizationMember after acceptance
  expiresAt      DateTime        // Invite links expire
  createdAt      DateTime        @default(now())
}
```

---

#### 🍪 `Session` (table: `session`) — Managed by BetterAuth

BetterAuth creates this automatically when a user logs in.

```prisma
model Session {
  id        String   @id
  token     String   @unique   // The session token stored in the browser cookie
  userId    String             // Which user this session belongs to
  expiresAt DateTime           // When this session expires
  ipAddress String?            // For security audit
  userAgent String?            // Browser info
  createdAt DateTime
  updatedAt DateTime

  user      User @relation(...)
}
```

**How sessions work:**

1. User logs in → BetterAuth creates a `Session` row in the DB
2. BetterAuth sets a **cookie** in the browser containing the session `token`
3. On every subsequent request, the browser sends this cookie
4. BetterAuth reads the cookie, looks up the session in DB, and identifies the user

---

#### 🔐 `Account` (table: `account`) — Managed by BetterAuth

Stores the **credentials** for a user. Supports multiple auth methods (email+password, Google OAuth, etc.)

```prisma
model Account {
  id         String  @id
  userId     String
  providerId String  // "credential" for email/password, "google" for OAuth
  accountId  String  // Same as userId for credential provider
  password   String? // Hashed password (only for "credential" provider)
  accessToken  String?   // For OAuth providers
  refreshToken String?   // For OAuth providers
  ...
}
```

**Key:** For email/password login, `providerId = "credential"` and `password` contains the **hashed** password. BetterAuth handles the hashing — you never store plain-text passwords.

---

#### ✅ `Verification` (table: `verification`) — Managed by BetterAuth

Used for **email verification links**, **password reset tokens**, and other time-limited verification flows.

```prisma
model Verification {
  id         String   @id
  identifier String   // Usually the email address
  value      String   // The secret token
  expiresAt  DateTime
  ...
}
```

---

### Table Relationships Explained

Here's the **complete relationship map** in plain English:

```
Organization
    │
    ├──< OrganizationMember >──< User
    │         │
    │         └──< UserRole >──< Role >──< RolePermission >──< Permission
    │
    ├──< Role (owned by org)
    │
    └──< OrganizationInvitation

User
    ├──< Session (login sessions)
    └──< Account (credentials / OAuth)
```

**Reading guide:**

- `──<` means "one-to-many" (one org has many members)
- `>──<` means "many-to-many via join table"

**The full chain for "what can a user do in an org":**

```
User → OrganizationMember → UserRole → Role → RolePermission → Permission
```

In plain English: "A User is a Member of an Organization. That Membership has Roles assigned. Each Role has Permissions. Permissions define what actions the user can perform."

---

### Enums & Their Meaning

```prisma
enum OrganizationStatus { ACTIVE, INACTIVE, SUSPENDED }
//   ↑ Is the org operational? SUSPENDED = billing issue

enum SubscriptionPlan { FREE, STARTER, PROFESSIONAL, ENTERPRISE }
//   ↑ What tier of service the org is paying for

enum SubscriptionStatus { ACTIVE, TRIAL, EXPIRED, CANCELLED }
//   ↑ Is the subscription currently valid?

enum UserStatus { INVITED, ACTIVE, INACTIVE, SUSPENDED }
//   INVITED  = account created but not yet logged in
//   ACTIVE   = normal, can log in
//   INACTIVE = disabled by admin
//   SUSPENDED = violating terms

enum OrganizationMemberStatus { PENDING, ACTIVE, INACTIVE, SUSPENDED, REMOVED }
//   ↑ Status of a user WITHIN an organization (separate from overall user status)

enum InvitationStatus { PENDING, ACCEPTED, EXPIRED, CANCELLED }
//   ↑ State of an email invitation link
```

---

## 5. Authentication System (BetterAuth)

### What is BetterAuth?

Think of BetterAuth like a **security guard** for your app. It handles:

- ✅ Hashing passwords before storing them (using bcrypt/argon2)
- ✅ Creating and destroying session records in the database
- ✅ Setting and reading secure HTTP-only cookies in the browser
- ✅ Exposing API endpoints for sign-in, sign-out, sign-up, password reset, etc.

You configure it once, and it does the heavy lifting automatically.

---

### `auth.ts` — The Auth Configuration

📄 **File:** `src/lib/auth.ts`

```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '../lib/db';

export const auth = betterAuth({
  // 1. Tell BetterAuth to use our Prisma database
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // 2. Enable email + password login
  emailAndPassword: {
    enabled: true,
  },

  // 3. Which origins can make auth requests (CSRF protection)
  trustedOrigins: ['http://localhost:3000'],

  // 4. Next.js specific plugin — makes cookies work correctly in Next.js
  plugins: [nextCookies()],
});
```

**Line-by-line explanation for beginners:**

| Line                                  | What it does                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `prismaAdapter(prisma, {...})`        | Connects BetterAuth to your database. BetterAuth will read/write Session, Account, User, Verification tables automatically. |
| `emailAndPassword: { enabled: true }` | Activates the username + password authentication method.                                                                    |
| `trustedOrigins`                      | Security setting: only requests from these URLs can use the auth API. Prevents CSRF attacks from malicious websites.        |
| `plugins: [nextCookies()]`            | Next.js uses a special cookie API. This plugin bridges BetterAuth's cookie handling to Next.js's `cookies()` helper.        |

---

### `db.ts` — The Database Client

📄 **File:** `src/lib/db.ts`

```typescript
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// 1. Create a PostgreSQL connection pool (not a single connection, but a POOL of them)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Create a Prisma adapter that uses the pool
const adapter = new PrismaPg(pool);

// 3. Singleton pattern — only ONE Prisma client instance across the whole app
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// 4. In development, store the client on globalThis to avoid creating
//    new clients on every hot-module reload (Next.js dev server issue)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**What is a "connection pool"?**

A database connection is expensive to create. Instead of opening a new connection for every request, a **pool** keeps several connections open and reuses them. This makes your app much faster under load.

**Why the singleton pattern?**

In Next.js development mode, the server hot-reloads on every file save. Without the singleton, each reload would create a new `PrismaClient`, quickly exhausting your database connection limit. The `globalThis` trick keeps a single instance alive across reloads.

---

### The Auth API Route (Catch-All)

📄 **File:** `src/app/api/auth/[...all]/route.ts`

```typescript
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

**This is deceptively simple but very powerful.**

The `[...all]` in the folder name is a Next.js **catch-all route**. It matches ALL paths under `/api/auth/`, for example:

- `POST /api/auth/sign-in/email` → BetterAuth handles login
- `POST /api/auth/sign-out` → BetterAuth handles logout
- `GET /api/auth/session` → BetterAuth returns the current session
- `POST /api/auth/forget-password` → BetterAuth handles password reset

`toNextJsHandler(auth)` converts BetterAuth's internal request handler into Next.js-compatible GET and POST handler functions.

**You don't need to write any of these routes yourself** — BetterAuth provides them all automatically.

---

### Login Flow — Step by Step

When a user enters their email and password on the login page and clicks "Sign In":

```
Step 1: Browser sends POST /api/auth/sign-in/email
        Body: { email: "user@example.com", password: "mypassword123" }

Step 2: The catch-all route.ts receives the request
        → Passes it to BetterAuth's internal handler

Step 3: BetterAuth looks up the User by email
        → SELECT * FROM users WHERE email = 'user@example.com'

Step 4: BetterAuth looks up the Account for that user
        → SELECT * FROM account WHERE user_id = '<id>' AND provider_id = 'credential'

Step 5: BetterAuth hashes the submitted password and compares it to the stored hash
        → If they match: ✅ Authentication successful
        → If they don't: ❌ Return 401 Unauthorized

Step 6: BetterAuth creates a new Session record in the database
        → INSERT INTO session (id, user_id, token, expires_at, ...) VALUES (...)

Step 7: BetterAuth sets an HTTP-only cookie in the browser
        → Set-Cookie: better-auth.session_token=<token>; HttpOnly; Secure; SameSite=Lax

Step 8: The browser stores the cookie automatically
        → Every future request will include this cookie

Step 9: BetterAuth returns a JSON response with the session data
        → { user: {...}, session: {...} }
```

**Key security details:**

- The cookie is `HttpOnly` — JavaScript cannot read it (prevents XSS attacks from stealing the session)
- The cookie is `Secure` — only sent over HTTPS in production
- The `token` in the cookie is a random UUID, not the user's ID or password

---

### Logout Flow

```
Step 1: Browser sends POST /api/auth/sign-out
        (Cookie is automatically included in the request)

Step 2: BetterAuth reads the session token from the cookie

Step 3: BetterAuth deletes the Session record from the database
        → DELETE FROM session WHERE token = '<token>'

Step 4: BetterAuth clears the cookie from the browser
        → Set-Cookie: better-auth.session_token=; Max-Age=0

Step 5: The browser no longer has a session cookie
        → User is now "logged out"
```

---

## 6. Company Onboarding Flow

This is a **custom endpoint** we built — not something BetterAuth provides. It handles signing up a brand new company (organization + owner user + roles + permissions) in a single atomic operation.

### Validation Layer (Zod)

📄 **File:** `src/modules/onboarding/domain/validation.ts`

Before any database operation, we validate **all incoming data** using Zod. Think of Zod as a "gatekeeper" — if any data is wrong, it throws an error immediately.

```typescript
export const OnboardingRequestSchema = z
  .object({
    // Organization info
    organizationName: z.string().min(2).max(100),
    organizationSlug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, hyphens')
      .transform((val) => val.toLowerCase().trim()), // Auto-clean input
    organizationEmail: z.string().email().optional().or(z.literal('')),
    organizationPhone: z.string().max(20).optional(),
    website: z.string().url().optional(),

    // Owner info
    ownerName: z.string().min(2).max(100),
    ownerEmail: z
      .string()
      .email()
      .transform((val) => val.toLowerCase().trim()), // Auto-normalize to lowercase
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),

    // Localization
    country: z.string().min(2).max(100),
    timezone: z.string().min(2),
    currency: z
      .string()
      .length(3)
      .transform((val) => val.toUpperCase()), // Auto-convert "usd" → "USD"

    // Compliance
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  // Cross-field validation: password must match confirmPassword
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

**Why Zod?**

- It validates AND transforms data in one step (e.g., automatically lowercasing emails)
- Cross-field validation (password === confirmPassword) is handled at the schema level
- `parseAsync()` returns clean, typed data — or throws a `ZodError` with precise field-level error messages
- No more manually checking `if (!body.email)` everywhere

---

### Domain Types (DTOs)

📄 **File:** `src/modules/onboarding/domain/types.ts`

DTOs (Data Transfer Objects) are **TypeScript interfaces** that define the shape of data moving between layers.

```typescript
// What the use case RECEIVES (input)
export interface OnboardingRequestDto {
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
  country: string;
  timezone: string;
  currency: string;
  acceptTerms: boolean;
  // ... optional fields
}

// What the use case RETURNS (output)
export interface OnboardingResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    fullName: string;
    status: string;
    createdAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    // ... organization fields
  };
}
```

**Why not just use Prisma's generated types directly?**

The Prisma types include ALL database fields, including internal fields like `deletedAt`, `sessionVersion`, `failedLoginAttempts` etc. DTOs give us **control over what data crosses layer boundaries** — we only expose what's needed.

---

### The Onboarding API Route

📄 **File:** `src/app/api/onboarding/route.ts`

This is the **entry point** for company registration. It's a thin controller — its only job is:

1. Parse and validate the request
2. Call the use case
3. Handle errors and format the response

```typescript
export async function POST(req: NextRequest) {
  try {
    // Step 1: Validate input (throws ZodError if invalid)
    const body = await req.json();
    const validatedData = await OnboardingRequestSchema.parseAsync(body);

    // Step 2: Run the business logic
    const onboardingUseCase = new OnboardCompanyUseCase();
    const onboardedResult = await onboardingUseCase.execute(validatedData);

    // Step 3: Auto-login the new user via BetterAuth
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: validatedData.ownerEmail,
        password: validatedData.password,
      },
      asResponse: true, // Get raw Response so we can copy the cookies
      headers: req.headers,
    });

    // Step 4: Build the response
    const response = NextResponse.json(
      {
        success: true,
        user: onboardedResult.user,
        organization: onboardedResult.organization,
        session: signInData.session,
      },
      { status: 201 },
    );

    // Step 5: Copy BetterAuth's session cookies to our response
    // (This is how the browser gets the login session after onboarding)
    const setCookieHeaders = signInResponse.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      response.headers.append('set-cookie', cookie);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof OnboardingConflictError) {
      return NextResponse.json(
        { error: 'Conflict', field: error.field },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
```

**Why do we manually copy cookies?**

When BetterAuth's `signInEmail` is called with `asResponse: true`, it returns a raw `Response` object. The session cookie is inside that response's headers. Since we're constructing a **new** `NextResponse` to send back to the client, we need to manually copy the `Set-Cookie` headers from BetterAuth's response into our response. Otherwise, the user's browser wouldn't receive the session cookie and they'd be logged out immediately after onboarding.

---

### The Use Case — `OnboardCompanyUseCase`

📄 **File:** `src/modules/onboarding/application/onboard-company.usecase.ts`

This is the **heart of the onboarding feature**. A "use case" is a class that contains one specific piece of business logic. It doesn't know about HTTP, cookies, or UI — it just runs a business operation.

```typescript
export class OnboardCompanyUseCase {
  async execute(data: OnboardingRequestDto): Promise<OnboardingResponseDto> {
    // Step 1: Hash the password OUTSIDE the transaction
    // (CPU-intensive work shouldn't hold a DB transaction open)
    const authCtx = await auth.$context;
    const hashedPassword = await authCtx.password.hash(data.password);

    // Step 2: Run ALL database writes in a single atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // ... all DB operations here
    });

    return result;
  }
}
```

**Why hash the password before the transaction?**

Password hashing (bcrypt/argon2) is deliberately slow — it's a security feature that makes brute-force attacks harder. If we hash inside the database transaction, we'd hold the transaction open for ~100ms+, blocking other database operations. By hashing first, the transaction remains fast.

---

### What happens inside the Transaction?

A **database transaction** is a group of operations that either ALL succeed or ALL fail together. If any step fails (e.g., database error), the entire transaction is rolled back as if nothing happened.

```
prisma.$transaction(async (tx) => {

  a. Check if email already exists → throw OnboardingConflictError if yes

  b. Check if org slug already exists → throw OnboardingConflictError if yes

  c. Upsert global permissions
     → INSERT INTO permissions (...) ON CONFLICT DO NOTHING
     → Uses skipDuplicates: true so re-running onboarding won't fail

  d. Create the User record
     → status: 'ACTIVE' (owner is immediately active, not INVITED)
     → emailVerified: true (no email verification needed for direct signup)

  e. Create the Account record (credentials)
     → providerId: 'credential' (email+password login)
     → password: hashedPassword (never store plain text!)

  f. Create the Organization record

  g. Create the OrganizationMember record
     → Links the user to the organization
     → status: 'ACTIVE', joinedAt: now()

  h. Loop through DEFAULT_ROLES and for each:
     - Create the Role in the database
     - Look up the permission IDs from the permissions table
     - Batch insert RolePermission records (linking role to permissions)
     - If this is the "Company Admin" role:
         → Create a UserRole record assigning this role to the owner member

  return { user, organization }
})
```

**Why use a transaction?**

Imagine if the user was created (step d) but then the organization creation failed (step f). You'd have an orphaned user account with no organization — a broken state. With a transaction, if anything fails, the entire operation is rolled back: no user, no organization, no half-created data.

---

## 7. RBAC — Role-Based Access Control

### Core Concept: What is RBAC?

RBAC (Role-Based Access Control) is a way to manage **who can do what** in your application.

Instead of assigning permissions to individual users (which becomes unmanageable with many users), you:

1. Define **permissions** (atomic actions: `employees:create`, `payroll:approve`)
2. Group permissions into **roles** (`HR`, `Manager`, `Employee`)
3. Assign **roles** to users

If you want to change what all HR users can do, you just update the HR role — not every individual HR user.

```
Permission ──< RolePermission >── Role ──< UserRole >── OrganizationMember ──── User
```

---

### The Permission Catalog

📄 **File:** `src/modules/onboarding/infrastructure/default-catalog.ts`

All available permissions in the system are defined here as a constant array:

```typescript
export const DEFAULT_PERMISSIONS: CatalogPermission[] = [
  // Format: module:action
  { module: 'organization', action: 'read',   code: 'organization:read',   description: 'View organization details' },
  { module: 'organization', action: 'update', code: 'organization:update', description: 'Update organization settings' },

  { module: 'members', action: 'create', code: 'members:create', description: 'Add new organization members' },
  { module: 'members', action: 'read',   code: 'members:read',   description: 'View organization members list' },
  { module: 'members', action: 'update', code: 'members:update', description: 'Edit member details' },
  { module: 'members', action: 'delete', code: 'members:delete', description: 'Remove members' },
  { module: 'members', action: 'invite', code: 'members:invite', description: 'Invite new users' },

  { module: 'roles',     action: 'create', code: 'roles:create', ... },
  { module: 'roles',     action: 'assign', code: 'roles:assign', ... },

  { module: 'employees', action: 'create', code: 'employees:create', ... },
  { module: 'employees', action: 'read',   code: 'employees:read',   ... },
  { module: 'employees', action: 'update', code: 'employees:update', ... },
  { module: 'employees', action: 'delete', code: 'employees:delete', ... },

  { module: 'leaves',     action: 'create',  code: 'leaves:create',  ... },
  { module: 'leaves',     action: 'approve', code: 'leaves:approve', ... },
  { module: 'leaves',     action: 'reject',  code: 'leaves:reject',  ... },

  { module: 'attendance', action: 'create',  code: 'attendance:create',  ... },
  { module: 'attendance', action: 'approve', code: 'attendance:approve', ... },

  { module: 'payroll', action: 'create',  code: 'payroll:create',  ... },
  { module: 'payroll', action: 'approve', code: 'payroll:approve', ... },
];
```

**Current modules and their actions:**

| Module         | Available Actions                                         |
| -------------- | --------------------------------------------------------- |
| `organization` | `read`, `update`                                          |
| `members`      | `create`, `read`, `update`, `delete`, `invite`            |
| `roles`        | `create`, `read`, `update`, `delete`, `assign`            |
| `employees`    | `create`, `read`, `update`, `delete`                      |
| `leaves`       | `create`, `read`, `update`, `delete`, `approve`, `reject` |
| `attendance`   | `create`, `read`, `update`, `approve`                     |
| `payroll`      | `create`, `read`, `update`, `approve`                     |

---

### Default Roles and Their Permissions

Four system roles are created automatically for every new organization:

#### 👑 Company Admin

- **Description:** Full administrative access to all modules
- **Permissions:** ALL permissions (every single one in `DEFAULT_PERMISSIONS`)
- **isSystem:** `true` (cannot be deleted)
- **Assigned to:** The organization owner on signup

#### 👩‍💼 HR

- **Description:** Manage members, employees, attendance, leaves, payroll
- **Notable permissions:** Can invite members, approve leaves, approve attendance, create payroll
- **Cannot:** Delete employees, delete roles, manage billing

#### 👔 Manager

- **Description:** Team leads who approve requests for their teams
- **Notable permissions:** Can read members/employees, approve leaves, approve attendance
- **Cannot:** Invite members, create employees, run payroll

#### 👷 Employee

- **Description:** Self-service access only
- **Notable permissions:** Can apply for leaves, view own profile, clock in/out
- **Cannot:** See other employees' details, approve anything, access payroll

**Visual permission matrix:**

| Permission            | Company Admin | HR  | Manager | Employee |
| --------------------- | :-----------: | :-: | :-----: | :------: |
| `organization:read`   |      ✅       | ✅  |   ✅    |    ✅    |
| `organization:update` |      ✅       | ❌  |   ❌    |    ❌    |
| `members:invite`      |      ✅       | ✅  |   ❌    |    ❌    |
| `employees:create`    |      ✅       | ✅  |   ❌    |    ❌    |
| `employees:delete`    |      ✅       | ❌  |   ❌    |    ❌    |
| `leaves:approve`      |      ✅       | ✅  |   ✅    |    ❌    |
| `payroll:approve`     |      ✅       | ❌  |   ❌    |    ❌    |
| `roles:assign`        |      ✅       | ✅  |   ❌    |    ❌    |

---

### How Roles Are Assigned

During onboarding, the owner is automatically assigned "Company Admin":

```typescript
// In onboard-company.usecase.ts
if (roleDef.name === 'Company Admin') {
  await tx.userRole.create({
    data: {
      organizationId: organization.id,
      organizationMemberId: member.id, // The owner's membership record
      roleId: role.id,
      assignedBy: user.id,
    },
  });
}
```

**What this creates in the database:**

```sql
INSERT INTO user_roles (organization_id, organization_member_id, role_id, assigned_by)
VALUES ('org-uuid', 'member-uuid', 'company-admin-role-uuid', 'owner-user-uuid');
```

For future employees invited to the org, role assignment would happen through an admin action in the UI, inserting another row into `user_roles`.

---

### How to Add a New Permission

**Scenario:** You want to add a `reports:export` permission for exporting reports.

**Step 1:** Add the permission to the catalog

📄 Edit `src/modules/onboarding/infrastructure/default-catalog.ts`:

```typescript
export const DEFAULT_PERMISSIONS: CatalogPermission[] = [
  // ... existing permissions ...

  // Reports — ADD THIS
  {
    module: 'reports',
    action: 'export',
    code: 'reports:export',
    description: 'Export data reports to CSV/Excel',
  },
];
```

**Step 2:** Decide which roles should have this permission

```typescript
export const DEFAULT_ROLES: CatalogRole[] = [
  {
    name: 'Company Admin',
    // Company Admin gets ALL permissions automatically:
    permissionCodes: DEFAULT_PERMISSIONS.map((p) => p.code), // ← no change needed here
  },
  {
    name: 'HR',
    permissionCodes: [
      // ... existing permissions ...
      'reports:export', // ← ADD this line to give HR this permission
    ],
  },
  // Manager and Employee won't have it by default
];
```

**Step 3:** The permission will be seeded automatically for new organizations

Since the onboarding use case runs `createMany({ skipDuplicates: true })`, existing orgs can be migrated by running a one-time script, or by upsert logic.

**Step 4:** Use the permission in your feature code

```typescript
// Example: checking permission before rendering a UI component
const canExportReports = userPermissions.includes('reports:export');

// Example: checking permission in an API route
async function exportReports(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const permissions = await getUserPermissions(session.user.id, organizationId);

  if (!permissions.includes('reports:export')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... proceed with export
}
```

---

### How to Add a New Role

**Scenario:** You want a "Finance" role that can read and approve payroll but nothing else.

**Step 1:** Add the role to the default catalog

📄 Edit `src/modules/onboarding/infrastructure/default-catalog.ts`:

```typescript
export const DEFAULT_ROLES: CatalogRole[] = [
  // ... existing roles ...

  // ADD THIS:
  {
    name: 'Finance',
    description:
      'Finance team members with access to payroll and financial reports.',
    isSystem: true, // true = cannot be deleted by org admins
    permissionCodes: [
      'organization:read',
      'payroll:read',
      'payroll:approve',
      'employees:read', // Need to see who they are paying
    ],
  },
];
```

**Step 2:** The role will be created automatically for new organizations

For existing organizations, you would need a migration script or an admin UI to create the new role.

**Note:** Setting `isSystem: false` means org admins can customize or delete this role. Setting `isSystem: true` means it's locked — only developers can change it via code.

---

## 8. Clean Architecture Pattern Used

This codebase follows a **simplified Clean Architecture** (also called Layered Architecture) for the onboarding module. Here's what each layer means:

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                │
│   src/app/api/onboarding/route.ts           │
│   src/app/(auth)/login/page.tsx             │
│   (HTTP routes, UI pages)                   │
└─────────────────────┬───────────────────────┘
                      │ calls
┌─────────────────────▼───────────────────────┐
│           Application Layer                 │
│   src/modules/onboarding/application/       │
│   onboard-company.usecase.ts                │
│   (Business logic, orchestration)           │
└─────────────────────┬───────────────────────┘
                      │ uses
┌─────────────────────▼───────────────────────┐
│             Domain Layer                    │
│   src/modules/onboarding/domain/            │
│   types.ts, validation.ts                  │
│   (Business rules, types, contracts)        │
└─────────────────────┬───────────────────────┘
                      │ implemented by
┌─────────────────────▼───────────────────────┐
│          Infrastructure Layer               │
│   src/modules/onboarding/infrastructure/    │
│   default-catalog.ts                        │
│   src/lib/db.ts (database)                  │
│   (External services, default data)         │
└─────────────────────────────────────────────┘
```

**Why this structure?**

- **Separation of concerns**: Each layer has ONE responsibility
- **Testability**: You can test the use case in isolation without HTTP or a real database
- **Maintainability**: When the UI changes, only the presentation layer changes
- **Scalability**: When you add a new feature (e.g., "offboarding"), you create a new module with the same structure

---

## 9. Data Flow Diagrams

### Onboarding Flow

```
Browser
  │
  │  POST /api/onboarding
  │  { organizationName, ownerEmail, password, ... }
  │
  ▼
route.ts (Presentation)
  │
  ├── Zod.parseAsync(body) ──► validation.ts
  │        │
  │        └── ❌ ZodError → return 400 Bad Request
  │
  ├── new OnboardCompanyUseCase().execute(data)
  │        │
  │        ├── auth.$context.password.hash(password) ← CPU work outside TX
  │        │
  │        └── prisma.$transaction([
  │               Check email uniqueness
  │               Check slug uniqueness
  │               Upsert global permissions    ← from default-catalog.ts
  │               Create User
  │               Create Account (credentials)
  │               Create Organization
  │               Create OrganizationMember
  │               For each DEFAULT_ROLE:
  │                 Create Role
  │                 Create RolePermissions (batch)
  │                 If 'Company Admin': Create UserRole
  │            ])
  │                  │
  │                  └── ❌ OnboardingConflictError → return 409 Conflict
  │
  ├── auth.api.signInEmail({ email, password, asResponse: true })
  │        │
  │        └── BetterAuth: verify credentials → create Session → set cookie
  │
  └── Copy Set-Cookie headers → return 201 Created
```

### Login Flow

```
Browser
  │
  │  POST /api/auth/sign-in/email
  │  { email: "user@example.com", password: "secret" }
  │
  ▼
[...all]/route.ts (BetterAuth catch-all)
  │
  └── BetterAuth internal:
        │
        ├── SELECT * FROM users WHERE email = ?
        ├── SELECT * FROM account WHERE user_id = ? AND provider_id = 'credential'
        ├── verify(password, account.password) → ✅ or ❌
        ├── INSERT INTO session (token, user_id, expires_at) VALUES (...)
        └── Set-Cookie: better-auth.session_token=<token>; HttpOnly
```

### Permission Check Flow (future implementation)

```
User makes request to a protected endpoint
  │
  ├── Read session cookie → auth.api.getSession()
  │        │
  │        └── SELECT * FROM session WHERE token = ?
  │               → returns { user: { id, email, ... } }
  │
  ├── Get user's permissions for current organization:
  │   SELECT p.code FROM permissions p
  │   JOIN role_permissions rp ON rp.permission_id = p.id
  │   JOIN user_roles ur ON ur.role_id = rp.role_id
  │   JOIN organization_members om ON om.id = ur.organization_member_id
  │   WHERE om.user_id = ? AND om.organization_id = ?
  │
  ├── permissions.includes('required:permission') → ✅ or ❌ 403
  │
  └── Proceed with request
```

---

## 10. Environment Variables

| Variable              | Required  | Description                                                                      |
| --------------------- | --------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`        | ✅ Yes    | PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/dbname`  |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes    | Public URL of the app. Used in emails and CORS. Default: `http://localhost:3000` |
| `REDIS_URL`           | 🔜 Future | Redis for caching/queues. Not used yet.                                          |
| `S3_ENDPOINT`         | 🔜 Future | Object storage for file uploads (avatars, documents).                            |
| `MAIL_HOST`           | 🔜 Future | SMTP server for sending emails (invitations, password resets).                   |
| `NODE_ENV`            | ✅ Yes    | `development` or `production`. Controls Prisma singleton behavior.               |

**BetterAuth automatically generates its own `BETTER_AUTH_SECRET`** (a random signing key for sessions) if not set. In production, always set this explicitly to a strong random string.

---

## 11. Common Questions (FAQ)

#### Q: Why does BetterAuth need its own `User` table structure?

BetterAuth expects specific table names and columns (`Session`, `Account`, `User`, `Verification`). Our schema includes these tables, which is why the Prisma adapter works — it maps BetterAuth's operations to our database schema.

#### Q: Can a user belong to multiple organizations?

Yes! The `OrganizationMember` table is the many-to-many bridge. One user can have multiple `OrganizationMember` records (one per org they belong to). Each membership is independent — a user can be a "Manager" in Org A and an "Employee" in Org B.

#### Q: What is the `sessionVersion` field on the User model?

It's a mechanism to **invalidate all sessions for a user at once**. If you increment `sessionVersion` on a user (e.g., when they change their password), all existing sessions with the old version number become invalid. This ensures that when someone resets their password, any attacker who stole an old session token can no longer use it.

#### Q: Why are roles scoped per-organization instead of being global?

Because "Admin" in Company A should have no access to Company B's data. If roles were global, a mistake could grant access across organizations. Org-scoped roles enforce strict data isolation between tenants.

#### Q: What happens if the onboarding transaction fails midway?

The entire transaction is rolled back. Prisma's `$transaction` ensures atomicity — either all 7+ steps succeed together, or none of them are committed to the database. The user and organization are either **both created** or **neither is created**.

#### Q: Where should I add authorization checks in API routes?

In every API route that requires authentication, you should:

1. Get the session: `const session = await auth.api.getSession({ headers: req.headers })`
2. If no session: return `401 Unauthorized`
3. Query the user's permissions from `user_roles → role_permissions → permissions`
4. If missing required permission: return `403 Forbidden`
5. Otherwise, proceed with the handler

This pattern will be centralized into a reusable `withAuth(permissionCode)` middleware wrapper in future development.

---

_Last updated: July 2026 | Branch: `read/auth` | Authors: Harsh Dev_
