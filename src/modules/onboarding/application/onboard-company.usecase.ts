import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { OnboardingRequestDto, OnboardingResponseDto } from '../domain/types';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
} from '../infrastructure/default-catalog';

export class OnboardingConflictError extends Error {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message);
    this.name = 'OnboardingConflictError';
  }
}

export class OnboardCompanyUseCase {
  async execute(data: OnboardingRequestDto): Promise<OnboardingResponseDto> {
    // 1. Perform password hashing outside the transaction to prevent database block locks
    if (!data.password) {
      throw new Error('Password is required for onboarding');
    }

    const authCtx = await auth.$context;
    const hashedPassword = await authCtx.password.hash(data.password);

    // 2. Run the database operations in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Check for owner email duplication
      const existingUser = await tx.user.findUnique({
        where: { email: data.ownerEmail },
      });
      if (existingUser) {
        throw new OnboardingConflictError(
          'An account with this email address already exists.',
          'ownerEmail',
        );
      }

      // b. Check for organization slug duplication
      const existingOrg = await tx.organization.findUnique({
        where: { slug: data.organizationSlug },
      });
      if (existingOrg) {
        throw new OnboardingConflictError(
          'This organization URL slug is already taken.',
          'organizationSlug',
        );
      }

      // c. Upsert the global permissions catalog
      await tx.permission.createMany({
        data: DEFAULT_PERMISSIONS.map((p) => ({
          module: p.module,
          action: p.action,
          code: p.code,
          description: p.description,
        })),
        skipDuplicates: true,
      });

      // Get all default permissions to link them by ID
      const dbPermissions = await tx.permission.findMany({
        where: {
          code: {
            in: DEFAULT_PERMISSIONS.map((p) => p.code),
          },
        },
      });

      // Create a permissions map for fast lookups
      const permissionsMap = new Map(dbPermissions.map((p) => [p.code, p.id]));

      // d. Create the User
      const user = await tx.user.create({
        data: {
          email: data.ownerEmail,
          name: data.ownerName,
          fullName: data.ownerName,
          status: 'ACTIVE', // Activate the owner
          emailVerified: true, // Auto-verify email for direct onboarding login
        },
      });

      // e. Create the associated Better Auth credentials Account
      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          providerId: 'credential',
          accountId: user.id, // Better Auth standard: maps credential provider accountId to user.id
          password: hashedPassword,
        },
      });

      // f. Create the Organization
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: data.organizationSlug,
          email: data.organizationEmail || null,
          phone: data.organizationPhone || null,
          website: data.website || null,
          timezone: data.timezone,
          country: data.country || null,
          currency: data.currency || null,
          status: 'ACTIVE',
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      // g. Create the OrganizationMember (link user and org)
      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          status: 'ACTIVE', // Join as active member
          joinedAt: new Date(),
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      // h. Create roles and link permissions
      for (const roleDef of DEFAULT_ROLES) {
        const role = await tx.role.create({
          data: {
            name: roleDef.name,
            description: roleDef.description,
            isSystem: roleDef.isSystem,
            organizationId: organization.id,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });

        // Collect matching permission IDs
        const rolePermissionData = roleDef.permissionCodes
          .map((code) => {
            const permissionId = permissionsMap.get(code);
            if (!permissionId) return null;
            return {
              roleId: role.id,
              permissionId,
            };
          })
          .filter(
            (item): item is { roleId: string; permissionId: string } =>
              item !== null,
          );

        // Batch insert the role permissions
        if (rolePermissionData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermissionData,
          });
        }

        // i. Assign the "Company Admin" role to the owner member
        if (roleDef.name === 'Company Admin') {
          await tx.userRole.create({
            data: {
              organizationId: organization.id,
              organizationMemberId: member.id,
              roleId: role.id,
              assignedBy: user.id,
            },
          });
        }
      }

      return { user, organization };
    });

    // Return the created user and organization
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        fullName: result.user.fullName,
        status: result.user.status,
        createdAt: result.user.createdAt,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        website: result.organization.website,
        email: result.organization.email,
        phone: result.organization.phone,
        timezone: result.organization.timezone,
        country: result.organization.country,
        currency: result.organization.currency,
        status: result.organization.status,
        subscriptionPlan: result.organization.subscriptionPlan,
        subscriptionStatus: result.organization.subscriptionStatus,
        createdAt: result.organization.createdAt,
      },
    };
  }
}
