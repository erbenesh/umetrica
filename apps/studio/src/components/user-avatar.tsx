import { API_BASE } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function userInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

function entityInitial(name?: string | null) {
  const source = name?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

function imageSrc(image?: string | null, cacheKey?: string | null) {
  if (!image) return null;

  const base = image.startsWith('http') ? image : `${API_BASE}${image}`;
  if (!cacheKey) return base;

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${encodeURIComponent(cacheKey)}`;
}

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  cacheKey?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  name,
  email,
  image,
  cacheKey,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const src = imageSrc(image, cacheKey);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('object-cover', className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center bg-primary/10 font-semibold text-primary',
        className,
        fallbackClassName
      )}
      aria-hidden
    >
      {userInitial(name, email)}
    </span>
  );
}

type OrgLogoProps = {
  name?: string | null;
  logo?: string | null;
  cacheKey?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function OrgLogo({
  name,
  logo,
  cacheKey,
  className,
  fallbackClassName,
}: OrgLogoProps) {
  const src = imageSrc(logo, cacheKey);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('object-cover', className)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center bg-primary/10 font-bold text-primary',
        className,
        fallbackClassName
      )}
      aria-hidden
    >
      {entityInitial(name)}
    </span>
  );
}
