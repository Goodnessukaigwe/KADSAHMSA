import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';

interface StudentChromeProps {
  /** Lifted so the dashboard can filter its explore grid as the learner types. */
  search: string;
  onSearchChange: (value: string) => void;
}

/**
 * Port of templates/student_chrome.mustache — the signed-in app shell: brand,
 * top bar with course search, and the left sidebar carrying the learner's name,
 * log out, and section nav.
 *
 * This replaces the marketing header on signed-in screens, which is why the
 * dashboard route renders outside the public layout.
 */
export function StudentChrome({ search, onSearchChange }: StudentChromeProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    // Leave the protected route first so RequireAuth does not bounce the
    // learner to /login the moment the user state clears.
    navigate(routes.home);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <>
      <Link to={routes.dashboard} className="kadsamhsa-shome-brand" aria-label={site.name}>
        <img
          src={site.logoUrl}
          alt=""
          className="kadsamhsa-shome-brand__logo"
          width={40}
          height={30}
        />
        <span className="kadsamhsa-shome-brand__text">KADSAMHSA</span>
      </Link>

      <header className="kadsamhsa-shome-top" role="banner">
        <div className="kadsamhsa-shome-top__tools">
          <form
            className="kadsamhsa-shome-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="kadsamhsa-shome-search" className="sr-only">
              {strings.dashsearchlabel}
            </label>
            <span className="kadsamhsa-shome-search__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10.5 10.5L14 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              id="kadsamhsa-shome-search"
              className="kadsamhsa-shome-search__input"
              placeholder={strings.dashsearchplaceholder}
              autoComplete="off"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </form>
        </div>
      </header>

      <aside className="kadsamhsa-shome-side" aria-label={strings.dashnavlabel}>
        <div className="kadsamhsa-shome-side__panel">
          <div className="kadsamhsa-shome-side__user">
            <div className="kadsamhsa-shome-side__avatar">
              <span className="kadsamhsa-shome-side__avatar-ph" aria-hidden="true" />
            </div>
            <div className="kadsamhsa-shome-side__meta">
              <div className="kadsamhsa-shome-side__name">{firstName}</div>
              {/* A real action, so a button — the Mustache version used an <a>
                  to Moodle's logout URL, which does not exist here. */}
              <button
                type="button"
                className="kadsamhsa-shome-side__logout"
                onClick={signOut}
                disabled={signingOut}
              >
                {signingOut ? 'Logging out…' : strings.dashlogout}
              </button>
            </div>
          </div>

          <nav className="kadsamhsa-shome-side__nav">
            <NavLink
              to={routes.dashboard}
              className={({ isActive }) =>
                `kadsamhsa-shome-side__link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="kadsamhsa-shome-side__ico" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{strings.dashnavhome}</span>
            </NavLink>

            <NavLink
              to={routes.courses}
              className={({ isActive }) =>
                `kadsamhsa-shome-side__link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="kadsamhsa-shome-side__ico" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 9.5v4l3.5-2L10 9.5z" fill="currentColor" />
                  <path d="M8 19h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span>{strings.dashnavcourses}</span>
            </NavLink>

            <NavLink
              to={routes.verify}
              className={({ isActive }) =>
                `kadsamhsa-shome-side__link${isActive ? ' is-active' : ''}`
              }
            >
              <span className="kadsamhsa-shome-side__ico" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 9.5l8-4 8 4-8 4-8-4z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 11.5v4.2c0 .8 2.2 2.3 5 2.3s5-1.5 5-2.3V11.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path d="M20 10.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span>{strings.verifycert}</span>
            </NavLink>
          </nav>
        </div>
      </aside>
    </>
  );
}
