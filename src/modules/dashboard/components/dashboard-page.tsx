'use client';

import { LiveAttendanceCard } from './live-attendance-card';
import { LeaveBalanceCard } from './leave-balance-card';
import { NextPaydayCard } from './next-payday-card';
import { MySummaryCard } from './my-summary-card';
import { StatCard } from './stat-card';
import { CompanyAnnouncements } from './company-announcements';
import { UpcomingHolidays } from './upcoming-holidays';
import { QuickActions } from './quick-actions';
import { MyPayslipCard } from './my-payslip-card';
import { LatestUpdatesCard } from './latest-updates-card';
import { Calendar, Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import type { CurrentUserDto } from '@/types/auth/me.types';
import { useServerClock } from '@/hooks/useServerClock';

export function DashboardPage() {
  const user: CurrentUserDto | null = useAuthStore((state) => state.user);

  const currentTime = useServerClock();

  const day = currentTime?.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const time = currentTime?.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] space-y-6 bg-slate-50/50 p-4 sm:space-y-7 sm:p-6 lg:p-8 dark:bg-slate-950">
      {/* Greeting Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-white">
            Good afternoon, {user?.fullName}! 👋
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
            Have a productive day ahead.
          </p>
        </div>

        {/* Date & Time pills */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{day ? day : 'Loading...'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{time ? time : 'Loading...'}</span>
          </div>
        </div>
      </div>

      {/* Row 1: Time & Attendance | Leave Balance | Next Pay Day */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <LiveAttendanceCard dailyTargetHours={8} />
        <LeaveBalanceCard />
        <NextPaydayCard
          remainingDays={5}
          nextPayDate="Friday, 01 October 2023"
        />
      </section>

      {/* Row 2: My Summary horizontal strip */}
      <section>
        <MySummaryCard />
      </section>

      {/* Row 4: Announcements | Upcoming Holidays & Events | Quick Actions */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <CompanyAnnouncements />
        <UpcomingHolidays />
        <QuickActions />
      </section>

      {/* Row 3: 4 Key Metric Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
          value="7h 17m"
          label="Average Working Hours"
          caption="This Month"
        />
        <StatCard
          icon={<LogIn className="h-5 w-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
          value="10:33 AM"
          label="Average Check-in"
          caption="This Month"
        />
        <StatCard
          icon={<LogOut className="h-5 w-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
          value="07:12 PM"
          label="Average Check-out"
          caption="This Month"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          value="98.56%"
          label="On-time Arrival"
          caption="This Month"
        />
      </section>

      {/* Row 5: My Payslip | Latest Updates */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <MyPayslipCard />
        </div>
        <div className="lg:col-span-7">
          <LatestUpdatesCard />
        </div>
      </section>

      {/* Dashboard Footer */}
      <footer className="flex flex-col gap-3 border-t border-slate-200/60 pt-4 text-xs font-medium text-slate-400 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-500">
        <div>© 2023 ZenCorp Technologies Pvt. Ltd. All rights reserved.</div>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="hover:text-slate-600 dark:hover:text-slate-300"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="hover:text-slate-600 dark:hover:text-slate-300"
          >
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
