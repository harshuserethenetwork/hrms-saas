import { prisma } from '@/lib/db';

export class OrganizationRepository {
  async findBySlug(slug: string) {
    return prisma.organization.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        status: true,
      },
    });
  }
}

export const organizationRepository = new OrganizationRepository();
