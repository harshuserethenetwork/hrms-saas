import { z } from 'zod';

export const OnboardingRequestSchema = z
  .object({
    // Organization
    organizationName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100, 'Organization name must be 100 characters or less'),
    organizationSlug: z
      .string()
      .min(2, 'Organization slug must be at least 2 characters')
      .max(50, 'Organization slug must be 50 characters or less')
      .regex(
        /^[a-z0-9-]+$/,
        'Slug must contain only lowercase letters, numbers, and hyphens',
      )
      .transform((val) => val.toLowerCase().trim()),
    organizationEmail: z
      .string()
      .email('Invalid organization email format')
      .optional()
      .or(z.literal('')),
    organizationPhone: z
      .string()
      .max(20, 'Phone number must be 20 characters or less')
      .optional()
      .or(z.literal('')),
    website: z
      .string()
      .url('Invalid website URL format')
      .optional()
      .or(z.literal('')),

    // Company Owner
    ownerName: z
      .string()
      .min(2, 'Owner name must be at least 2 characters')
      .max(100, 'Owner name must be 100 characters or less'),
    ownerEmail: z
      .string()
      .email('Invalid owner email format')
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be 72 characters or less'),
    confirmPassword: z.string(),

    // Localization
    country: z
      .string()
      .min(2, 'Country is required')
      .max(100, 'Country name must be 100 characters or less'),
    timezone: z.string().min(2, 'Timezone is required'),
    currency: z
      .string()
      .length(3, 'Currency must be exactly a 3-character ISO code')
      .transform((val) => val.toUpperCase()),

    // Compliance
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ParsedOnboardingRequest = z.infer<typeof OnboardingRequestSchema>;
