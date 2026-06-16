/** Decorative background for auth on mobile (hidden on desktop when brand panel is visible). */
export function AuthAmbient() {
  return (
    <div className="auth-ambient" aria-hidden>
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />
      <div className="auth-orb auth-orb--3" />
      <div className="auth-orb auth-orb--spark" />
    </div>
  );
}
