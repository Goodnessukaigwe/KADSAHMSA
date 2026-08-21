import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminUserSummary } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { AdminPage, StatusPill, adminPaths, errorMessage, formatDate } from './AdminLayout';

/**
 * The detail route for one user. Built from `adminPaths.users` rather than
 * added to that object, because `AdminLayout` owns it and only these two
 * screens link here.
 */
function userPath(userId: string): string {
  return `${adminPaths.users}/${userId}`;
}

/**
 * Role names are spelled out rather than imported from the domain's `ROLES`
 * constant: every other import from `@kadsamhsa/domain` in this app is
 * type-only, and importing a value from the barrel would pull zod (via
 * `schemas.ts`) into the browser bundle for four short strings.
 */
const ROLE_LABELS: Record<string, string> = {
  learner: 'Learner',
  org_admin: 'Org admin',
  content_admin: 'Content admin',
  super_admin: 'Super admin',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

/**
 * Account status reuses the shared pill palette: the modifier is a state word,
 * not a literal colour, so "suspended" borrows the same negative treatment as
 * "cancelled" instead of needing its own rule in _adminui.scss.
 */
export function accountPillStatus(status: AdminUserSummary['status']): string {
  if (status === 'active') {
    return 'active';
  }
  return status === 'suspended' ? 'cancelled' : 'archived';
}

export function accountStatusLabel(status: AdminUserSummary['status']): string {
  if (status === 'active') {
    return 'Active';
  }
  return status === 'suspended' ? 'Suspended' : 'Deleted';
}

/**
 * Users & CRM (PRD A6): every account on the platform, with enough context in
 * the row — enrolments, completions, certificates — to answer the common
 * support question without opening the record.
 *
 * Search is served by the API rather than filtered client-side, because the
 * list is the whole user table and shipping it to the browser to grep it would
 * stop working long before the platform does.
 */
export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** True only for the very first load, so typing never blanks the table. */
  const [firstLoad, setFirstLoad] = useState(true);

  const navigate = useNavigate();

  // Debounce: a request per keystroke would put the answer behind a queue of
  // its own stale predecessors.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .adminUsers(query || undefined)
      .then((result) => {
        if (active) {
          setUsers(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setUsers([]);
          setError(errorMessage(caught, 'Could not load the user list.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setFirstLoad(false);
        }
      });
    return () => {
      active = false;
    };
  }, [query]);

  const suspended = users.filter((user) => user.status === 'suspended').length;

  return (
    <AdminPage
      title="Users"
      subtitle={
        loading || error
          ? undefined
          : `${users.length} ${users.length === 1 ? 'account' : 'accounts'}${
              suspended > 0 ? ` · ${suspended} suspended` : ''
            }${query ? ` matching “${query}”` : ''}`
      }
    >
      <form
        className="kadsamhsa-admin__panel"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="kadsamhsa-admin__field">
          <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-user-search">
            Search users
          </label>
          <input
            id="kadsamhsa-admin-user-search"
            className="kadsamhsa-admin__input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            autoComplete="off"
          />
          <p className="kadsamhsa-admin__hint">
            Matches name and email. Results update as you type.
          </p>
        </div>
      </form>

      {firstLoad && loading && <p className="kadsamhsa-admin__state">Loading users…</p>}

      {!firstLoad && loading && (
        <p className="kadsamhsa-admin__state" role="status">
          Searching…
        </p>
      )}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="kadsamhsa-admin__state">
          {query
            ? `No account matches “${query}”.`
            : 'No accounts have been created on the platform yet.'}
        </p>
      )}

      {!error && users.length > 0 && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__tablewrap">
            <table className="kadsamhsa-admin__table">
              <caption className="sr-only">Accounts on the platform</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Roles</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Enrolments
                  </th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Completions
                  </th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Certificates
                  </th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="kadsamhsa-admin__row"
                    onClick={() => navigate(userPath(user.id))}
                  >
                    <td>
                      {/* A real link, so the row is reachable by keyboard and
                          openable in a new tab; the row click is a shortcut. */}
                      <Link
                        to={userPath(user.id)}
                        className="kadsamhsa-admin__rowlink"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {user.fullName}
                      </Link>
                      {!user.emailVerified && (
                        <span className="kadsamhsa-admin__tag">Unverified</span>
                      )}
                    </td>
                    <td>
                      <span className="kadsamhsa-admin__wrap">{user.email}</span>
                    </td>
                    <td>
                      {user.roles.length === 0 ? (
                        <span className="kadsamhsa-admin__subtle">No roles</span>
                      ) : (
                        user.roles.map((role) => (
                          <StatusPill key={role} status={role} label={roleLabel(role)} />
                        ))
                      )}
                    </td>
                    <td>
                      <StatusPill
                        status={accountPillStatus(user.status)}
                        label={accountStatusLabel(user.status)}
                      />
                    </td>
                    <td className="kadsamhsa-admin__num">{user.enrolmentCount}</td>
                    <td className="kadsamhsa-admin__num">{user.completionCount}</td>
                    <td className="kadsamhsa-admin__num">{user.certificateCount}</td>
                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminPage>
  );
}
