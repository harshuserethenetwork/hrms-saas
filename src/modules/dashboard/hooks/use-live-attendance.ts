'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';
import {
  clockIn as clockInRequest,
  clockOut as clockOutRequest,
  endBreak as endBreakRequest,
  getTodayAttendance,
  startBreak as startBreakRequest,
} from '@/services/attendance/attendance.service';
import type {
  AttendanceBreakDto,
  AttendanceRecordDto,
} from '@/modules/attendance/domain/attendance.types';
import type { AttendanceStatus } from '../domain/types';

export type AttendanceAction =
  'clock-in' | 'clock-out' | 'break-start' | 'break-end';

interface UseLiveAttendanceOptions {
  dailyTargetHours?: number;
}

interface UseLiveAttendanceResult {
  status: AttendanceStatus;
  attendance: AttendanceRecordDto | null;
  isInitialLoading: boolean;
  pendingAction: AttendanceAction | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingDurationText: string;
  progressPercentage: number;
  handleClockIn: () => Promise<void>;
  handleClockOut: () => Promise<void>;
  handleStartBreak: () => Promise<void>;
  handleEndBreak: () => Promise<void>;
}

const DEFAULT_DAILY_TARGET_HOURS = 8;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function getActiveBreak(
  attendance: AttendanceRecordDto | null,
): AttendanceBreakDto | undefined {
  return attendance?.breaks?.find((br) => !br.endedAt);
}

function deriveStatus(
  attendance: AttendanceRecordDto | null,
): AttendanceStatus {
  if (!attendance || !attendance.clockInAt || attendance.clockOutAt) {
    return 'checked-out';
  }
  return getActiveBreak(attendance) ? 'on-break' : 'working';
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Computes the live working time for today.
 *
 * While the day is still open, presence is measured from the clock-in
 * timestamp minus accumulated break time (the active break is counted with its
 * live duration). Once clocked out, the server-persisted totals are used.
 */
function computeWorkingSeconds(
  attendance: AttendanceRecordDto | null,
  now: number,
): number {
  if (!attendance?.clockInAt) return 0;

  if (attendance.clockOutAt) {
    return Math.max(0, attendance.totalWorkingSeconds ?? 0);
  }

  const clockInMs = new Date(attendance.clockInAt).getTime();
  if (Number.isNaN(clockInMs)) return 0;

  const presenceSeconds = Math.max(0, Math.floor((now - clockInMs) / 1000));

  let breakSeconds = 0;
  for (const br of attendance.breaks ?? []) {
    if (br.endedAt) {
      breakSeconds += Math.max(0, br.durationSeconds);
    } else {
      const startedMs = new Date(br.startedAt).getTime();
      if (!Number.isNaN(startedMs)) {
        breakSeconds += Math.max(0, Math.floor((now - startedMs) / 1000));
      }
    }
  }

  return Math.max(0, presenceSeconds - breakSeconds);
}

function formatClockTime(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useLiveAttendance({
  dailyTargetHours = DEFAULT_DAILY_TARGET_HOURS,
}: UseLiveAttendanceOptions = {}): UseLiveAttendanceResult {
  const member = useAuthStore((state) => state.member);
  const memberId = member?.id;

  const [attendance, setAttendance] = useState<AttendanceRecordDto | null>(
    null,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<AttendanceAction | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  const status = useMemo(() => deriveStatus(attendance), [attendance]);

  const isDayOpen = status === 'working' || status === 'on-break';

  useEffect(() => {
    if (!isDayOpen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isDayOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadToday = async () => {
      try {
        // Always hit an await before touching state so the initial load and
        // the "no member" path share one state flow.
        const record = memberId
          ? await getTodayAttendance(memberId)
          : await Promise.resolve(null);
        if (!cancelled) setAttendance(record);
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    };

    void loadToday();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const runAction = useCallback(
    async (
      action: AttendanceAction,
      request: () => Promise<void>,
      successMessage?: string,
    ) => {
      if (!memberId) return;
      setPendingAction(action);
      try {
        await request();
        if (successMessage) toast.success(successMessage);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingAction(null);
      }
    },
    [memberId],
  );

  const handleClockIn = useCallback(() => {
    return runAction(
      'clock-in',
      async () => {
        if (!memberId) return;
        const record = await clockInRequest(memberId);
        setAttendance({ ...record, breaks: [] });
      },
      'Clocked in. Have a productive day!',
    );
  }, [runAction, memberId]);

  const handleClockOut = useCallback(() => {
    return runAction(
      'clock-out',
      async () => {
        if (!memberId) return;
        const record = await clockOutRequest(memberId);
        setAttendance((prev) =>
          prev ? { ...record, breaks: prev.breaks ?? [] } : record,
        );
      },
      'Clocked out. See you tomorrow!',
    );
  }, [runAction, memberId]);

  const handleStartBreak = useCallback(() => {
    return runAction(
      'break-start',
      async () => {
        if (!memberId) return;
        const breakRecord = await startBreakRequest(memberId);
        setAttendance((prev) =>
          prev
            ? { ...prev, breaks: [...(prev.breaks ?? []), breakRecord] }
            : prev,
        );
      },
      'Break started. Enjoy your break!',
    );
  }, [runAction, memberId]);

  const handleEndBreak = useCallback(() => {
    return runAction(
      'break-end',
      async () => {
        if (!memberId) return;
        const breakRecord = await endBreakRequest(memberId);
        setAttendance((prev) =>
          prev
            ? {
                ...prev,
                breaks: (prev.breaks ?? []).map((br) =>
                  br.id === breakRecord.id ? breakRecord : br,
                ),
              }
            : prev,
        );
      },
      'Break ended. Welcome back!',
    );
  }, [runAction, memberId]);

  const workingDurationText = useMemo(() => {
    if (isInitialLoading) return '--:--:--';
    return formatDuration(computeWorkingSeconds(attendance, now));
  }, [attendance, now, isInitialLoading]);

  const progressPercentage = useMemo(() => {
    if (isInitialLoading) return 0;
    const workingHours = computeWorkingSeconds(attendance, now) / 3600;
    const targetHours = Math.max(1, dailyTargetHours);
    return Math.min(100, Math.round((workingHours / targetHours) * 100));
  }, [attendance, now, dailyTargetHours, isInitialLoading]);

  return {
    status,
    attendance,
    isInitialLoading,
    pendingAction,
    checkInTime: formatClockTime(attendance?.clockInAt),
    checkOutTime: formatClockTime(attendance?.clockOutAt),
    workingDurationText,
    progressPercentage,
    handleClockIn,
    handleClockOut,
    handleStartBreak,
    handleEndBreak,
  };
}
