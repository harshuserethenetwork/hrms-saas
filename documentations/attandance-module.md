# Attendance Module - Architecture Flow & API Documentation

## Overview

This document explains the complete architecture, design, and request flow of the Attendance
module. It covers every **available** API endpoint:

- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `POST /api/attendance/break/start`
- `POST /api/attendance/break/end`
- `POST /api/attendance/today`
- `POST /api/attendance/history`

It is split into two halves:

1. **Backend / API contract** — the 3-layer (Route Handler → Service → Repository) flow, the Prisma
   data model and every endpoint's request/response contract and error cases.
2. **Frontend integration** — the client-side service, the data-transfer objects, the custom React
   hooks (`useLiveAttendance`, `useAttendanceTimer`) and the `LiveAttendanceCard` component that
   renders the dashboard widget, with a deep dive on **how the live countdown is implemented** after
   the user clicks **Clock In**.

---

## 1. High-Level Architecture

The module follows a clean **3-layer (3-tier) architecture** layered on top of Next.js App Router
Route Handlers:

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: ROUTE HANDLER (Presentation / HTTP)                    │
│  src/app/api/attendance/.../route.ts                             │
│  - Receives the HTTP request                                     │
│  - Validates the incoming membership ID (id)                     │
│  - Calls the service layer                                       │
│  - Wraps the result in a JSON response (success flag + data)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: SERVICE (Business Logic / Domain Rules)                │
│  src/modules/attendance/services/attendance.service.ts           │
│  - Contains ALL business rules & validations                     │
│  - Orchestrates multiple repository calls                        │
│  - Throws human-readable domain errors                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: REPOSITORY (Persistence / DB Access)                   │
│  src/repository/attendance/attendance.repository.ts              │
│  src/repository/attendance/attendance-break.repository.ts        │
│  - Single named DB operations only (no business rules)           │
│  - Uses Prisma ORM → PostgreSQL                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   PostgreSQL (Prisma)   │
                    │   tables: attendances   │
                    │   tables: attendance_breaks
                    └─────────────────────────┘
```

**Key principle:** the Route Handler NEVER contains business logic, the Service NEVER touches the
database directly, and the Repository NEVER contains business rules.

---

## 2. File Structure (Attendance API)

```
src/
├── app/
│   └── api/
│       └── attendance/
│           ├── clock-in/
│           │   └── route.ts                 # POST  Clock in for today
│           ├── clock-out/
│           │   └── route.ts                 # POST  Clock out for today
│           ├── break/
│           │   └── start/
│           │       ├── route.ts             # POST  Start a break
│           │       └── end/
│           │           └── route.ts         # POST  End the active break
│           ├── today/
│           │   └── route.ts                 # POST  Get today's attendance record
│           └── history/
│               └── route.ts                 # POST  Paginated attendance history
│
├── modules/
│   ├── attendance/
│   │   ├── domain/
│   │   │   └── attendance.types.ts          # DTOs: AttendanceRecordDto, AttendanceBreakDto, AttendanceApiResponse
│   │   └── services/
│   │       └── attendance.service.ts        # AttendanceService (business logic)
│   └── dashboard/
│       ├── domain/
│       │   └── types.ts                     # AttendanceStatus + dashboard widget types
│       ├── hooks/
│       │   ├── use-live-attendance.ts       # Driving hook for the LiveAttendanceCard
│       │   └── use-attendance-timer.ts      # Lightweight elapsed-time hook
│       └── components/
│           └── live-attendance-card.tsx     # Dashboard widget using useLiveAttendance
│
├── services/
│   └── attendance/
│       └── attendance.service.ts            # Client-side fetch wrappers for the 6 endpoints
│
├── repository/
│   └── attendance/
│       ├── attendance.repository.ts         # AttendanceRepository (attendance table)
│       └── attendance-break.repository.ts   # AttendanceBreakRepository (breaks table)
│
├── lib/
│   └── db.ts                                # Shared PrismaClient singleton
│
prisma/
└── schema.prisma                            # Attendance + AttendanceBreak models
```

### Files Connected to Create the Complete Flow

| File                                                        | Layer         | Responsibility                                                                                                                       |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/attendance/<endpoint>/route.ts`                | Route Handler | HTTP entry point, membership-id validation, JSON response mapping                                                                    |
| `src/modules/attendance/services/attendance.service.ts`     | Service       | All business rules, validation sequencing, orchestration                                                                             |
| `src/repository/attendance/attendance.repository.ts`        | Repository    | `Attendance` CRUD: `createAttendance`, `findTodayAttendance`, `updateAttendance`, `findActiveBreak`, `createBreak`, `endBreak`, etc. |
| `src/repository/attendance/attendance-break.repository.ts`  | Repository    | `AttendanceBreak`-specific operations (currently a secondary/alternate repository for breaks)                                        |
| `src/lib/db.ts`                                             | DB client     | Exports a singleton `prisma` (PrismaClient with pg adapter) injected into repositories                                               |
| `prisma/schema.prisma`                                      | Schema        | `Attendance` and `AttendanceBreak` models, enums, unique constraints                                                                 |
| `src/services/attendance/attendance.service.ts`             | Client API    | Browser-side `fetch` wrappers (`clockIn`, `clockOut`, `startBreak`, `endBreak`, `getTodayAttendance`)                                |
| `src/modules/attendance/domain/attendance.types.ts`         | Client DTOs   | `AttendanceRecordDto`, `AttendanceBreakDto`, `AttendanceApiResponse<T>` typed over the wire                                          |
| `src/modules/dashboard/domain/types.ts`                     | UI types      | `AttendanceStatus` (`'checked-out'                                                                                                   | 'checked-in' | 'working' | 'on-break'`), widget prop types |
| `src/modules/dashboard/hooks/use-live-attendance.ts`        | Hook          | Owns today's record, action pending-state, the 1-second heartbeat and live duration/progress math                                    |
| `src/modules/dashboard/hooks/use-attendance-timer.ts`       | Hook          | Standalone elapsed-time counter (`HH:MM:SS`) from a start timestamp; not currently wired to the card                                 |
| `src/modules/dashboard/components/live-attendance-card.tsx` | Component     | Renders badge, check-in/out times, working duration, progress bar and the state-machine action buttons                               |
| `src/modules/dashboard/components/dashboard-page.tsx`       | Page          | Mounts `<LiveAttendanceCard dailyTargetHours={8} />` in Row 1                                                                        |

> **Note on the two repositories:** The service currently imports only
> `attendanceRepository` (from `attendance.repository.ts`), which already contains the
> break-related methods (`findActiveBreak`, `createBreak`, `endBreak`) and the generic
> `updateAttendance` used by clock-out. `attendance-break.repository.ts` is a parallel/cleaner
> repository that owns the `AttendanceBreak` aggregate separately. Both use the same shared Prisma
> client. If you want to use the dedicated break repository, update the service import accordingly.

---

## 3. Data Model (Prisma)

### Attendance (`attendances` table)

```prisma
model Attendance {
  id                       String           @id @default(uuid())
  organizationMemberId     String           @map("organization_member_id")
  organizationMember       OrganizationMember @relation(fields: [organizationMemberId], references: [id], onDelete: Cascade)
  attendanceDate           DateTime         @map("attendance_date") @db.Date
  clockInAt                DateTime?        @map("clock_in_at")
  clockOutAt               DateTime?        @map("clock_out_at")
  totalPresenceSeconds     Int              @default(0) @map("total_presence_seconds")
  totalBreakSeconds        Int              @default(0) @map("total_break_seconds")
  totalWorkingSeconds      Int              @default(0) @map("total_working_seconds")
  overtimeSeconds          Int              @default(0) @map("overtime_seconds")
  status                   AttendanceStatus @default(IN_PROGRESS)
  clockInIpAddress         String?          @map("clock_in_ip_address")
  clockOutIpAddress        String?          @map("clock_out_ip_address")
  clockInDevice            String?          @map("clock_in_device")
  clockOutDevice           String?          @map("clock_out_device")
  remarks                  String?
  breaks                   AttendanceBreak[]

  @@unique([organizationMemberId, attendanceDate])   // one record per member per day
  @@index([organizationMemberId])
  @@index([attendanceDate])
  @@index([status])
  @@map("attendances")
}
```

### AttendanceBreak (`attendance_breaks` table)

```prisma
model AttendanceBreak {
  id              String     @id @default(uuid())
  attendanceId    String     @map("attendance_id")
  attendance      Attendance @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
  startedAt       DateTime   @map("started_at")
  endedAt         DateTime?  @map("ended_at")
  durationSeconds Int        @default(0) @map("duration_seconds")

  @@index([attendanceId])
  @@map("attendance_breaks")
}
```

**Important design decisions:**

- `@@unique([organizationMemberId, attendanceDate])` guarantees exactly **one attendance record per
  member per calendar day**. This is why clock-in is idempotent per day.
- A day is "scoped" to midnight: the service normalizes `new Date()` to `00:00:00.000` before
  querying (`today.setHours(0,0,0,0)`), matching the `@db.Date` column.
- Breaks are linked to an attendance record via `attendanceId`; "active break" = a break whose
  `endedAt` is `NULL`.
- Durations are stored in **seconds**.
- The calculated totals (`totalPresenceSeconds`, `totalBreakSeconds`, `totalWorkingSeconds`) are
  written at clock-out time.

---

## 4. Endpoint Flows (Detailed)

### 4.1 POST `/api/attendance/clock-in`

**Purpose:** Record the start of the employee's workday.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/clock-in/route.ts
  1. Parse JSON body, extract `id` (membership id).
  2. If missing → 400 "Membership ID is required".
  3. Call attendanceService.clockIn(id).

Service: AttendanceService.clockIn(membershipId)
  4. Normalize `today` to midnight (00:00:00.000).
  5. attendanceRepository.findTodayAttendance(membershipId, today)
       → queries attendances WHERE organizationMemberId = ? AND attendanceDate = ?
         (composite unique key, includes breaks ordered by startedAt asc)
  6. If an existing record is found → throw "You have already clocked in today."
  7. attendanceRepository.createAttendance({
       organizationMemberId: membershipId,
       attendanceDate: today,
       clockInAt: new Date()          // current server time
     })
  8. Return the created attendance row.

Route
  9. Wrap in { success: true, data: attendance } → 201.
     On thrown error → { success: false, message } → 500.
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organizationMemberId": "membership-id",
    "attendanceDate": "2026-08-11T00:00:00.000Z",
    "clockInAt": "2026-08-11T09:00:00.000Z",
    "clockOutAt": null,
    "totalPresenceSeconds": 0,
    "totalBreakSeconds": 0,
    "totalWorkingSeconds": 0,
    "status": "IN_PROGRESS",
    "breaks": []
  }
}
```

**Error cases:** missing id (400) · already clocked in today (500 w/ message).

---

### 4.2 POST `/api/attendance/clock-out`

**Purpose:** Record the end of the employee's workday, auto-close any active break, compute the
day's totals and finalize the attendance status.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/clock-out/route.ts
  1. Parse JSON body, extract `id`.
  2. If missing → 400 "Membership ID is required".
  3. Call attendanceService.clockOut(id).

Service: AttendanceService.clockOut(membershipId)
  4. Normalize `today` to midnight.
  5. attendanceRepository.findTodayAttendance(membershipId, today)
       → includes breaks ordered by startedAt asc
  6. If no attendance → throw "You have not clocked in today."
  7. If attendance.clockOutAt is already set → throw "You have already clocked out for today."
  8. Guard attendance.clockInAt; if missing → throw "Attendance record is missing a clock-in time."
  9. clockOutAt = new Date().
  10. Auto-end any active break (attendance.breaks where endedAt is null):
        durationSeconds = floor((clockOutAt - break.startedAt) / 1000)
        attendanceRepository.endBreak(activeBreak.id, clockOutAt, durationSeconds)
  11. totalPresenceSeconds = floor((clockOutAt - clockInAt) / 1000)
  12. totalBreakSeconds   = Σ all break durations (live breaks add their elapsed seconds)
  13. totalWorkingSeconds = max(totalPresenceSeconds - totalBreakSeconds, 0)
  14. attendanceRepository.updateAttendance(attendance.id, {
        clockOutAt,
        totalPresenceSeconds,
        totalBreakSeconds,
        totalWorkingSeconds,
        status: 'PRESENT'
      })
  15. Return the updated attendance row.

Route
  16. Wrap in { success: true, data: attendance } → 200.
      On error → { success: false, message } → 500.
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid",
    "organizationMemberId": "membership-id",
    "attendanceDate": "2026-08-11T00:00:00.000Z",
    "clockInAt": "2026-08-11T09:00:00.000Z",
    "clockOutAt": "2026-08-11T18:00:00.000Z",
    "totalPresenceSeconds": 32400,
    "totalBreakSeconds": 1800,
    "totalWorkingSeconds": 30600,
    "status": "PRESENT",
    "breaks": [
      {
        "id": "break-uuid",
        "startedAt": "2026-08-11T13:00:00.000Z",
        "endedAt": "2026-08-11T13:30:00.000Z",
        "durationSeconds": 1800
      }
    ]
  }
}
```

**Error cases:** missing id (400) · not clocked in (500) · already clocked out (500) · missing
clock-in time (500).

---

### 4.3 POST `/api/attendance/break/start`

**Purpose:** Start a break for today's attendance record.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/break/start/route.ts
  1. Parse JSON body, extract `id`.
  2. If missing → 400 "Membership ID is required".
  3. Call attendanceService.startBreak(id).

Service: AttendanceService.startBreak(membershipId)
  4. Normalize `today` to midnight.
  5. attendanceRepository.findTodayAttendance(membershipId, today)
  6. If no attendance → throw "You must clock in before starting a break."
  7. If attendance.clockOutAt is set → throw "You have already clocked out for today."
  8. attendanceRepository.findActiveBreak(attendance.id)
       → WHERE attendanceId = ? AND endedAt IS NULL ORDER BY startedAt DESC
  9. If an active break exists → throw "You already have an active break."
  10. attendanceRepository.createBreak({
        attendance: { connect: { id: attendance.id } },
        startedAt: new Date()
      })
  11. Return the created break record.

Route
  12. Wrap in { success: true, data: breakRecord } → 201.
      On error → { success: false, message } → 500.
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "attendanceId": "attendance-uuid",
    "startedAt": "2026-08-11T13:00:00.000Z",
    "endedAt": null,
    "durationSeconds": 0
  }
}
```

**Error cases:** missing id (400) · not clocked in (500) · already clocked out (500) ·
already has active break (500).

---

### 4.4 POST `/api/attendance/break/end`

**Purpose:** End the currently active break and store its duration.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/break/end/route.ts
  1. Parse JSON body, extract `id`.
  2. If missing → 400 "Membership ID is required".
  3. Call attendanceService.endBreak(id).

Service: AttendanceService.endBreak(membershipId)
  4. Normalize `today` to midnight.
  5. attendanceRepository.findTodayAttendance(membershipId, today)
  6. If no attendance → throw "You have not clocked in today."
  7. attendanceRepository.findActiveBreak(attendance.id)   // endedAt IS NULL
  8. If no active break → throw "You do not have an active break."
  9. Capture endedAt = new Date().
  10. durationSeconds = floor((endedAt - activeBreak.startedAt) / 1000)
  11. attendanceRepository.endBreak(activeBreak.id, endedAt, durationSeconds)
        → UPDATE attendance_breaks SET endedAt = ?, durationSeconds = ? WHERE id = ?
  12. Return the updated break record.

Route
  13. Wrap in { success: true, data: breakRecord } → 200.
      On error → { success: false, message } → 500.
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "attendanceId": "attendance-uuid",
    "startedAt": "2026-08-11T13:00:00.000Z",
    "endedAt": "2026-08-11T13:30:00.000Z",
    "durationSeconds": 1800
  }
}
```

**Error cases:** missing id (400) · not clocked in (500) · no active break (500).

---

### 4.5 POST `/api/attendance/today`

**Purpose:** Fetch today's attendance record (with its breaks) for the member.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/today/route.ts
  1. Parse JSON body, extract `id`.
  2. If missing → 400 "Membership ID is required".
  3. Call attendanceService.getTodayAttendance(id).

Service: AttendanceService.getTodayAttendance(membershipId)
  4. Normalize `today` to midnight.
  5. attendanceRepository.findTodayAttendance(membershipId, today)
       → one record per (member, day), breaks included & sorted ascending
  6. If not found → throw "You have not clocked in yet."
  7. Return the attendance record.

Route
  8. Wrap in { success: true, data: attendance } → 200.
     If not clocked in → { success: true, data: null } → 200 (not an error).
     On error → { success: false, message } → 500.
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid",
    "organizationMemberId": "membership-id",
    "attendanceDate": "2026-08-11T00:00:00.000Z",
    "clockInAt": "2026-08-11T09:00:00.000Z",
    "clockOutAt": "2026-08-11T18:00:00.000Z",
    "totalPresenceSeconds": 32400,
    "totalBreakSeconds": 1800,
    "totalWorkingSeconds": 30600,
    "status": "PRESENT",
    "breaks": [
      {
        "id": "break-uuid",
        "startedAt": "2026-08-11T13:00:00.000Z",
        "endedAt": "2026-08-11T13:30:00.000Z",
        "durationSeconds": 1800
      }
    ]
  }
}
```

**Error cases:** missing id (400) · not clocked in yet (200 with `data: null`).

---

### 4.6 POST `/api/attendance/history`

**Purpose:** Fetch the member's attendance history, paginated most-recent-first.

**Request body:**

```json
{ "id": "<organizationMemberId>", "page": 1, "pageSize": 10 }
```

`page` and `pageSize` are optional; they default to `page = 1`, `pageSize = 10` in the service.

**Flow:**

```
Route: src/app/api/attendance/history/route.ts
  1. Parse JSON body, extract `id`, `page`, `pageSize`.
  2. If id missing → 400 "Membership ID is required".
  3. Call attendanceService.getAttendanceHistory(membershipId, page, pageSize).

Service: AttendanceService.getAttendanceHistory(membershipId, page = 1, pageSize = 10)
  4. Normalize page = max(1, floor(page)); pageSize = min(50, max(1, floor(pageSize))).
  5. Parallel: repository.getAttendanceHistory(membershipId, { page, pageSize })
                + repository.countAttendance(membershipId)
  6. totalPages = max(1, ceil(totalItems / pageSize)).
  7. Return { items, pagination: { page, pageSize, totalItems, totalPages } }.

Route
  8. Wrap in { success: true, data: history } → 200.
     On error → { success: false, message } → 500.
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "attendance-uuid",
        "organizationMemberId": "membership-id",
        "attendanceDate": "2026-08-11T00:00:00.000Z",
        "clockInAt": "2026-08-11T09:00:00.000Z",
        "clockOutAt": "2026-08-11T18:00:00.000Z",
        "totalPresenceSeconds": 32400,
        "totalBreakSeconds": 1800,
        "totalWorkingSeconds": 30600,
        "status": "PRESENT",
        "breaks": []
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

**Error cases:** missing id (400) · unexpected server error (500).

---

### 4.7 Client-side API service

Every endpoint is wrapped for the browser in `src/services/attendance/attendance.service.ts`.
All six calls funnel through one private helper:

```ts
async function postJson<T>(url: string, body: unknown): Promise<T>;
```

`postJson` does a `POST` with `Content-Type: application/json` and `credentials: 'include'`
(cookies flow with every request). It then:

1. JSON-parses the body defensively (falls back to `null` on parse failure).
2. Treats **non-2xx responses** (`!response.ok`) **and** `success: false` payloads as failures.
3. Throws an `Error` built from the server `message` — so every caller has **one consistent
   failure path** and never inspects `Response.ok` manually.

The six wrappers exposed by the client service:

| Function (export)                                    | Endpoint                           | Resolves to                   |
| ---------------------------------------------------- | ---------------------------------- | ----------------------------- |
| `clockIn(membershipId)`                              | `POST /api/attendance/clock-in`    | `AttendanceRecordDto`         |
| `clockOut(membershipId)`                             | `POST /api/attendance/clock-out`   | `AttendanceRecordDto`         |
| `startBreak(membershipId)`                           | `POST /api/attendance/break/start` | `AttendanceBreakDto`          |
| `endBreak(membershipId)`                             | `POST /api/attendance/break/end`   | `AttendanceBreakDto`          |
| `getTodayAttendance(membershipId)`                   | `POST /api/attendance/today`       | `AttendanceRecordDto \| null` |
| `getAttendanceHistory(membershipId, page, pageSize)` | `POST /api/attendance/history`     | history envelope              |

The dashboard only uses the first five (the history wrapper is unused by the UI today, but is
available for an attendance-history page).

---

## 5. State Machine (Expected Daily Flow)

```
        clock-in                    break/start            break/end                 clock-out
NO RECORD ──────► CLOCKED IN ───────────────► ON BREAK ────────────────► CLOCKED IN ──────► CLOCKED OUT
                  (IN_PROGRESS)             (active break)            (break ended,     (status PRESENT,
                                                                       duration saved)   totals computed,
                                                                                         active break
                                                                                         auto-ended)

today/endpoint can be called at any point to read the current state.
```

Guard rules enforced by the service at each step:

| Endpoint      | Guard / Precondition                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| `clock-in`    | No attendance record for today yet (rejects duplicate clock-in)               |
| `clock-out`   | Attendance exists for today · not already clocked out · clock-in time present |
| `break/start` | Attendance exists for today · not clocked out · no active break               |
| `break/end`   | Attendance exists for today · an active break exists                          |
| `today`       | Attendance exists for today                                                   |

---

## 6. Design Notes & Conventions

- **Date scoping:** Every service method normalizes "today" to `00:00:00.000` so the query aligns
  with the `@db.Date` column and the `@@unique([organizationMemberId, attendanceDate])` constraint.
- **Breaks always sorted:** `findTodayAttendance` includes breaks ordered by `startedAt asc`, so the
  client receives a chronologically ordered timeline without re-sorting.
- **Clock-out auto-closes breaks:** If the employee forgets to end their break, clock-out ends the
  active break automatically and includes its elapsed seconds in `totalBreakSeconds`, keeping the
  break timeline consistent.
- **Totals clamped to zero:** `totalWorkingSeconds` is clamped with `Math.max(..., 0)` so an
  over-long break can never produce negative working time.
- **Error mapping:** Services throw plain `Error` with user-friendly messages; route handlers catch
  them and return `{ success: false, message }`. Prisma errors propagate untouched from the
  repository so the service can apply a single error-mapping strategy.
- **Dependency injection:** Repositories take the `PrismaClient` in their constructor
  (`new AttendanceRepository(client = db)`) for unit-testability, defaulting to the shared singleton
  from `@/lib/db`.
- **Naming convention:** `*.route.ts` for handlers, `*.service.ts` for business logic,
  `*.repository.ts` for persistence.

---

## 7. Frontend Integration (Dashboard Live Attendance)

The dashboard renders the attendance feature through one widget,
`LiveAttendanceCard` (`src/modules/dashboard/components/live-attendance-card.tsx`),
mounted in Row 1 of `DashboardPage`:

```tsx
<LiveAttendanceCard dailyTargetHours={8} />
```

### 7.1 Frontend data flow (high level)

```
   Button click            Client API service          Next.js Route Handler
   LiveAttendanceCard ──►  attendance.service.ts  ──►  /api/attendance/...
        │  (useLiveAttendance hook)                       │
        │  setPendingAction(action)                       ▼
        │  call relevant wrapper                     AttendanceService
        │                                               (business rules)
        ▼                                                   │
   on success: setAttendance(...)                           ▼
        │                                             AttendanceRepository
        ▼                                                 (Prisma → PG)
   status re-derives → 1s heartbeat starts
        │
        ▼
   computeWorkingSeconds(attendance, now) ─► duration text + progress %
```

### 7.2 Client-side domain types

**Wire DTOs** — `src/modules/attendance/domain/attendance.types.ts`:

- `AttendanceRecordDto` — one day's record: `clockInAt`, `clockOutAt` (ISO strings), the persisted
  totals (`totalPresenceSeconds`, `totalWorkingSeconds`, `overtimeSeconds`, `status`) and an
  optional `breaks: AttendanceBreakDto[]`.
- `AttendanceBreakDto` — `startedAt`, `endedAt (null while active)`, `durationSeconds`.
- `AttendanceApiResponse<T>` — `{ success, message?, data }`, the envelope every endpoint returns.

**UI status type** — `src/modules/dashboard/domain/types.ts`:

```ts
export type AttendanceStatus =
  'checked-out' | 'checked-in' | 'working' | 'on-break';
```

`'checked-in'` is part of the static type but the _derived_ status never emits it (see below); it is
reserved for future/props-only use.

### 7.3 `useLiveAttendance` — the driving hook

File: `src/modules/dashboard/hooks/use-live-attendance.ts`. It is a **state-full, non-querying
hook** (no React Query/TanStack — it owns plain `useState` + `useEffect`).

**State held by the hook:**

| State              | Purpose                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `attendance`       | Today's `AttendanceRecordDto \| null`; mutated locally after every successful action   |
| `isInitialLoading` | `true` until the mount fetch resolves                                                  |
| `pendingAction`    | `'clock-in' \| 'clock-out' \| 'break-start' \| 'break-end' \| null` — gates loading UI |
| `now`              | `Date.now()` snapshot refreshed once per second while the day is open (the heartbeat)  |

**Source of truth for the member:** the hook reads `memberId` from the Zustand auth store
(`src/stores/auth.store.ts`) via `useAuthStore(s => s.member?.id)`. Every network call and every
load effect depends on `memberId`, so the record
is refetched whenever the logged-in member changes.

**Pure derivations (all `useMemo`):**

- `status = deriveStatus(attendance)`:
  - no record / no `clockInAt` / `clockOutAt` set → `'checked-out'`
  - an active break (`!endedAt`) exists → `'on-break'`
  - otherwise → `'working'`
- `isDayOpen = status === 'working' || status === 'on-break'`
- `workingDurationText = formatDuration(computeWorkingSeconds(attendance, now))`
- `progressPercentage = min(100, workingHours / dailyTargetHours · 100)`

**Mount-load effect:** on mount (and every time `memberId` changes) it calls
`getTodayAttendance(memberId)` via the client service. The `/today` endpoint resolves a
never-clocked-in state with `data: null`, so `attendance` starts as `null` and the card shows the
**Clock In** button. A `cancelled` flag guards against setting state after unmount, and failures are
surfaced with `toast.error`.

**Shared action runner — `runAction`:** every handler is built from one template:

```ts
const runAction = useCallback(
  async (action, request, successMessage?) => {
    if (!memberId) return;
    setPendingAction(action); // disable every button + show spinner
    try {
      await request(); // fire the API call
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  },
  [memberId],
);
```

This gives a **single, consistent pending/error/success lifecycle** for all four actions.

**The four action handlers** (each `useCallback`-memoized on `[runAction, memberId]`):

| Handler            | Action          | API call               | Local state update after success           |
| ------------------ | --------------- | ---------------------- | ------------------------------------------ |
| `handleClockIn`    | `'clock-in'`    | `clockIn(memberId)`    | `setAttendance({ ...record, breaks: [] })` |
| `handleClockOut`   | `'clock-out'`   | `clockOut(memberId)`   | merge returned record, keep local `breaks` |
| `handleStartBreak` | `'break-start'` | `startBreak(memberId)` | append the new open break to `breaks`      |
| `handleEndBreak`   | `'break-end'`   | `endBreak(memberId)`   | replace the matching break row by id       |

> **Optimistic-state pattern:** the hook does **not** refetch `/today` after each action. Instead it
> patches the local `attendance` object with the just-returned record, so the UI updates instantly
> and the countdown restarts immediately — no extra round trip.

**Returned to the consumer:** `status`, `attendance`, `isInitialLoading`, `pendingAction`,
`checkInTime`, `checkOutTime` (formatted `HH:MM` via `toLocaleTimeString`), `workingDurationText`,
`progressPercentage`, and the four handlers.

### 7.4 `LiveAttendanceCard` — the component

File: `src/modules/dashboard/components/live-attendance-card.tsx`. It is a pure render of the hook
plus a **UI state machine** that decides which buttons are visible/enabled:

| Condition               | Primary button           | Secondary button       |
| ----------------------- | ------------------------ | ---------------------- |
| `!hasClockedIn`         | **Clock In** (primary)   | Take Break (disabled)  |
| `hasClockedOut`         | "Clocked Out" (disabled) | —                      |
| `status === 'on-break'` | **End Break** (break)    | Clock Out (secondary)  |
| otherwise (working)     | **Clock Out** (primary)  | Take Break (secondary) |

Supporting pieces:

- `ActionButton` — small wrapper; when `loading` is true it swaps the icon for an animated
  `Loader2` spinner and disables the button.
- `BADGE_META` — maps each `AttendanceStatus` to a label + light/dark Tailwind classes for the
  status pill and the pulsing dot.
- `actionsDisabled = isInitialLoading || pendingAction !== null` — the **entire** button grid is
  frozen while the mount fetch is running or any request is in flight, guaranteeing no double
  clicks and no interleaved actions.
- Progress bar width is driven by `progressPercentage` with a 500 ms transition.

### 7.5 `useAttendanceTimer` — the lightweight alternative

File: `src/modules/dashboard/hooks/use-attendance-timer.ts`. A standalone 24-line hook:

```ts
export function useAttendanceTimer(startTime: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = !startTime
    ? 0
    : Math.max(0, Math.floor((now - new Date(startTime).getTime()) / 1000));
  // ... formats HH:MM:SS, returns { elapsed, totalSeconds }
}
```

Key differences vs `useLiveAttendance`:

- It runs its 1-second interval **unconditionally** from mount (even at idle) and never accounts for
  breaks.
- It dates from the earlier dashboard mock iteration and **is not currently wired into the card** —
  `LiveAttendanceCard` uses `useLiveAttendance` exclusively. Keep it as a reference for a
  self-contained `HH:MM:SS` timer (e.g. a "shift elapsed since X" pill).

---

## 8. The Live Countdown — How the Timer Runs After Clicking "Clock In"

This is the core mechanic. The approach is **timestamp re-derivation**, _not_ incrementing a
counter.

> **In one sentence:** after Clock In succeeds, the component starts a 1-second `setInterval`
> heartbeat that refreshes a `now` timestamp; every tick re-runs a pure function that recomputes
> working seconds from the _server-returned clock-in timestamp_ minus break elapsed, so the
> displayed countdown always equals real elapsed wall-clock time and can never drift.

### 8.1 Step by step on click

```
1. User clicks "Clock In"
      ActionButton.onClick → handleClockIn()

2. pendingAction = 'clock-in'
      → spinner on the Clock In button, all buttons disabled (actionsDisabled)

3. handleClockIn → runAction('clock-in', async () => {
        const record = await clockInRequest(memberId);
        setAttendance({ ...record, breaks: [] });
     })
      POST { id } → /api/attendance/clock-in → AttendanceService.clockIn()
      → row written (clockInAt = now, status IN_PROGRESS) → 201 + record

4. setAttendance(...) commits →
      deriveStatus(attendance) === 'working'
      → isDayOpen flips false → true

5. The heartbeat effect re-runs (its only dependency is isDayOpen):
      useEffect(() => {
        if (!isDayOpen) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
      }, [isDayOpen]);

6. Every 1000 ms → setNow(Date.now()) → React re-renders →
      computeWorkingSeconds(attendance, now) → formatDuration(...)
      → "00h 00m 05s", "00h 00m 06s", … the countdown "runs"

7. Toast "Clocked in. Have a productive day!" → pendingAction = null (buttons reactivate)

   If the request fails → toast.error → pendingAction = null → interval was never started.
```

### 8.2 The two pieces that make the timer tick

**(a) A gated 1-second heartbeat on a single `now` state**

```ts
// use-live-attendance.ts — the ONLY timer in the whole feature (besides the unused
// useAttendanceTimer). It exists while the day is open and is fully destroyed otherwise.
useEffect(() => {
  if (!isDayOpen) return;
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [isDayOpen]);
```

- Interval starts when the store flip from `Status !== open` → working/on-break (i.e. right after
  clock-in resolves), and `clearInterval` runs:
  - on unmount,
  - and whenever `isDayOpen` becomes false (clock-out or full page reload resolving to a closed day).
- Days that are never opened run **zero** intervals.

**(b) A pure recomputation of duration from authoritative timestamps**

```ts
function computeWorkingSeconds(attendance, now) {
  if (!attendance?.clockInAt) return 0;
  if (attendance.clockOutAt) {
    return Math.max(0, attendance.totalWorkingSeconds ?? 0); // server is the truth
  }
  const clockInMs = new Date(attendance.clockInAt).getTime();
  const presence = Math.max(0, Math.floor((now - clockInMs) / 1000));
  let breakSeconds = 0;
  for (const br of attendance.breaks ?? []) {
    if (br.endedAt) breakSeconds += Math.max(0, br.durationSeconds);
    else
      breakSeconds += Math.max(
        0,
        Math.floor((now - new Date(br.startedAt).getTime()) / 1000),
      );
  }
  return Math.max(0, presence - breakSeconds);
}
```

For an open day it computes: **working = (now − clockInAt) − (closed-break durations + live-active-break
elapsed)**. Active breaks therefore make the countdown _pause_ at the exact moment `handleStartBreak`
resolves, and it resumes when `handleEndBreak` resolves — because `attendance.breaks` is patched
with the new open/closed break and the next tick recomputes.

### 8.3 Why this approach (why not a counter)?

- **No drift, ever.** A naive `seconds++` accumulates error from timer throttling (background tabs,
  laptop sleep, coarse timers). Here each tick reads a fresh `Date.now()` and recomputes from the
  immutable server timestamp, so even if React re-renders late the number _snaps to the correct
  elapsed value_ — the heartbeat is just a re-render trigger, not the source of truth.
- **Breaks stay correct.** Because elapsed time is derived from the break timeline, break time is
  deducted automatically and consistently with the server.
- **Progress bar is free.** `progressPercentage` runs through the exact same `computeWorkingSeconds`
  math, so the bar and counter can never disagree.
- **Server stays authoritative.** The moment the day closes, the client stops computing and shows
  `totalWorkingSeconds` as persisted by `clock-out`, so the final numbers always match the backend.

### 8.4 When the countdown stops

- On **Clock Out**: `setAttendance(record)` → status `'checked-out'` → `isDayOpen === false` →
  the effect cleanup runs `clearInterval`. From then on `computeWorkingSeconds` returns the persisted
  `totalWorkingSeconds` (a frozen, server-final number).
- On **unmount** (navigating away from the dashboard): cleanup runs and the interval dies with the
  component; next visit refetches `/today` and restarts from the server truth.
- On page **reload**: the mount-load effect fetches `/today` again, derives the correct status, and
  restarts (or keeps stopped) the heartbeat accordingly.

---

## 9. Method & Hook Reference (Quick Summary)

### 9.1 `useLiveAttendance({ dailyTargetHours = 8 })` — returns

| Return                | Type                          | Notes                                           |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| `status`              | `AttendanceStatus`            | derived: `checked-out` / `working` / `on-break` |
| `attendance`          | `AttendanceRecordDto \| null` | today's record or `null` (not clocked in)       |
| `isInitialLoading`    | `boolean`                     | true during mount fetch                         |
| `pendingAction`       | `AttendanceAction \| null`    | which request is in flight (drives spinners)    |
| `checkInTime`         | `string \| null`              | `HH:MM` localized                               |
| `checkOutTime`        | `string \| null`              | `HH:MM` localized                               |
| `workingDurationText` | `string`                      | `HHh MMm SSs`, `'--:--:--'` while loading       |
| `progressPercentage`  | `number`                      | `0..100`, capped                                |
| `handleClockIn`       | `() => Promise<void>`         | clock in for today                              |
| `handleClockOut`      | `() => Promise<void>`         | clock out, auto-closes break, persists totals   |
| `handleStartBreak`    | `() => Promise<void>`         | open a break                                    |
| `handleEndBreak`      | `() => Promise<void>`         | close the active break with duration            |

### 9.2 Internal helpers in `use-live-attendance.ts`

| Helper                                   | Responsibility                                       |
| ---------------------------------------- | ---------------------------------------------------- |
| `deriveStatus(attendance)`               | attendance → UI status (source of the state machine) |
| `getActiveBreak(attendance)`             | first break with `endedAt === null`                  |
| `computeWorkingSeconds(attendance, now)` | live working seconds for the heartbeat               |
| `formatDuration(seconds)`                | `86400` → `24h 00m 00s` (zero-padded)                |
| `formatClockTime(iso)`                   | ISO string → localized `HH:MM`, `null` safe          |
| `getErrorMessage(err)`                   | `Error.message` or a generic fallback string         |

### 9.3 `useAttendanceTimer(startTime)` — returns

| Return         | Type     | Notes                                  |
| -------------- | -------- | -------------------------------------- |
| `elapsed`      | `string` | `HH:MM:SS` from `startTime` (or zeros) |
| `totalSeconds` | `number` | raw elapsed seconds                    |

### 9.4 Lifecycle summary (abbreviated)

```
mount ──► load /today ──► derive status
                              │
            not clocked in ───┤──► show Clock In (no heartbeat)
            working / break ──┘──► start 1s heartbeat ─► recompute per tick
                                clearInterval on clock-out / unmount / day closed
```

---

## 10. Not Implemented / Future Work

- **Status derivation** — `clockOut()` still hardcodes `status: 'PRESENT'`. Deriving `HALF_DAY` /
  `ABSENT` from working hours or overtime policy is future work.
- **`overtimeSeconds`** — the schema field exists but is not yet computed at clock-out.
- **Attendance history UI** — the `POST /api/attendance/history` endpoint and
  `getAttendanceHistory` client wrapper exist, but no page consumes them yet.
- **IP / device capture** — `clockInIpAddress`, `clockInDevice`, etc. are modeled but never written.
- **`useAttendanceTimer` unused** — kept as a reference; `LiveAttendanceCard` relies on
  `useLiveAttendance`.
- **Multi-tab / clock-skew truth** — while the day is open the displayed duration is computed
  client-side from `memberId`-scoped server timestamps; the persisted `totalWorkingSeconds` (written
  at clock-out) is the final source of truth. A dedicated "what a day is open" reconciliation /
  polling strategy is not implemented.
