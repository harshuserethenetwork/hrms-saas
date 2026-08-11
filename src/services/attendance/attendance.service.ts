import type {
  AttendanceApiResponse,
  AttendanceBreakDto,
  AttendanceRecordDto,
} from '@/modules/attendance/domain/attendance.types';

/**
 * Shared POST helper for the attendance route handlers.
 *
 * Every attendance endpoint accepts `{ id: membershipId }` and returns
 * `{ success, data, message? }`. Non-2xx responses and `success: false`
 * payloads are normalized into thrown `Error`s so callers get one consistent
 * failure path and never have to inspect `Response.ok`.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as AttendanceApiResponse<T> | null;

  if (!response.ok || !payload || payload.success === false) {
    throw new Error(
      payload?.message ?? 'Something went wrong. Please try again.',
    );
  }

  return payload.data as T;
}

export async function clockIn(
  membershipId: string,
): Promise<AttendanceRecordDto> {
  return postJson<AttendanceRecordDto>('/api/attendance/clock-in', {
    id: membershipId,
  });
}

export async function clockOut(
  membershipId: string,
): Promise<AttendanceRecordDto> {
  return postJson<AttendanceRecordDto>('/api/attendance/clock-out', {
    id: membershipId,
  });
}

export async function startBreak(
  membershipId: string,
): Promise<AttendanceBreakDto> {
  return postJson<AttendanceBreakDto>('/api/attendance/break/start', {
    id: membershipId,
  });
}

export async function endBreak(
  membershipId: string,
): Promise<AttendanceBreakDto> {
  return postJson<AttendanceBreakDto>('/api/attendance/break/end', {
    id: membershipId,
  });
}

/**
 * Fetches the member's attendance for today.
 *
 * Returns `null` when the member has not clocked in yet — the route handler
 * resolves that state with `data: null` instead of a hard error.
 */
export async function getTodayAttendance(
  membershipId: string,
): Promise<AttendanceRecordDto | null> {
  return postJson<AttendanceRecordDto | null>('/api/attendance/today', {
    id: membershipId,
  });
}
