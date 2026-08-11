import {
  type Attendance,
  Prisma,
  PrismaClient,
} from '@/generated/prisma/client';

import { prisma as db } from '@/lib/db';

/**
 * A single attendance record including its ordered breaks.
 * The breaks are always ordered chronologically so downstream code
 * (service/handler) never has to re-sort the persisted timeline.
 */
export type AttendanceWithBreaks = Prisma.AttendanceGetPayload<{
  include: { breaks: { orderBy: { startedAt: 'asc' } } };
}>;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * AttendanceRepository
 * --------------------
 * Owning the persistence concerns of the `Attendance` aggregate.
 *
 * Every method is a single, named database operation. It deliberately
 * contains NO business rules, validations, time/rate calculations or API
 * concerns — those belong to the service layer. Prisma errors are allowed
 * to propagate untouched so the service layer can translate them into
 * domain/HTTP errors using a single error-mapping strategy.
 *
 * The PrismaClient is injected through the constructor (defaulting to the
 * shared singleton in `@/lib/db`) to keep the repository unit-testable and
 * decoupled from a hard-coded client instance.
 */
export class AttendanceRepository {
  constructor(private readonly client: PrismaClient = db) {}

  /**
   * Persists a new attendance record (e.g. the initial clock-in row).
   * Takes the unchecked input because the caller supplies the scalar
   * `organizationMemberId` foreign key rather than a nested relation.
   */
  createAttendance(
    data: Prisma.AttendanceUncheckedCreateInput,
  ): Promise<Attendance> {
    return this.client.attendance.create({ data });
  }

  /**
   * Finds a member's attendance for a single calendar day, scoped by the
   * composite unique key (organizationMemberId, attendanceDate).
   */
  findTodayAttendance(
    organizationMemberId: string,
    attendanceDate: Date,
  ): Promise<AttendanceWithBreaks | null> {
    return this.client.attendance.findUnique({
      where: {
        organizationMemberId_attendanceDate: {
          organizationMemberId,
          attendanceDate,
        },
      },
      include: {
        breaks: {
          orderBy: {
            startedAt: 'asc',
          },
        },
      },
    });
  }

  /**
   * Retrieves a single attendance record by its primary key.
   */
  findAttendanceById(id: string): Promise<Attendance | null> {
    return this.client.attendance.findUnique({
      where: { id },
    });
  }

  /**
   * Finds the member's current open (clocked-in, not yet clocked-out)
   * attendance record. Timestamps are nullable so "open" is modelled as a
   * plain `clockOutAt` IS NULL lookup — no derived status needed.
   */
  findOpenAttendance(organizationMemberId: string): Promise<Attendance | null> {
    return this.client.attendance.findFirst({
      where: { organizationMemberId, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });
  }

  /**
   * Generic, single-purpose update of scalar fields on an attendance row.
   * Reusable by every workflow — clock-out, breaks, status changes, remarks.
   */
  updateAttendance(
    id: string,
    data: Prisma.AttendanceUncheckedUpdateInput,
  ): Promise<Attendance> {
    return this.client.attendance.update({ where: { id }, data });
  }

  /**
   * Returns a paginated, most-recent-first attendance history for a member,
   * including the ordered breaks of each day.
   */
  getAttendanceHistory(
    organizationMemberId: string,
    pagination: PaginationParams,
  ): Promise<AttendanceWithBreaks[]> {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    return this.client.attendance.findMany({
      where: { organizationMemberId },
      orderBy: { attendanceDate: 'desc' },
      skip,
      take: pageSize,
      include: { breaks: { orderBy: { startedAt: 'asc' } } },
    });
  }

  /**
   * Totals the member's attendance rows so the service layer can compute
   * total pages / total items for pagination metadata.
   */
  countAttendance(organizationMemberId: string): Promise<number> {
    return this.client.attendance.count({
      where: { organizationMemberId },
    });
  }

  async findActiveBreak(attendanceId: string) {
    return this.client.attendanceBreak.findFirst({
      where: {
        attendanceId,
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  async createBreak(data: Prisma.AttendanceBreakCreateInput) {
    return this.client.attendanceBreak.create({
      data,
    });
  }

  async endBreak(breakId: string, endedAt: Date, durationSeconds: number) {
    return this.client.attendanceBreak.update({
      where: {
        id: breakId,
      },
      data: {
        endedAt,
        durationSeconds,
      },
    });
  }
}

export const attendanceRepository = new AttendanceRepository();
