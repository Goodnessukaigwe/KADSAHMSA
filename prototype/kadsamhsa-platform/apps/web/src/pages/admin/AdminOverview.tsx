import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminOverview as AdminOverviewData } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { AdminPage, adminPaths, errorMessage, formatMoney } from './AdminLayout';

interface Tile {
  label: string;
  value: string;
  hint?: string;
}

function tilesFor(data: AdminOverviewData): Tile[] {
  const completionRate =
    data.enrolments === 0 ? null : Math.round((data.completions / data.enrolments) * 100);

  return [
    { label: 'Learners', value: data.learners.toLocaleString('en-NG') },
    {
      label: 'Published courses',
      value: data.publishedCourses.toLocaleString('en-NG'),
      hint: `${data.draftCourses.toLocaleString('en-NG')} in draft`,
    },
    { label: 'Draft courses', value: data.draftCourses.toLocaleString('en-NG') },
    { label: 'Enrolments', value: data.enrolments.toLocaleString('en-NG') },
    {
      label: 'Completions',
      value: data.completions.toLocaleString('en-NG'),
      hint: completionRate === null ? undefined : `${completionRate}% of enrolments`,
    },
    { label: 'Certificates issued', value: data.certificatesIssued.toLocaleString('en-NG') },
    {
      label: 'Revenue',
      value: formatMoney(data.revenueMinor, data.currency),
      hint: 'Paid orders only',
    },
  ];
}

/**
 * Platform counters (PRD A8). Everything on this screen is a single read, so a
 * failure here is total: there is no partially useful dashboard to show.
 */
export function AdminOverview() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .adminOverview()
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setData(null);
          setError(errorMessage(caught, 'Could not load the platform overview.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminPage
      title="Overview"
      subtitle="How the academy is doing right now."
      actions={
        <Link to={adminPaths.courses} className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary">
          Manage courses
        </Link>
      }
    >
      {loading && <p className="kadsamhsa-admin__state">Loading the overview…</p>}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <div className="kadsamhsa-admin__tiles">
            {tilesFor(data).map((tile) => (
              <article key={tile.label} className="kadsamhsa-admin__tile">
                <p className="kadsamhsa-admin__tile-label">{tile.label}</p>
                <p className="kadsamhsa-admin__tile-value">{tile.value}</p>
                {tile.hint && <p className="kadsamhsa-admin__tile-hint">{tile.hint}</p>}
              </article>
            ))}
          </div>

          <section className="kadsamhsa-admin__panel">
            <div className="kadsamhsa-admin__panel-head">
              <h2 className="kadsamhsa-admin__panel-title">Where to next</h2>
            </div>
            <div className="kadsamhsa-admin__quicklinks">
              <Link to={adminPaths.courses} className="kadsamhsa-admin__quicklink">
                <span className="kadsamhsa-admin__quicklink-title">Courses</span>
                <span className="kadsamhsa-admin__quicklink-note">
                  Build modules, lessons and content blocks, then publish.
                </span>
              </Link>
              <Link to={adminPaths.offers} className="kadsamhsa-admin__quicklink">
                <span className="kadsamhsa-admin__quicklink-title">Offers</span>
                <span className="kadsamhsa-admin__quicklink-note">
                  Package courses at a price, with seats for organisations.
                </span>
              </Link>
              <Link to={adminPaths.payments} className="kadsamhsa-admin__quicklink">
                <span className="kadsamhsa-admin__quicklink-title">Payments</span>
                <span className="kadsamhsa-admin__quicklink-note">
                  Reconcile orders against what actually settled.
                </span>
              </Link>
            </div>
          </section>
        </>
      )}
    </AdminPage>
  );
}
