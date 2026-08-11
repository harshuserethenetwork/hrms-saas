'use client';

import type { LucideIcon } from 'lucide-react';
import { Coffee, Loader2, LogIn, LogOut } from 'lucide-react';

import { Card } from './card';
import { useLiveAttendance } from '../hooks/use-live-attendance';
import type { AttendanceStatus } from '../domain/types';

interface LiveAttendanceCardProps {
  dailyTargetHours?: number;
}

interface ActionButtonConfig {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone: 'primary' | 'break' | 'secondary';
}

const BADGE_META: Record<
  AttendanceStatus,
  { label: string; badgeClassName: string; dotClassName: string }
> = {
  'checked-out': {
    label: 'Not Clocked In',
    badgeClassName:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    dotClassName: 'bg-slate-400',
  },
  'checked-in': {
    label: 'Clocked In',
    badgeClassName:
      'border-blue-200/50 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/60 dark:text-blue-400',
    dotClassName: 'bg-blue-500',
  },
  working: {
    label: 'Working',
    badgeClassName:
      'border-emerald-200/50 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/60 dark:text-emerald-400',
    dotClassName: 'bg-emerald-500',
  },
  'on-break': {
    label: 'On Break',
    badgeClassName:
      'border-amber-200/50 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/60 dark:text-amber-400',
    dotClassName: 'bg-amber-500',
  },
};

const BUTTON_CLASSES: Record<ActionButtonConfig['tone'], string> = {
  primary:
    'flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:bg-blue-600 dark:hover:bg-blue-500',
  break:
    'flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-amber-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:bg-amber-500 dark:hover:bg-amber-400',
  secondary:
    'flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80',
};

function formatGoal(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function ActionButton({
  config,
  className,
}: {
  config: ActionButtonConfig;
  className?: string;
}) {
  const isDisabled = config.disabled || config.loading;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={config.onClick}
      disabled={isDisabled}
      className={`${BUTTON_CLASSES[config.tone]} ${className ?? ''}`}
    >
      {config.loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {config.label}
    </button>
  );
}

export function LiveAttendanceCard({
  dailyTargetHours = 8,
}: LiveAttendanceCardProps) {
  const {
    status,
    attendance,
    isInitialLoading,
    pendingAction,
    checkInTime,
    checkOutTime,
    workingDurationText,
    progressPercentage,
    handleClockIn,
    handleClockOut,
    handleStartBreak,
    handleEndBreak,
  } = useLiveAttendance({ dailyTargetHours });

  const hasClockedIn = Boolean(attendance?.clockInAt);
  const hasClockedOut = Boolean(attendance?.clockOutAt);

  const badge = hasClockedOut ? BADGE_META['checked-out'] : BADGE_META[status];

  const badgeLabel = hasClockedOut ? 'Clocked Out' : badge.label;

  let primary: ActionButtonConfig;
  let secondary: ActionButtonConfig | null;

  if (!hasClockedIn) {
    primary = {
      label: 'Clock In',
      icon: LogIn,
      onClick: handleClockIn,
      loading: pendingAction === 'clock-in',
      tone: 'primary',
    };
    secondary = {
      label: 'Take Break',
      icon: Coffee,
      disabled: true,
      tone: 'secondary',
    };
  } else if (hasClockedOut) {
    primary = {
      label: 'Clocked Out',
      icon: LogOut,
      disabled: true,
      tone: 'secondary',
    };
    secondary = null;
  } else if (status === 'on-break') {
    primary = {
      label: 'End Break',
      icon: Coffee,
      onClick: handleEndBreak,
      loading: pendingAction === 'break-end',
      tone: 'break',
    };
    secondary = {
      label: 'Clock Out',
      icon: LogOut,
      onClick: handleClockOut,
      loading: pendingAction === 'clock-out',
      tone: 'secondary',
    };
  } else {
    primary = {
      label: 'Clock Out',
      icon: LogOut,
      onClick: handleClockOut,
      loading: pendingAction === 'clock-out',
      tone: 'primary',
    };
    secondary = {
      label: 'Take Break',
      icon: Coffee,
      onClick: handleStartBreak,
      loading: pendingAction === 'break-start',
      tone: 'secondary',
    };
  }

  const actionsDisabled = isInitialLoading || pendingAction !== null;

  return (
    <Card className="flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 animate-pulse rounded-full ${badge.dotClassName}`}
          />
          <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
            Time & Attendance
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold ${badge.badgeClassName}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Check In info */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {hasClockedIn ? (
            <>
              Clocked in at{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {checkInTime ?? '--:--'}
              </span>
            </>
          ) : (
            'You have not clocked in yet.'
          )}
        </p>
        {hasClockedOut && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Clocked out at{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {checkOutTime ?? '--:--'}
            </span>
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
          {workingDurationText}
        </div>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
          Working Duration
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Today&apos;s Goal: {formatGoal(dailyTargetHours)}</span>
          <span>{progressPercentage}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <ActionButton
          config={{ ...primary, disabled: primary.disabled || actionsDisabled }}
          className={secondary ? '' : 'col-span-2'}
        />
        {secondary && (
          <ActionButton
            config={{
              ...secondary,
              disabled: secondary.disabled || actionsDisabled,
            }}
          />
        )}
      </div>
    </Card>
  );
}
