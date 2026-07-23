'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import {
  Building2,
  User,
  Globe,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step2BaseSchema,
  type Step1FormData,
  type Step2FormData,
  type Step3FormData,
  type Step4FormData,
} from '../domain/form-schema';
import {
  COUNTRIES,
  CURRENCIES,
  TIMEZONES,
  WORKSPACE_BASE_URL,
} from '../domain/constants';

import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

type AllFormData = Step1FormData &
  z.infer<typeof step2BaseSchema> &
  Step3FormData &
  Step4FormData;

interface ApiError {
  success: false;
  error: string;
  message?: string;
  field?: string;
  details?: Record<string, string[]>;
}

// ─── Step Config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Details', icon: Building2 },
  { id: 2, label: 'Admin', icon: User },
  { id: 3, label: 'Regional', icon: Globe },
  { id: 4, label: 'Review', icon: ClipboardCheck },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center gap-0">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = index === STEPS.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'border border-gray-200 bg-gray-100 text-gray-400',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium transition-colors duration-200',
                  isActive
                    ? 'text-blue-600'
                    : isCompleted
                      ? 'text-gray-500'
                      : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'mx-2 mb-5 h-px flex-1 transition-all duration-300',
                  isCompleted ? 'bg-blue-600' : 'bg-gray-200',
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

function FormInput({
  label,
  error,
  optional,
  startIcon,
  endIcon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-gray-400">(Optional)</span>
        )}
      </label>
      <div
        className={cn(
          'flex items-center overflow-hidden rounded-lg border transition-all duration-200',
          error
            ? 'border-red-400 ring-1 ring-red-200'
            : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
        )}
      >
        {startIcon && (
          <div className="border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-sm whitespace-nowrap text-gray-500 select-none">
            {startIcon}
          </div>
        )}
        <input
          className={cn(
            'flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400',
            className,
          )}
          {...props}
        />
        {endIcon && <div className="pr-3">{endIcon}</div>}
      </div>
      <FieldError message={error} />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function FormSelect({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div
        className={cn(
          'relative rounded-lg border transition-all duration-200',
          error
            ? 'border-red-400 ring-1 ring-red-200'
            : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
        )}
      >
        <select
          className={cn(
            'w-full appearance-none rounded-lg bg-white px-3 py-2.5 pr-9 text-sm text-gray-900 outline-none',
            !props.value && 'text-gray-400',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      <FieldError message={error} />
    </div>
  );
}

// ─── Step 1: Organization Details ─────────────────────────────────────────────

function Step1({
  data,
  onNext,
}: {
  data: Partial<AllFormData>;
  onNext: (d: Step1FormData) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      organizationName: data.organizationName ?? '',
      organizationSlug: data.organizationSlug ?? '',
      organizationEmail: data.organizationEmail ?? '',
      organizationPhone: data.organizationPhone ?? '',
      website: data.website ?? '',
    },
  });

  const orgName = watch('organizationName');

  // Auto-generate slug from company name
  React.useEffect(() => {
    if (orgName) {
      const slug = orgName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      setValue('organizationSlug', slug, { shouldValidate: false });
    }
  }, [orgName, setValue]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Organization Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Let&apos;s start with the basics of your company.
        </p>
      </div>

      <FormInput
        label="Company Name"
        placeholder="e.g. Acme Corporation"
        error={errors.organizationName?.message}
        {...register('organizationName')}
      />

      <FormInput
        label="Workspace URL"
        placeholder="acme-corp"
        prefix={WORKSPACE_BASE_URL}
        error={errors.organizationSlug?.message}
        {...register('organizationSlug')}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Company Email"
          optional
          type="email"
          placeholder="contact@acme.com"
          error={errors.organizationEmail?.message}
          {...register('organizationEmail')}
        />
        <FormInput
          label="Phone"
          optional
          type="tel"
          placeholder="+1 (555) 000-0000"
          error={errors.organizationPhone?.message}
          {...register('organizationPhone')}
        />
      </div>

      <FormInput
        label="Website"
        optional
        type="url"
        placeholder="https://acme.com"
        error={errors.website?.message}
        {...register('website')}
      />

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:bg-blue-800"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

// ─── Step 2: Admin Account ─────────────────────────────────────────────────────

function Step2({
  data,
  onNext,
  onBack,
}: {
  data: Partial<AllFormData>;
  onNext: (d: Step2FormData) => void;
  onBack: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      ownerName: data.ownerName ?? '',
      ownerEmail: data.ownerEmail ?? '',
      password: data.password ?? '',
      confirmPassword: data.confirmPassword ?? '',
    },
  });

  const password = watch('password') ?? '';

  const strengthChecks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
    { label: 'One special character', pass: /[^a-zA-Z0-9]/.test(password) },
  ];
  const strengthScore = strengthChecks.filter((c) => c.pass).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = [
    '',
    'bg-red-400',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-green-500',
  ][strengthScore];

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Admin Account
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Set up your admin credentials to access the platform.
        </p>
      </div>

      <FormInput
        label="Full Name"
        placeholder="John Doe"
        error={errors.ownerName?.message}
        {...register('ownerName')}
      />

      <FormInput
        label="Work Email"
        type="email"
        placeholder="john.doe@acme.com"
        error={errors.ownerEmail?.message}
        {...register('ownerEmail')}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Password</label>
        <div
          className={cn(
            'flex items-center rounded-lg border transition-all duration-200',
            errors.password
              ? 'border-red-400 ring-1 ring-red-200'
              : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
          )}
        >
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 characters"
            className="flex-1 rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="pr-3 text-gray-400 transition-colors hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {/* Strength bar */}
        {password.length > 0 && (
          <div className="mt-1.5">
            <div className="mb-1 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i <= strengthScore ? strengthColor : 'bg-gray-200',
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {strengthChecks.map((c) => (
                  <span
                    key={c.label}
                    className={cn(
                      'flex items-center gap-1 text-xs',
                      c.pass ? 'text-green-600' : 'text-gray-400',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3 w-3',
                        c.pass ? 'opacity-100' : 'opacity-30',
                      )}
                    />
                    {c.label}
                  </span>
                ))}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  strengthScore >= 3 ? 'text-green-600' : 'text-gray-500',
                )}
              >
                {strengthLabel}
              </span>
            </div>
          </div>
        )}
        <FieldError message={errors.password?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <div
          className={cn(
            'flex items-center rounded-lg border transition-all duration-200',
            errors.confirmPassword
              ? 'border-red-400 ring-1 ring-red-200'
              : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
          )}
        >
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            className="flex-1 rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="pr-3 text-gray-400 transition-colors hover:text-gray-600"
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:bg-blue-800"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

// ─── Step 3: Regional Settings ─────────────────────────────────────────────────

function Step3({
  data,
  onNext,
  onBack,
}: {
  data: Partial<AllFormData>;
  onNext: (d: Step3FormData) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      country: data.country ?? '',
      timezone: data.timezone ?? '',
      currency: data.currency ?? '',
    },
  });

  const selectedCountry = watch('country');

  // Smart defaults: when country changes, pre-fill timezone & currency
  React.useEffect(() => {
    const match = COUNTRIES.find((c) => c.value === selectedCountry);
    if (match) {
      setValue('timezone', match.defaultTimezone, { shouldValidate: false });
      setValue('currency', match.defaultCurrency, { shouldValidate: false });
    }
  }, [selectedCountry, setValue]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Regional Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your organization&apos;s localization preferences.
        </p>
      </div>

      <FormSelect
        label="Country"
        placeholder="Select your country"
        options={COUNTRIES.map((c) => ({ value: c.value, label: c.label }))}
        error={errors.country?.message}
        {...register('country')}
      />

      <FormSelect
        label="Timezone"
        placeholder="Select a timezone"
        options={TIMEZONES}
        error={errors.timezone?.message}
        {...register('timezone')}
      />

      <FormSelect
        label="Currency"
        placeholder="Select a currency"
        options={CURRENCIES}
        error={errors.currency?.message}
        {...register('currency')}
      />

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:bg-blue-800"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

// ─── Step 4: Review & Submit ───────────────────────────────────────────────────
const ReviewRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-start justify-between border-b border-gray-100 py-2.5 last:border-0">
    <span className="min-w-[140px] text-sm text-gray-500">{label}</span>
    <span className="ml-4 text-right text-sm font-medium text-gray-900">
      {value || '—'}
    </span>
  </div>
);

function Step4({
  data,
  onBack,
  onSubmit,
  isLoading,
  apiError,
}: {
  data: Partial<AllFormData>;
  onBack: () => void;
  onSubmit: (d: Step4FormData) => void;
  isLoading: boolean;
  apiError: ApiError | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: { acceptTerms: data.acceptTerms ?? false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Review & Confirm
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Please verify all details before creating your organization.
        </p>
      </div>

      {/* Organization Card */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Organization
          </span>
        </div>
        <ReviewRow label="Company Name" value={data.organizationName} />
        <ReviewRow
          label="Workspace URL"
          value={`${WORKSPACE_BASE_URL}${data.organizationSlug}`}
        />
        <ReviewRow
          label="Company Email"
          value={data.organizationEmail || 'Not provided'}
        />
        <ReviewRow
          label="Phone"
          value={data.organizationPhone || 'Not provided'}
        />
        <ReviewRow label="Website" value={data.website || 'Not provided'} />
      </div>

      {/* Admin Card */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50">
            <User className="h-4 w-4 text-violet-600" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Admin Account
          </span>
        </div>
        <ReviewRow label="Full Name" value={data.ownerName} />
        <ReviewRow label="Email" value={data.ownerEmail} />
        <ReviewRow label="Password" value="••••••••" />
      </div>

      {/* Regional Card */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
            <Globe className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Regional
          </span>
        </div>
        <ReviewRow label="Country" value={data.country} />
        <ReviewRow label="Timezone" value={data.timezone} />
        <ReviewRow label="Currency" value={data.currency} />
      </div>

      {/* API Error */}
      {apiError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {apiError.error}
            </p>
            <p className="mt-0.5 text-sm text-red-600">{apiError.message}</p>
            {apiError.details && (
              <ul className="mt-1 list-inside list-disc">
                {Object.entries(apiError.details).map(([field, msgs]) => (
                  <li key={field} className="text-xs text-red-500">
                    <strong>{field}</strong>: {msgs.join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Terms */}
      <div className="flex flex-col gap-1">
        <label className="group flex cursor-pointer items-start gap-3">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              id="acceptTerms"
              className="peer sr-only"
              {...register('acceptTerms')}
            />
            <div
              className={cn(
                'flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition-all duration-200',
                'border-gray-300 bg-white peer-checked:border-blue-600 peer-checked:bg-blue-600',
                'group-hover:border-blue-400',
                errors.acceptTerms && 'border-red-400',
              )}
            >
              <Check className="h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
            </div>
          </div>
          <span className="text-sm leading-relaxed text-gray-600">
            I agree to the{' '}
            <a href="#" className="font-medium text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-medium text-blue-600 hover:underline">
              Privacy Policy
            </a>
            . By continuing, you confirm that all information provided is
            accurate.
          </span>
        </label>
        <FieldError message={errors.acceptTerms?.message} />
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Organization
              <Check className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({ orgName }: { orgName: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="animate-in zoom-in-50 flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-100 bg-green-50 duration-500">
        <Check className="h-10 w-10 text-green-500" strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          You&apos;re all set!
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-gray-500">
          <strong>{orgName}</strong> has been created. Redirecting you to your
          dashboard…
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Setting up your workspace…
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AllFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStep1 = useCallback((data: Step1FormData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  }, []);

  const handleStep2 = useCallback((data: Step2FormData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  }, []);

  const handleStep3 = useCallback((data: Step3FormData) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
  }, []);

  const handleStep4 = useCallback(
    async (stepData: Step4FormData) => {
      setApiError(null);
      setIsLoading(true);

      const payload = {
        organizationName: formData.organizationName!,
        organizationSlug: formData.organizationSlug!,
        organizationEmail: formData.organizationEmail || undefined,
        organizationPhone: formData.organizationPhone || undefined,
        website: formData.website || undefined,
        ownerName: formData.ownerName!,
        ownerEmail: formData.ownerEmail!,
        password: formData.password!,
        confirmPassword: formData.confirmPassword!,
        country: formData.country!,
        timezone: formData.timezone!,
        currency: formData.currency!,
        acceptTerms: stepData.acceptTerms,
      };

      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          setApiError(json as ApiError);
          setIsLoading(false);
          return;
        }

        setIsSuccess(true);

        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch {
        setApiError({
          success: false,
          error: 'Network Error',
          message:
            'Unable to reach the server. Please check your connection and try again.',
        });
        setIsLoading(false);
      }
    },
    [formData, router],
  );

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
    setApiError(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {!isSuccess && <StepIndicator currentStep={currentStep} />}

      {isSuccess ? (
        <SuccessScreen
          orgName={formData.organizationName ?? 'Your Organization'}
        />
      ) : (
        <>
          {currentStep === 1 && <Step1 data={formData} onNext={handleStep1} />}
          {currentStep === 2 && (
            <Step2 data={formData} onNext={handleStep2} onBack={goBack} />
          )}
          {currentStep === 3 && (
            <Step3 data={formData} onNext={handleStep3} onBack={goBack} />
          )}
          {currentStep === 4 && (
            <Step4
              data={formData}
              onBack={goBack}
              onSubmit={handleStep4}
              isLoading={isLoading}
              apiError={apiError}
            />
          )}
        </>
      )}
    </div>
  );
}
