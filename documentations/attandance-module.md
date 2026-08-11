# Attendance Module - Architecture Flow & API Documentation

## Overview

This document explains the complete architecture, design, and request flow of the Attendance
module. It covers every **available** API endpoint:

- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `POST /api/attendance/break/start`
- `POST /api/attendance/break/start/end`
- `POST /api/attendance/today`

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
│           └── today/
│               └── route.ts                 # POST  Get today's attendance record
│
├── modules/
│   └── attendance/
│       └── services/
│           └── attendance.service.ts        # AttendanceService (business logic)
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

| File                                                       | Layer         | Responsibility                                                                                                                       |
| ---------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/attendance/<endpoint>/route.ts`               | Route Handler | HTTP entry point, membership-id validation, JSON response mapping                                                                    |
| `src/modules/attendance/services/attendance.service.ts`    | Service       | All business rules, validation sequencing, orchestration                                                                             |
| `src/repository/attendance/attendance.repository.ts`       | Repository    | `Attendance` CRUD: `createAttendance`, `findTodayAttendance`, `updateAttendance`, `findActiveBreak`, `createBreak`, `endBreak`, etc. |
| `src/repository/attendance/attendance-break.repository.ts` | Repository    | `AttendanceBreak`-specific operations (currently a secondary/alternate repository for breaks)                                        |
| `src/lib/db.ts`                                            | DB client     | Exports a singleton `prisma` (PrismaClient with pg adapter) injected into repositories                                               |
| `prisma/schema.prisma`                                     | Schema        | `Attendance` and `AttendanceBreak` models, enums, unique constraints                                                                 |

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

### 4.4 POST `/api/attendance/break/start/end`

**Purpose:** End the currently active break and store its duration.

**Request body:**

```json
{ "id": "<organizationMemberId>" }
```

**Flow:**

```
Route: src/app/api/attendance/break/start/end/route.ts
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
  8. Wrap in { success: true, data: attendance } → 201.
     On error → { success: false, message } → 500.
```

**Response (201):**

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

**Error cases:** missing id (400) · not clocked in yet (500 w/ message).

---

## 5. State Machine (Expected Daily Flow)

```
        clock-in                    break/start            break/start/end              clock-out
NO RECORD ──────► CLOCKED IN ───────────────► ON BREAK ────────────────► CLOCKED IN ──────► CLOCKED OUT
                  (IN_PROGRESS)             (active break)            (break ended,     (status PRESENT,
                                                                       duration saved)   totals computed,
                                                                                         active break
                                                                                         auto-ended)

today/endpoint can be called at any point to read the current state.
```

Guard rules enforced by the service at each step:

| Endpoint          | Guard / Precondition                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `clock-in`        | No attendance record for today yet (rejects duplicate clock-in)               |
| `clock-out`       | Attendance exists for today · not already clocked out · clock-in time present |
| `break/start`     | Attendance exists for today · not clocked out · no active break               |
| `break/start/end` | Attendance exists for today · an active break exists                          |
| `today`           | Attendance exists for today                                                   |

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

## 7. Not Implemented / Future Work

- **Status derivation** — `clockOut()` currently hardcodes `status: 'PRESENT'`. Deriving
  `HALF_DAY` / `ABSENT` from working hours or overtime policy is future work.
- **`overtimeSeconds`** — the schema field exists but is not yet computed at clock-out.
- **Frontend integration** — `src/app/[slug]/attendance/page.tsx` is currently a placeholder and
  there are no React Query hooks or client API services wired to these endpoints yet.
