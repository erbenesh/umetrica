import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';

import { BRAND_NAME } from '@sellerpool/core';

import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { sendEmail, studioUrl } from './lib/email.js';
import { orgAc, orgRoles } from './lib/org-permissions.js';
import { hasPendingInvitationForEmail } from './lib/invitation-flow.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: `Сброс пароля ${BRAND_NAME}`,
        text: [
          `Здравствуйте, ${user.name ?? user.email}!`,
          '',
          'Перейдите по ссылке, чтобы задать новый пароль:',
          url,
          '',
          'Если вы не запрашивали сброс, просто проигнорируйте это письмо.',
        ].join('\n'),
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const invited = await hasPendingInvitationForEmail(newUser.email);
          if (!invited) {
            return { data: newUser };
          }

          return {
            data: {
              ...newUser,
              emailVerified: true,
            },
          };
        },
      },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (user.emailVerified) return;

      await sendEmail({
        to: user.email,
        subject: `Подтвердите email в ${BRAND_NAME}`,
        text: [
          `Здравствуйте, ${user.name ?? user.email}!`,
          '',
          'Подтвердите адрес электронной почты:',
          url,
          '',
          'После подтверждения вы сможете принимать приглашения в организации.',
        ].join('\n'),
      });
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      ac: orgAc,
      roles: orgRoles,
      requireEmailVerificationOnInvitation: true,
      async sendInvitationEmail(data) {
        const inviteLink = studioUrl(`/accept-invitation/${data.id}`);
        await sendEmail({
          to: data.email,
          subject: `Приглашение в ${data.organization.name} — ${BRAND_NAME}`,
          text: [
            `${data.inviter.user.name ?? data.inviter.user.email} приглашает вас в организацию «${data.organization.name}».`,
            `Роль: ${data.role}`,
            '',
            'Принять приглашение:',
            inviteLink,
            '',
            'Создайте аккаунт или войдите — вы сразу попадёте в организацию.',
          ].join('\n'),
        });
      },
    }),
  ],
  trustedOrigins: [process.env.CORS_ORIGIN ?? 'http://localhost:5173'],
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-me-min-32-characters-long',
});

export type Auth = typeof auth;
