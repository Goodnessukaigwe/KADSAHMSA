import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiClientError } from '@kadsamhsa/api-contract';
import { registerSchema } from '@kadsamhsa/domain';
import { useAuth } from '../auth/AuthProvider';
import { routes } from '../data/site';

/**
 * Self-registration (PRD F3).
 *
 * Validates with the same schema the API enforces, so a client-side rule can
 * never be looser than the server's. Privacy consent is explicit and recorded
 * with a timestamp — NDPA requires that, and a pre-ticked box would not count.
 */
export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({
      fullName,
      email,
      password,
      acceptedPrivacyPolicy: accepted,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_';
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(parsed.data);
      navigate(routes.dashboard, { replace: true });
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        setFieldErrors(cause.fields ?? {});
        setError(cause.fields ? null : cause.message);
      } else {
        setError('Could not create your account. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="kadsamhsa-auth">
      <div className="kadsamhsa-container kadsamhsa-container--narrow">
        <h1>Create your account</h1>
        <form className="kadsamhsa-form" onSubmit={submit} noValidate>
          <label className="kadsamhsa-form__field">
            <span>Full name</span>
            <input
              type="text"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            {fieldErrors.fullName && (
              <span className="kadsamhsa-form__error">{fieldErrors.fullName}</span>
            )}
          </label>

          <label className="kadsamhsa-form__field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {fieldErrors.email && (
              <span className="kadsamhsa-form__error">{fieldErrors.email}</span>
            )}
          </label>

          <label className="kadsamhsa-form__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="kadsamhsa-form__hint">At least 10 characters.</span>
            {fieldErrors.password && (
              <span className="kadsamhsa-form__error">{fieldErrors.password}</span>
            )}
          </label>

          <label className="kadsamhsa-form__checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>I accept the privacy policy and consent to my data being processed.</span>
          </label>
          {fieldErrors.acceptedPrivacyPolicy && (
            <span className="kadsamhsa-form__error">{fieldErrors.acceptedPrivacyPolicy}</span>
          )}

          {error && (
            <p className="kadsamhsa-form__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="kadsamhsa-btn kadsamhsa-btn--pill" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="kadsamhsa-lead">
          Already registered? <Link to={routes.login}>Sign in</Link>.
        </p>
      </div>
    </section>
  );
}
