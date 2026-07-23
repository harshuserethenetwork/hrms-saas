import { z } from 'zod';

// Step 1: Organization Details
export const step1Schema = z.object({
  organizationName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be 100 characters or less'),
  organizationSlug: z
    .string()
    .min(2, 'Workspace URL must be at least 2 characters')
    .max(50, 'Workspace URL must be 50 characters or less')
    .regex(
      /^[a-z0-9-]+$/,
      'Only lowercase letters, numbers, and hyphens allowed',
    ),
  organizationEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  organizationPhone: z
    .string()
    .max(20, 'Phone must be 20 characters or less')
    .optional()
    .or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
});

// Step 2 base (without cross-field refine — used for type inference)
export const step2BaseSchema = z.object({
  ownerName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be 100 characters or less'),
  ownerEmail: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or less')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^a-zA-Z0-9]/,
      'Password must contain at least one special character',
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
});

// Step 2: Admin / Owner Account (with password confirmation cross-check)
export const step2Schema = step2BaseSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);

// Step 3: Regional / Localization
export const step3Schema = z.object({
  country: z
    .string()
    .min(2, 'Please select a country')
    .max(100, 'Country name too long'),
  timezone: z.string().min(2, 'Please select a timezone'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code'),
});

// Step 4: Review — acceptTerms only
export const step4Schema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;
export type Step4FormData = z.infer<typeof step4Schema>;
