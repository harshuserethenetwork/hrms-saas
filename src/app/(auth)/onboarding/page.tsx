import type { Metadata } from 'next';
import { OnboardingPage } from '../../../modules/onboarding/components/onboarding-page';

export const metadata: Metadata = {
  title: 'Set Up Your Organization — Kinetic HRMS',
  description:
    'Register your organization on Kinetic HRMS. Set up your company workspace, admin account, and regional preferences to get started.',
};

export default function OnboardingRoute() {
  return <OnboardingPage />;
}
