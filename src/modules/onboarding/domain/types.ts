import { auth } from '@/lib/auth';

export interface OnboardingRequestDto {
  // Organization
  organizationName: string;
  organizationSlug: string;
  organizationEmail?: string;
  organizationPhone?: string;
  website?: string;

  // Company Owner
  ownerName: string;
  ownerEmail: string;
  password?: string; // Optional during intermediate checks but required for onboarding

  // Localization
  country: string;
  timezone: string;
  currency: string;

  // Compliance
  acceptTerms: boolean;
}

export interface OnboardingResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    fullName: string;
    status: string;
    createdAt: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    timezone: string;
    country: string | null;
    currency: string | null;
    status: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    createdAt: Date;
  };
  session?: typeof auth.$Infer.Session; // To hold the authenticated session returned by Better Auth
}
