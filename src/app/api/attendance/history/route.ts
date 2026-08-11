import { NextResponse } from 'next/server';
import { AttendanceService } from '@/modules/attendance/services/attendance.service';

const attendanceService = new AttendanceService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const membershipId = body?.id;

    if (!membershipId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Membership ID is required',
        },
        { status: 400 },
      );
    }

    const history = await attendanceService.getAttendanceHistory(
      membershipId,
      body?.page,
      body?.pageSize,
    );

    return NextResponse.json(
      {
        success: true,
        data: history,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
