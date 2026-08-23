import { ContinueWithOWeb } from '@/components/ContinueWithOWeb';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold">One Wiki</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in with your OWeb OneID to generate and manage repository wikis.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <ContinueWithOWeb className="w-full" />
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Continue without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
