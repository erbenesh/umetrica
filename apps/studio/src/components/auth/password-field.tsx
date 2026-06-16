import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
  } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ label, error, hint, required, id: idProp, className, autoComplete, ...props }, ref) => {
  const uid = useId();
  const id = idProp ?? uid;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
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
      {hint && hintId ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      <div className="password-field">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className={cn('input password-field__input', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          required={required}
          autoComplete={autoComplete}
          {...props}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-controls={id}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      {error && errorId ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
});

PasswordField.displayName = 'PasswordField';
