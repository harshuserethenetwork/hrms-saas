import { attendanceRepository } from '@/repository/attendance/attendance.repository';

export class AttendanceService {
  async clockIn(membershipId: string) {
    const organizationMemberId = membershipId;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const existingAttendance = await attendanceRepository.findTodayAttendance(
      organizationMemberId,
      today,
    );

    if (existingAttendance) {
      throw new Error('You have already clocked in today.');
    }

    const attendance = await attendanceRepository.createAttendance({
      organizationMemberId: membershipId,

      attendanceDate: today,

      clockInAt: new Date(),
    });

    return attendance;
  }

  async getTodayAttendance(membershipId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await attendanceRepository.findTodayAttendance(
      membershipId,
      today,
    );
    if (!attendance) {
      throw new Error('You have not clocked in yet.');
    }
    return attendance;
  }

  async startBreak(membershipId: string) {
    // 1. Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Find today's attendance
    const attendance = await attendanceRepository.findTodayAttendance(
      membershipId,
      today,
    );

    // 3. Employee must clock in first
    if (!attendance) {
      throw new Error('You must clock in before starting a break.');
    }

    // 4. Employee cannot start a break after clocking out
    if (attendance.clockOutAt) {
      throw new Error('You have already clocked out for today.');
    }

    // 5. Check if there is already an active break
    const activeBreak = await attendanceRepository.findActiveBreak(
      attendance.id,
    );

    if (activeBreak) {
      throw new Error('You already have an active break.');
    }

    // 6. Create a new break
    const breakRecord = await attendanceRepository.createBreak({
      attendance: {
        connect: {
          id: attendance.id,
        },
      },
      startedAt: new Date(),
    });

    // 7. Return the created break
    return breakRecord;
  }

  async endBreak(membershipId: string) {
    // 1. Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Find today's attendance
    const attendance = await attendanceRepository.findTodayAttendance(
      membershipId,
      today,
    );

    // 3. User must have clocked in
    if (!attendance) {
      throw new Error('You have not clocked in today.');
    }

    // 4. Find the active break
    const activeBreak = await attendanceRepository.findActiveBreak(
      attendance.id,
    );

    // 5. User must have an active break
    if (!activeBreak) {
      throw new Error('You do not have an active break.');
    }

    // 6. Capture the end time
    const endedAt = new Date();

    // 7. Calculate break duration in seconds
    const durationSeconds = Math.floor(
      (endedAt.getTime() - activeBreak.startedAt.getTime()) / 1000,
    );

    // 8. Update the break
    const updatedBreak = await attendanceRepository.endBreak(
      activeBreak.id,
      endedAt,
      durationSeconds,
    );

    return updatedBreak;
  }

  async clockOut(membershipId: string) {
    // 1. Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Find today's attendance
    const attendance = await attendanceRepository.findTodayAttendance(
      membershipId,
      today,
    );

    // 3. Employee must have clocked in first
    if (!attendance) {
      throw new Error('You have not clocked in today.');
    }

    // 4. Employee cannot clock out twice
    if (attendance.clockOutAt) {
      throw new Error('You have already clocked out for today.');
    }

    const clockInAt = attendance.clockInAt;
    if (!clockInAt) {
      throw new Error('Attendance record is missing a clock-in time.');
    }

    const clockOutAt = new Date();

    // 5. Auto-end any active break so the break timeline stays closed
    const activeBreak = attendance.breaks.find(
      (breakRecord) => !breakRecord.endedAt,
    );
    if (activeBreak) {
      const activeBreakSeconds = Math.floor(
        (clockOutAt.getTime() - activeBreak.startedAt.getTime()) / 1000,
      );
      await attendanceRepository.endBreak(
        activeBreak.id,
        clockOutAt,
        activeBreakSeconds,
      );
    }

    // 6. Total presence = clock-out minus clock-in
    const totalPresenceSeconds = Math.floor(
      (clockOutAt.getTime() - clockInAt.getTime()) / 1000,
    );

    // 7. Total break seconds = sum of all break durations, including the
    //    live duration of any break that was still active at clock-out.
    let totalBreakSeconds = 0;
    for (const breakRecord of attendance.breaks) {
      totalBreakSeconds += breakRecord.durationSeconds;
      if (!breakRecord.endedAt) {
        totalBreakSeconds += Math.floor(
          (clockOutAt.getTime() - breakRecord.startedAt.getTime()) / 1000,
        );
      }
    }

    // 8. Working seconds = presence minus break time (never negative)
    const totalWorkingSeconds = Math.max(
      totalPresenceSeconds - totalBreakSeconds,
      0,
    );

    // 9. Persist clock-out time, durations and mark the day as PRESENT
    return attendanceRepository.updateAttendance(attendance.id, {
      clockOutAt,
      totalPresenceSeconds,
      totalBreakSeconds,
      totalWorkingSeconds,
      status: 'PRESENT',
    });
  }
}
