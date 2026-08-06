import { apiFetch } from '@/lib/api-client';

export type AvatarUploadResponse = {
  image: string;
  updatedAt: string;
};

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<AvatarUploadResponse>('/api/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

export function deleteAvatar() {
  return apiFetch<void>('/api/profile/avatar', {
    method: 'DELETE',
  });
}

export type OrgLogoUploadResponse = {
  logo: string;
  updatedAt: string;
};

export function uploadOrgLogo(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetch<OrgLogoUploadResponse>('/api/organization/logo', {
    method: 'POST',
    body: formData,
  });
}

export function deleteOrgLogo() {
  return apiFetch<void>('/api/organization/logo', {
    method: 'DELETE',
  });
}
