'use client';

import Link from 'next/link';

const BACKGROUND_IMAGE_URL =
  'https://plus.unsplash.com/premium_photo-1683880731792-39c07ceea617?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export default function LoginRight() {
  return (
    <>
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
        role="img"
        aria-label="Modern office workspace"
      />

      {/* Dark scrim for text contrast */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-10 py-10 text-center">
        <div className="absolute top-[0%] p-10">
          <h1 className="max-w-lg text-left text-2xl leading-tight font-semibold text-white xl:text-5xl">
            Empowering Your Global Workforce
          </h1>

          <p className="mt-4 max-w-md text-left text-base leading-relaxed text-white/80 xl:text-sm">
            Streamline your HR operations with a modern, high-performance
            platform designed for scalability, operational efficiency and a
            seamless employee experience from onboarding to payroll.
          </p>
        </div>
        <div className="absolute bottom-[5%] w-100 text-left">
          <p className="mt-8 max-w-md text-left text-base text-white/90 italic">
            &ldquo;Welcome to the future of HR management.&rdquo;
          </p>
          <div className="mt-4 flex items-center justify-start gap-4">
            <Link
              href="/about"
              className="rounded-md border border-white/70 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              About Us
            </Link>
            <Link
              href="/about/user-manual"
              className="rounded text-sm font-medium text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              User Manual
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
