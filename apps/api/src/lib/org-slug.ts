import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { organization } from '../db/schema.js';

export function slugifyOrgName(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return base || 'org';
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

export async function buildUniqueOrgSlug(name: string) {
  let slug = slugifyOrgName(name);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const [existing] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!existing) return slug;
    slug = `${slugifyOrgName(name)}-${randomSuffix()}`.slice(0, 48);
  }

  return `${slugifyOrgName(name)}-${Date.now().toString(36)}`.slice(0, 48);
}
