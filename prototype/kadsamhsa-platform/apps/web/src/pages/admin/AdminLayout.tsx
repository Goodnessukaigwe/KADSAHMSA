import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { ApiClientError } from '../../data/api';
import { routes, site } from '../../data/site';

/**
 * Admin URLs are declared here rather than in data/site.ts because that module
 * describes the public app; every back-office page links through this object so
 * the route table and the links can only disagree in one place.
 */
export const adminPaths = {
  dashboard: '/admin',
  users: '/admin/users',
  organizations: '/admin/organizations',
  courses: '/admin/courses',
  articles: '/admin/articles',
  course: (courseId: string) => `/admin/courses/${courseId}`,
  courseLearners: (courseId: string) => `/admin/courses/${courseId}/learners`,
  offers: '/admin/offers',
  marketing: '/admin/marketing',
  certificates: '/admin/certificates',
  settings: '/admin/settings',
  payments: '/admin/payments',
} as const;

/**
 * The API speaks minor units (kobo) everywhere, so every admin figure passes
 * through here rather than being divided at the call site — one place to be
 * wrong, and no chance of a float creeping back into a request body.
 */
export function formatMoney(minorUnits: number, currency = 'NGN'): string {
  return (minorUnits / 100).toLocaleString('en-NG', { style: 'currency', currency });
}

export function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * An admin who is told "something went wrong" cannot act; an admin who is told
 * "Add at least one lesson before publishing" can. The API's message is used
 * whenever there is one, and the fallback covers transport failures only.
 */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiClientError ? caught.message : fallback;
}

/** Status wording is the signal; the colour behind it is reinforcement only. */
export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`kadsamhsa-admin__pill kadsamhsa-admin__pill--${status}`}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function ProgressMeter({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="kadsamhsa-admin__progress">
      <div
        className="kadsamhsa-admin__progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% complete`}
      >
        <span className="kadsamhsa-admin__progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="kadsamhsa-admin__progress-label">{clamped}%</span>
    </div>
  );
}

interface AdminPageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Every back-office screen opens the same way: title, optional actions, body. */
export function AdminPage({ title, subtitle, actions, children }: AdminPageProps) {
  return (
    <>
      <header className="kadsamhsa-admin__head">
        <div className="kadsamhsa-admin__head-text">
          <h1 className="kadsamhsa-admin__title">{title}</h1>
          {subtitle && <p className="kadsamhsa-admin__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="kadsamhsa-admin__actions">{actions}</div>}
      </header>
      {children}
    </>
  );
}

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5A1.5 1.5 0 015.5 4H19v13.5H5.5A1.5 1.5 0 004 19V5.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M19 17.5v2.5H5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function OffersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11V5.5A1.5 1.5 0 015.5 4H11l8.5 8.5a1.5 1.5 0 010 2.1l-5 5a1.5 1.5 0 01-2.1 0L4 11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1.35" fill="currentColor" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 14.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 7.5a3 3 0 010 5.6M17.5 18.6c0-2 .9-3.4 3-4.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function OrgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="9" height="16" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 9h6a1 1 0 011 1v10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8h3M7 12h3M7 16h3M16 13h1.5M16 17h1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MarketingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5v3a1 1 0 001 1h2.5L13 19V5L7.5 9.5H5a1 1 0 00-1 1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16.5 9.5a3.5 3.5 0 010 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.8 15.5L9 20l3-1.6L15 20l-.8-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Sidebar structure comes from the approved wireframe (screen 12/13/14): one
 * sidebar for the whole back office, Gurucan-style, so there is no second
 * navigation to learn. `built: false` marks a section whose backend is not in
 * this milestone — the item still appears, because removing it would hide the
 * agreed shape of the product, but it says so rather than dead-ending.
 */
interface NavItem {
  to: string;
  label: string;
  end: boolean;
  icon: ReactNode;
  built: boolean;
  children?: { to: string; label: string; built: boolean }[];
}

const NAV_ITEMS: NavItem[] = [
  { to: adminPaths.dashboard, label: 'Dashboard', end: true, icon: <OverviewIcon />, built: true },
  { to: adminPaths.users, label: 'Users & CRM', end: false, icon: <UsersIcon />, built: false },
  {
    to: adminPaths.organizations,
    label: 'Organizations',
    end: false,
    icon: <OrgIcon />,
    built: false,
  },
  {
    to: adminPaths.courses,
    label: 'Products',
    end: false,
    icon: <CoursesIcon />,
    built: true,
    children: [
      { to: adminPaths.courses, label: 'Courses', built: true },
      { to: adminPaths.articles, label: 'Articles', built: false },
    ],
  },
  { to: adminPaths.offers, label: 'Offers & pricing', end: false, icon: <OffersIcon />, built: true },
  { to: adminPaths.marketing, label: 'Marketing', end: false, icon: <MarketingIcon />, built: false },
  {
    to: adminPaths.certificates,
    label: 'Certificates',
    end: false,
    icon: <CertificateIcon />,
    built: false,
  },
  { to: adminPaths.payments, label: 'Payments', end: false, icon: <PaymentsIcon />, built: true },
  { to: adminPaths.settings, label: 'School settings', end: false, icon: <SettingsIcon />, built: false },
];

/**
 * Back-office shell (PRD §4.2): a persistent dark sidebar around the routed
 * page, matching the student chrome so staff who also learn on the platform
 * recognise where they are.
 *
 * On a phone the sidebar becomes a horizontally scrolling strip above the
 * content rather than a drawer — the PRD requires the panel to be usable on a
 * handset, and a strip cannot trap focus behind an overlay.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    // Leave the guarded route before the user state clears, so the guard does
    // not bounce to /login mid-sign-out.
    navigate(routes.home);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="kadsamhsa-admin">
      <aside className="kadsamhsa-admin__side" aria-label="Admin sections">
        <Link to={adminPaths.dashboard} className="kadsamhsa-admin__brand">
          <img
            src={site.logoUrl}
            alt=""
            className="kadsamhsa-admin__brand-logo"
            width={36}
            height={28}
          />
          <span className="kadsamhsa-admin__brand-text">
            KADSAMHSA
            <span className="kadsamhsa-admin__brand-sub">Back office</span>
          </span>
        </Link>

        <nav className="kadsamhsa-admin__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `kadsamhsa-admin__navlink${isActive ? ' is-active' : ''}`
              }
            >
              <span className="kadsamhsa-admin__navicon">{item.icon}</span>
              <span>{item.label}</span>
              {!item.built && (
                <span className="kadsamhsa-admin__navsoon" title="Not in this milestone">
                  soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="kadsamhsa-admin__side-foot">
          {user && <p className="kadsamhsa-admin__side-user">{user.fullName}</p>}
          <Link to={routes.home} className="kadsamhsa-admin__side-link">
            View public site
          </Link>
          <button
            type="button"
            className="kadsamhsa-admin__side-link kadsamhsa-admin__side-link--button"
            onClick={signOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="kadsamhsa-admin__main" id="kadsamhsa-admin-main">
        <div className="kadsamhsa-admin__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
