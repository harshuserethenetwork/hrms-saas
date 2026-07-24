import { notFound } from 'next/navigation';
import { organizationRepository } from '../../infrastructure/organization.repository';

export async function getOrganizationBySlug(slug: string) {
  const organization = await organizationRepository.findBySlug(slug);

  if (!organization) {
    notFound();
  }

  if (organization.status !== 'ACTIVE') {
    notFound();
  }

  return organization;
}
