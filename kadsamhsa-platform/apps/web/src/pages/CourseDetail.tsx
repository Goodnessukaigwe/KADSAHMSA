import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiClientError } from '@kadsamhsa/api-contract';
import { BrandStrip } from '../components/BrandStrip';
import { PageFooter } from '../components/PageFooter';
import { useAuth } from '../auth/AuthProvider';
import { strings } from '../content/strings';
import { api } from '../data/api';
import { routes, site } from '../data/site';
import { useCourse } from '../data/useCourse';
import { formatDuration, pluralise } from '../format';

/**
 * Course detail and enrolment (PRD F2).
 *
 * Enrolling needs a session, so an anonymous visitor is sent to sign in with
 * their intended destination remembered, rather than shown a button that fails.
 */
export function CourseDetail() {
  const { slug } = useParams();
  const { course, loading, notFound } = useCourse(slug);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="kadsamhsa-course-hero">
        <div className="kadsamhsa-container">
          <p className="kadsamhsa-lead">Loading…</p>
        </div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="kadsamhsa-course-hero">
        <div className="kadsamhsa-container">
          <h1 className="kadsamhsa-course-hero__title">Course not found</h1>
          <Link to={routes.courses} className="kadsamhsa-course-hero__enrol-btn">
            {strings.catalogue}
          </Link>
        </div>
      </div>
    );
  }

  const enrol = async () => {
    if (!user) {
      navigate(routes.login, { state: { from: routes.course(course.slug) } });
      return;
    }
    setEnrolling(true);
    setEnrolError(null);
    try {
      await api.enrol(course.id);
      navigate(routes.dashboard);
    } catch (error) {
      setEnrolError(
        error instanceof ApiClientError ? error.message : 'Could not enrol. Try again.',
      );
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <>
      <div className="kadsamhsa-course-hero">
        <div className="kadsamhsa-container">
          <div className="kadsamhsa-course-hero__grid">
            <div>
              <p className="kadsamhsa-eyebrow">{strings.onlinecourse}</p>
              <h1 className="kadsamhsa-course-hero__title">{course.title}</h1>
              {course.summary && (
                <p className="kadsamhsa-course-hero__summary">{course.summary}</p>
              )}
              <ul className="kadsamhsa-course-hero__meta-list">
                <li>
                  <span aria-hidden="true">⏱</span>{' '}
                  {course.durationMinutes
                    ? formatDuration(course.durationMinutes)
                    : strings.durationplaceholder}
                </li>
                {course.categoryName && (
                  <li>
                    <span aria-hidden="true">📂</span> {course.categoryName}
                  </li>
                )}
                {course.certificateAvailable && (
                  <li>
                    <span aria-hidden="true">🎓</span> {strings.certincluded}
                  </li>
                )}
              </ul>

              {course.objectives.length > 0 && (
                <>
                  <h2>What you will learn</h2>
                  <ul className="kadsamhsa-course-hero__meta-list">
                    {course.objectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                </>
              )}

              <h2>Course outline</h2>
              <ol className="kadsamhsa-course-outline">
                {course.modules.map((module) => (
                  <li key={module.id}>
                    <strong>{module.title}</strong>
                    <span className="kadsamhsa-text-muted">
                      {' '}
                      — {pluralise(module.lessons.length, 'lesson')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="kadsamhsa-course-hero__sidebar">
              <img
                src={course.coverImageUrl ?? site.defaultCourseImage}
                alt=""
                className="kadsamhsa-course-hero__image"
                loading="lazy"
                width={320}
                height={180}
              />
              <button
                type="button"
                className="kadsamhsa-course-hero__enrol-btn"
                onClick={enrol}
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling…' : strings.enrolme}
              </button>
              {enrolError && <p className="kadsamhsa-form__error">{enrolError}</p>}
              <p className="kadsamhsa-course-hero__cert-note">
                {strings.certnotedetail} Pass mark: {course.passMarkPercent}%.
              </p>
            </aside>
          </div>
        </div>
      </div>

      <BrandStrip variant="courses" />
      <PageFooter variant="courses" />
    </>
  );
}
