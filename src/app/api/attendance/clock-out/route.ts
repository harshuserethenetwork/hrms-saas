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

    const attendance = await attendanceService.clockOut(membershipId);

    return NextResponse.json(
      {
        success: true,
        data: attendance,
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
