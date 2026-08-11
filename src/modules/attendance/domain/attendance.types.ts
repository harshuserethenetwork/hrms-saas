/**
 * Client-side DTOs for the attendance API.
 *
 * Dates arrive over the wire as ISO 8601 strings because the route handlers
 * serialize Prisma `Date` values through JSON.
 */

export interface AttendanceBreakDto {
  id: string;
  attendanceId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecordDto {
  id: string;
  organizationMemberId: string;
  attendanceDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  totalPresenceSeconds: number;
  totalBreakSeconds: number;
  totalWorkingSeconds: number;
  overtimeSeconds: number;
  status: string;
  clockInIpAddress: string | null;
  clockOutIpAddress: string | null;
  clockInDevice: string | null;
  clockOutDevice: string | null;
  remarks: string | null;
  breaks?: AttendanceBreakDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
