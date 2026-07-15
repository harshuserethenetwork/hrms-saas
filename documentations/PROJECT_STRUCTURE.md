# PROJECT_STRUCTURE.md

# HRMS SaaS - Project Structure Guide

## Purpose

This document explains the project architecture, folder structure, coding conventions, and where every new file should be created.

If you are contributing to this project, **always read this document before creating new files or folders.**

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL
- React Query
- Zustand
- Zod
- React Hook Form

---

# Project Philosophy

The project follows **Feature-Based Architecture**.

Instead of grouping files by type, each business module owns its own components, services, hooks, schemas, and API logic.

This makes the application easier to maintain, scale, and onboard new developers.

---

# High-Level Folder Structure

```text
src/

├── app/
├── modules/
├── components/
├── providers/
├── config/
├── constants/
├── hooks/
├── lib/
├── services/
├── store/
├── styles/
├── types/
├── utils/
```

---

# app/

Purpose

Contains only Next.js routing.

Never place business logic here.

Responsibilities

- Routing
- Layouts
- Metadata
- Route Groups
- Loading Pages
- Error Pages
- Route Handlers

Example

```text
app/

(auth)/
(dashboard)/

api/

layout.tsx

loading.tsx

error.tsx

not-found.tsx
```

Create files here when

- Creating a new page
- Creating a route
- Creating a layout
- Creating an API route

Do NOT create

- Components
- Services
- Business logic

---

# modules/

Purpose

Contains every business feature.

Every feature owns its own code.

Example

```text
modules/

employee/

attendance/

leave/

payroll/

dashboard/

calendar/

announcement/

profile/

settings/
```

Each module should follow this structure.

```text
employee/

components/

hooks/

schemas/

services/

repository/

actions/

types/

utils/

constants/

api/
```

Example

Employee module

```text
modules/

employee/

components/

employee-card.tsx

employee-form.tsx

employee-table.tsx

hooks/

useEmployees.ts

services/

employee.service.ts

schemas/

employee.schema.ts

types/

employee.types.ts
```

Create files here when

- Building a feature
- Creating feature-specific components
- Creating feature-specific services
- Creating feature-specific hooks

Never place reusable components here.

---

# components/

Purpose

Contains reusable UI shared across multiple modules.

Structure

```text
components/

ui/

shared/

layout/
```

---

## components/ui/

Contains shadcn/ui components.

Examples

```text
button.tsx

input.tsx

dialog.tsx

card.tsx

table.tsx
```

Only generic UI belongs here.

Never modify shadcn components unless absolutely necessary.

---

## components/shared/

Contains reusable application components.

Examples

```text
page-header/

stat-card/

search-bar/

empty-state/

loading/

status-badge/

filter-bar/

confirm-dialog/

avatar-stack/
```

Use this folder when the component is used by multiple modules.

---

## components/layout/

Contains application layout components.

Examples

```text
app-shell.tsx

sidebar.tsx

topbar.tsx

footer.tsx

breadcrumb.tsx

logo.tsx

user-menu.tsx
```

These components define the application's overall layout.

---

# providers/

Purpose

Contains all global React Providers.

Example

```text
providers/

theme-provider.tsx

query-provider.tsx

auth-provider.tsx

index.tsx
```

Do not place feature logic here.

Only global providers.

---

# config/

Purpose

Contains application configuration.

Examples

```text
navigation.ts

sidebar.ts

theme.ts

dashboard.ts
```

Examples of configuration

- Sidebar Menu
- Navigation Items
- Dashboard Cards
- Theme Tokens
- Feature Configuration

Configuration should not contain business logic.

---

# constants/

Purpose

Contains reusable constant values.

Examples

```text
roles.ts

permissions.ts

routes.ts

status.ts

leave-types.ts

regex.ts
```

Never hardcode values inside components.

Bad

```ts
role === 'ADMIN';
```

Good

```ts
role === Roles.ADMIN;
```

---

# hooks/

Purpose

Contains reusable React Hooks.

Examples

```text
useDebounce.ts

usePagination.ts

useMediaQuery.ts

useLocalStorage.ts
```

Only generic hooks belong here.

Feature-specific hooks belong inside the module.

---

# lib/

Purpose

Contains integrations with external libraries.

Examples

```text
db/

auth/

redis/

email/

storage/

logger/
```

Examples

```text
lib/db

Prisma Client

lib/auth

Authentication

lib/email

Email Service

lib/logger

Application Logger
```

Never place business logic here.

---

# services/

Purpose

Contains shared services used across multiple modules.

Examples

```text
api.service.ts

upload.service.ts

notification.service.ts
```

If the service belongs to only one module, place it inside that module instead.

---

# store/

Purpose

Contains global state management.

Example

```text
auth.store.ts

theme.store.ts

notification.store.ts
```

Only application-wide state belongs here.

Feature state should remain inside the module whenever possible.

---

# styles/

Purpose

Contains global styles.

Examples

```text
globals.css

variables.css

animations.css
```

Do not create feature-specific CSS files.

Use Tailwind utilities whenever possible.

---

# types/

Purpose

Contains shared TypeScript types.

Examples

```text
api.ts

common.ts

pagination.ts

response.ts
```

Feature-specific types belong inside the module.

---

# utils/

Purpose

Contains reusable helper functions.

Examples

```text
cn.ts

date.ts

currency.ts

validation.ts

download.ts
```

Utilities should be pure functions.

---

# File Naming Convention

Components

```text
employee-card.tsx
```

Hooks

```text
use-employees.ts
```

Services

```text
employee.service.ts
```

Schemas

```text
employee.schema.ts
```

Types

```text
employee.types.ts
```

Constants

```text
employee.constants.ts
```

Utilities

```text
employee.utils.ts
```

---

# Where Should I Create This?

## New Page

Create inside

```text
app/
```

---

## New Route

Create inside

```text
app/
```

---

## New Dashboard Widget

If reusable

```text
components/shared/
```

If only for Dashboard

```text
modules/dashboard/components/
```

---

## New Employee Form

```text
modules/employee/components/
```

---

## New Payroll Service

```text
modules/payroll/services/
```

---

## New Validation Schema

```text
modules/<feature>/schemas/
```

---

## New Hook

Reusable

```text
hooks/
```

Feature-specific

```text
modules/<feature>/hooks/
```

---

## New API Call

```text
modules/<feature>/api/
```

---

## New Prisma Helper

```text
lib/db/
```

---

## New Authentication Helper

```text
lib/auth/
```

---

## New Sidebar Menu

```text
config/sidebar.ts
```

---

## New Permission

```text
constants/permissions.ts
```

---

## New Role

```text
constants/roles.ts
```

---

## New Status Enum

```text
constants/status.ts
```

---

# Architecture Rules

✅ Keep business logic inside modules.

✅ Keep reusable UI inside components.

✅ Keep routing inside app.

✅ Keep configuration inside config.

✅ Keep constants inside constants.

✅ Keep utilities pure.

✅ Avoid duplicate code.

✅ Prefer composition over inheritance.

✅ Never hardcode strings.

✅ Never access the database directly from UI components.

---

# Golden Rule

Before creating a new file, ask:

1. Is it reusable?

   - Yes → `components/`, `hooks/`, `utils/`, or `services/`
   - No → Put it inside the appropriate `modules/<feature>/` folder.

2. Is it related to routing?

   - Yes → `app/`

3. Is it business logic?

   - Yes → `modules/`

Following these conventions keeps the project scalable, predictable, and easy for any developer to understand and contribute to.
