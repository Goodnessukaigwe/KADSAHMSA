import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminCourseSummary } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { AdminPage, StatusPill, adminPaths, errorMessage, formatMoney } from './AdminLayout';

function priceLabel(course: AdminCourseSummary): string {
  if (course.priceType === 'free') {
    return 'Free';
  }
  return course.priceAmount === null ? 'No price set' : formatMoney(course.priceAmount, course.currency);
}

/**
 * The course list (PRD A1) — the entry point to the builder.
 *
 * Creating a course only asks for a title: everything else is edited in the
 * builder, and a staff member who has to fill a long form before seeing the
 * tool tends to abandon it.
 */
export function AdminCourses() {
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .adminCourses()
      .then((result) => {
        if (active) {
          setCourses(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setCourses([]);
          setError(errorMessage(caught, 'Could not load the course list.'));
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

  const createCourse = async (event: FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (title.length < 2) {
      setCreateError('Give the course a title of at least two characters.');
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await api.adminCreateCourse({ title });
      navigate(adminPaths.course(created.id));
    } catch (caught) {
      setCreateError(errorMessage(caught, 'Could not create the course. Try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AdminPage
      title="Courses"
      subtitle="Every course on the platform, newest change first."
      actions={
        <button
          type="button"
          className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
          onClick={() => {
            setCreating((open) => !open);
            setCreateError(null);
          }}
          aria-expanded={creating}
        >
          {creating ? 'Cancel' : 'New course'}
        </button>
      }
    >
      {creating && (
        <form className="kadsamhsa-admin__panel kadsamhsa-admin__inline-form" onSubmit={createCourse}>
          <div className="kadsamhsa-admin__field">
            <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-new-course">
              Course title
            </label>
            <input
              id="kadsamhsa-admin-new-course"
              className="kadsamhsa-admin__input"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Mental Health First Aid"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create and open builder'}
          </button>
          {createError && (
            <p className="kadsamhsa-admin__error" role="alert">
              {createError}
            </p>
          )}
        </form>
      )}

      {loading && <p className="kadsamhsa-admin__state">Loading courses…</p>}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && courses.length === 0 && (
        <p className="kadsamhsa-admin__state">
          No courses yet. Use <strong>New course</strong> to create the first one.
        </p>
      )}

      {!loading && !error && courses.length > 0 && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__tablewrap">
            <table className="kadsamhsa-admin__table">
              <caption className="sr-only">Courses on the platform</caption>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Modules
                  </th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Lessons
                  </th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Enrolments
                  </th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr
                    key={course.id}
                    className="kadsamhsa-admin__row"
                    onClick={() => navigate(adminPaths.course(course.id))}
                  >
                    <td>
                      {/* A real link, so the row is reachable by keyboard and
                          openable in a new tab; the row click is a shortcut. */}
                      <Link
                        to={adminPaths.course(course.id)}
                        className="kadsamhsa-admin__rowlink"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {course.title}
                      </Link>
                      {course.isFeatured && (
                        <span className="kadsamhsa-admin__tag">Featured</span>
                      )}
                    </td>
                    <td>
                      <StatusPill status={course.status} />
                    </td>
                    <td className="kadsamhsa-admin__num">{course.moduleCount}</td>
                    <td className="kadsamhsa-admin__num">{course.lessonCount}</td>
                    <td className="kadsamhsa-admin__num">{course.enrolmentCount}</td>
                    <td>{priceLabel(course)}</td>
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
