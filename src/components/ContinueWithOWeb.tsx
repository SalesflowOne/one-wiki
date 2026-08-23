'use client';

import { owebLoginUrl } from '@/lib/onewiki/constants';

type ContinueWithOWebProps = {
  className?: string;
  label?: string;
};

export function ContinueWithOWeb({
  className = '',
  label = 'Continue with OWeb',
}: ContinueWithOWebProps) {
  const href = owebLoginUrl({ launch: true });

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 ${className}`}
    >
      {label}
    </a>
  );
}
