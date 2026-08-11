import { NextResponse } from 'next/server';
import { AttendanceService } from '@/modules/attendance/services/attendance.service';

const attendanceService = new AttendanceService();

export async function POST(request: Request) {
  try {
    const membershipId = (await request.json())?.id;
    if (!membershipId) {
      return NextResponse.json(
        { message: 'Membership ID is required' },
        { status: 400 },
      );
    }

    const attendance = await attendanceService.getTodayAttendance(membershipId);
    return NextResponse.json(
      {
        success: true,
        data: attendance,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';

    // "No record yet" is a valid state for the dashboard, not an error.
    if (message === 'You have not clocked in yet.') {
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
