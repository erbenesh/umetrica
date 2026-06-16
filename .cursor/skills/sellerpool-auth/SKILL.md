---
name: sellerpool-auth
description: >-
  Better Auth orgs, roles, invitations for Sellerpool. Use when working on
  team page, auth, org switcher, RBAC, or invitation errors.
---

# Sellerpool Auth

## Stack

- Server: `apps/api/src/auth.ts` — Better Auth + organization plugin
- Client: `apps/studio/src/lib/auth-client.ts` — `organizationClient`
- Roles: owner, admin, viewer (`org-permissions.ts`)

## Client APIs

```ts
authClient.organization.setActive({ organizationId })
authClient.organization.inviteMember({ email, role: 'viewer' })
authClient.organization.listMembers()
authClient.organization.listInvitations()
authClient.organization.listUserInvitations()
authClient.organization.acceptInvitation({ invitationId })
authClient.organization.removeMember({ memberIdOrEmail })
authClient.organization.updateMemberRole({ memberId, role })
```

## RBAC

- API: `getAuthContext()` + `canWriteDashboards(role)`
- Studio: `useCanWriteDashboards()` hides edit UI for viewer

## Email verification

- `emailVerification.sendOnSignUp: true` — письмо при регистрации
- `emailAndPassword.requireEmailVerification: true` — вход только после подтверждения
- Dev: письма в консоль API (`EMAIL_TRANSPORT=console`)
- Prod: `RESEND_API_KEY` + `EMAIL_FROM`

## Invitation flow

- `sendInvitationEmail` → ссылка `${STUDIO_URL}/accept-invitation/:id`
- На странице приглашения: превью org + форма входа/регистрации на месте
- После auth — auto accept + `setActiveOrganization` без редиректов
- Приглашённым email верифицируется автоматически (ссылка из письма = подтверждение)
- `GET /api/invitations/:id/preview` — публичное превью
- `POST /api/invitations/:id/prepare-accept` — верификация email перед accept

## Org / company creation

- **Founder:** `POST /api/register` — sign-up + `pending_founder_company`
- После подтверждения email: `POST /api/founder/complete-setup` создаёт компанию, setActive, demo seed
- Вызывается при логине (`ensureActiveOrganization`) и в `OrgGate` при входе в приложение
- **Invitee:** только аккаунт, без своей компании → accept invitation
- **Fallback:** `/onboarding` если нет компании и нет pending invites
- `POST /api/organizations` — ручное создание (онбординг), уникальный slug
- В UI везде термин **«Компания»**, не «организация»

## Client APIs

| Code | Cause |
|------|-------|
| `EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION` | `listUserInvitations` needs verified email |
| `FST_ERR_CTP_EMPTY_JSON_BODY` | POST without body but with Content-Type json |
| No active organization | Login without org; call `setActive` |
