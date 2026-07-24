'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  loginSchema,
  type LoginFormSchemaType,
} from '../domain/login-form-schema';

export function LoginForm({
  organization,
}: {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
  };
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = useCallback(
    async (_data: LoginFormSchemaType) => {
      setIsSubmitting(true);
      setTimeout(() => {
        router.push(`/${organization.slug}/dashboard`);
      }, 1500);
    },
    [router],
  );

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm">
            <img
              className="h-full w-full rounded-xl object-cover"
              src={
                organization.logoUrl ??
                'https://i.pinimg.com/vwebp/1200x/5d/47/fe/5d47fe37a5795aeda79a43687cdf7509.webp'
              }
              alt="organization_logo"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {organization.name}
            </h1>
            <p className="text-sm text-gray-500">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div
              className={cn(
                'flex items-center overflow-hidden rounded-lg border transition-all duration-200',
                errors.email
                  ? 'border-red-400 ring-1 ring-red-200'
                  : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
              )}
            >
              <input
                type="email"
                {...register('email')}
                placeholder="you@company.com"
                className="flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div
              className={cn(
                'flex items-center overflow-hidden rounded-lg border transition-all duration-200',
                errors.password
                  ? 'border-red-400 ring-1 ring-red-200'
                  : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
              )}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter your password"
                className="flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 text-gray-500 transition-colors hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
