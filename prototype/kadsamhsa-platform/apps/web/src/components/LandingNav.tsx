import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';

const LINKS = [
  { to: routes.home, label: strings.landingnavhome, end: true },
  { to: routes.about, label: strings.landingnavabout, end: false },
  { to: routes.courses, label: strings.landingnavcourses, end: false },
  { to: routes.verify, label: strings.verifycert, end: false },
];

/** Marketing navigation. Shows the learner's entry points once signed in. */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  // Guards against a double-click firing two logout requests, and makes the
  // in-flight state visible rather than leaving the button looking inert.
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    close();
    // Leave the protected route before clearing state, otherwise RequireAuth
    // sees the signed-out user first and bounces to /login instead of home.
    navigate(routes.home);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="kadsamhsa-landing-nav" role="banner">
      <div className="kadsamhsa-landing-nav__inner kadsamhsa-container">
        <Link to={routes.home} className="kadsamhsa-landing-nav__logo" aria-label={site.name}>
          <img
            src={site.logoUrl}
            alt="KADSAMHSA"
            className="kadsamhsa-landing-nav__logo-img"
            width={88}
            height={56}
          />
        </Link>

        <button
          type="button"
          className="kadsamhsa-landing-nav__toggle"
          aria-expanded={open}
          aria-controls="kadsamhsa-landing-nav-menu"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <span className="kadsamhsa-landing-nav__toggle-bar" aria-hidden="true" />
          <span className="kadsamhsa-landing-nav__toggle-bar" aria-hidden="true" />
          <span className="kadsamhsa-landing-nav__toggle-bar" aria-hidden="true" />
          <span className="sr-only">{strings.togglenavigation}</span>
        </button>

        <nav
          id="kadsamhsa-landing-nav-menu"
          className={`kadsamhsa-landing-nav__menu${open ? ' is-open' : ''}`}
          aria-label={strings.signupnavlabel}
        >
          <ul className="kadsamhsa-landing-nav__links">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `kadsamhsa-landing-nav__link${isActive ? ' is-active' : ''}`
                  }
                  onClick={close}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="kadsamhsa-landing-nav__actions">
            {user ? (
              <>
                <Link to={routes.dashboard} className="kadsamhsa-landing-nav__cta" onClick={close}>
                  {strings.dashboard}
                </Link>
                <button
                  type="button"
                  className="kadsamhsa-landing-nav__link"
                  onClick={signOut}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </>
            ) : (
              <Link to={routes.login} className="kadsamhsa-landing-nav__cta" onClick={close}>
                {strings.landingnavlogin}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
