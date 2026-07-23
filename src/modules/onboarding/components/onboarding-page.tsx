import { OnboardingForm } from './onboarding-form';
import { LifeBuoy } from 'lucide-react';
import OnboardingRight from './onboarding-right';
import Link from 'next/link';

export function OnboardingPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left Panel ── */}
      <div className="flex min-h-screen w-full flex-col px-8 py-10 sm:px-12 lg:w-[58%] lg:px-16 xl:w-1/2 xl:px-20">
        {/* Logo */}
        <div className="mb-10">
          <Link href="/" className="group inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm transition-colors group-hover:bg-blue-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-white"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-blue-600">
              Kinetic HRMS
            </span>
          </Link>
        </div>

        {/* Form Area */}
        <div className="flex w-full max-w-[480px] flex-1 flex-col justify-center">
          <OnboardingForm />
        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-center gap-1.5 text-sm text-gray-400">
          <LifeBuoy className="h-4 w-4" />
          <span>Need assistance?</span>
          <a
            href="mailto:support@kinetichrms.com"
            className="font-medium text-blue-600 transition-colors hover:underline"
          >
            Contact Support
          </a>
        </div>
      </div>

      {/* ── Right Panel (Image Placeholder) ── */}
      <div className="relative sticky top-0 ml-auto hidden min-h-screen overflow-hidden bg-gray-900 lg:flex lg:w-[35%] xl:w-[40%]">
        <OnboardingRight />
      </div>
    </div>
  );
}
