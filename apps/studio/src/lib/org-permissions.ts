import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, ownerAc } from 'better-auth/plugins/organization/access';

export const orgAc = createAccessControl(defaultStatements);

export const orgViewerRole = orgAc.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
});

export const orgRoles = {
  owner: ownerAc,
  admin: adminAc,
  viewer: orgViewerRole,
};
