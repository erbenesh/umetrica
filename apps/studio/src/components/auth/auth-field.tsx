import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type FieldBaseProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function fieldIds(idProp: string | undefined, uid: string, hint?: string, error?: string) {
  const id = idProp ?? uid;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { id, hintId, errorId, describedBy };
}

function FieldLabel({
  id,
  label,
  required,
}: {
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id}>
      {label}
      {required ? (
        <>
          <span className="field-required" aria-hidden="true">
            {' '}
            *
          </span>
          <span className="sr-only"> (обязательно)</span>
        </>
      ) : null}
    </label>
  );
}

function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="field-hint">
      {children}
    </p>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="field-error">
      {children}
    </p>
  );
}

export const AuthField = forwardRef<
  HTMLInputElement,
  FieldBaseProps & InputHTMLAttributes<HTMLInputElement>
>(({ label, error, hint, required, id: idProp, className, ...props }, ref) => {
  const uid = useId();
  const { id, hintId, errorId, describedBy } = fieldIds(idProp, uid, hint, error);

  return (
    <div className="field">
      <FieldLabel id={id} label={label} required={required} />
      {hint && hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <input
        ref={ref}
        id={id}
        className={cn('input', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        required={required}
        {...props}
      />
      {error && errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
});

AuthField.displayName = 'AuthField';

export const AuthSelectField = forwardRef<
  HTMLSelectElement,
  FieldBaseProps & SelectHTMLAttributes<HTMLSelectElement>
>(({ label, error, hint, required, id: idProp, className, children, ...props }, ref) => {
  const uid = useId();
  const { id, hintId, errorId, describedBy } = fieldIds(idProp, uid, hint, error);

  return (
    <div className="field">
      <FieldLabel id={id} label={label} required={required} />
      {hint && hintId ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <select
        ref={ref}
        id={id}
        className={cn('input', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        required={required}
        {...props}
      >
        {children}
      </select>
      {error && errorId ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
});

AuthSelectField.displayName = 'AuthSelectField';
