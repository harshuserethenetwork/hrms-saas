import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OnboardingRequestSchema } from '@/modules/onboarding/domain/validation';
import {
  OnboardCompanyUseCase,
  OnboardingConflictError,
} from '@/modules/onboarding/application/onboard-company.usecase';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate the incoming request body
    const body = await req.json();
    const validatedData = await OnboardingRequestSchema.parseAsync(body);

    // 2. Execute the onboarding usecase (creates user, account, org, member, roles, and permissions)
    const onboardingUseCase = new OnboardCompanyUseCase();
    const onboardedResult = await onboardingUseCase.execute(validatedData);

    // 3. Programmatically sign the user in via Better Auth
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: validatedData.ownerEmail,
        password: validatedData.password,
      },
      asResponse: true, // Returns raw Response object to capture cookies
      headers: req.headers, // Pass request headers for IP tracking and UA
    });

    if (!signInResponse.ok) {
      // In the rare case onboarding succeeds but sign-in fails
      return NextResponse.json(
        {
          success: true,
          message:
            'Organization onboarded, but automatic sign-in failed. Please login manually.',
          user: onboardedResult.user,
          organization: onboardedResult.organization,
        },
        { status: 201 },
      );
    }

    const signInData = await signInResponse.json();

    // 4. Construct NextResponse containing the session and organization data
    const response = NextResponse.json(
      {
        success: true,
        message: 'Organization onboarded and logged in successfully',
        user: onboardedResult.user,
        organization: onboardedResult.organization,
        session: signInData.session,
      },
      { status: 201 },
    );

    // 5. Transfer session cookies to the NextResponse headers
    const setCookieHeaders = signInResponse.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie) => {
        response.headers.append('set-cookie', cookie);
      });
    } else {
      const setCookie = signInResponse.headers.get('set-cookie');
      if (setCookie) {
        response.headers.set('set-cookie', setCookie);
      }
    }

    return response;
  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Handle conflict errors (duplication of email or organization slug)
    if (error instanceof OnboardingConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conflict',
          message: error.message,
          field: error.field,
        },
        { status: 409 },
      );
    }

    // Handle all other internal server errors
    console.error('Onboarding Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
