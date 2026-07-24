import Link from 'next/link';

export default function OrganizationNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Organization Not Found
        </h2>
        <p className="mt-2 text-gray-500">
          The organization you&apos;re looking for doesn&apos;t exist or the URL
          is incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
