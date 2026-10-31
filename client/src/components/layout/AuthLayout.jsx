// Centered card used by the login, sign-up and password pages.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">Brightloop</div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
