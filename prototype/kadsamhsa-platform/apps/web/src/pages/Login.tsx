import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '@kadsamhsa/api-contract';
import { useAuth } from '../auth/AuthProvider';
import { routes } from '../data/site';

/** Sign in (PRD F3). */
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Where the visitor was headed before being asked to sign in.
  const from = (location.state as { from?: string } | null)?.from ?? routes.dashboard;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiClientError ? cause.message : 'Could not sign in. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="kadsamhsa-auth">
      <div className="kadsamhsa-container kadsamhsa-container--narrow">
        <h1>Sign in</h1>
        <form className="kadsamhsa-form" onSubmit={submit} noValidate>
          <label className="kadsamhsa-form__field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="kadsamhsa-form__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="kadsamhsa-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="kadsamhsa-btn kadsamhsa-btn--pill" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="kadsamhsa-lead">
          No account yet? <Link to={routes.register}>Create one</Link>.
        </p>
      </div>
    </section>
  );
}
