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

    const breakRecord = await attendanceService.endBreak(membershipId);

    return NextResponse.json(
      {
        success: true,
        data: breakRecord,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('End break error:', error);

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
