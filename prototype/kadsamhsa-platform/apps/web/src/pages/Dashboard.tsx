import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ContinueCourse, LearnerDashboard } from '@kadsamhsa/domain';
import { ArrowIcon } from '../components/ArrowIcon';
import { StudentChrome } from '../components/StudentChrome';
import { strings } from '../content/strings';
import { api } from '../data/api';
import { routes, site } from '../data/site';

/** Shared "Continue" / "Enroll" pill from the design. */
function ShomeButton({
  to,
  variant,
  label,
  className,
}: {
  to: string;
  variant: 'light' | 'dark';
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`kadsamhsa-shome-btn kadsamhsa-shome-btn--${variant}${
        className ? ` ${className}` : ''
      }`}
    >
      <span>{label}</span>
      <span className="kadsamhsa-shome-btn__icon" aria-hidden="true">
        <ArrowIcon />
      </span>
    </Link>
  );
}

function ProgressBar({ percent, className }: { percent: number; className: string }) {
  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={strings.courseprogress}
    >
      <span className={`${className}-fill`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/**
 * Port of templates/learner_dashboard.mustache — the student home.
 *
 * Two states, as designed: a returning learner sees a "continue learning" hero
 * plus any other started courses; a first-time learner sees the DPTC pitch.
 * Both then get the explore grid, filtered by the chrome's search box.
 */
export function Dashboard() {
  const [data, setData] = useState<LearnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingLeaving, setOnboardingLeaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api
      .dashboard()
      .then((result) => {
        if (!active) {
          return;
        }
        setData(result);
        // Only a learner who has not started anything gets the first-run card.
        if (!result.onboardingDismissed && !result.hasStarted) {
          // Next frame, so the off-screen start state paints before the
          // is-visible transition — same trick as the original AMD module.
          requestAnimationFrame(() => requestAnimationFrame(() => setOnboardingOpen(true)));
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

  const dismissOnboarding = () => {
    if (onboardingLeaving) {
      return;
    }
    setOnboardingLeaving(true);
    setOnboardingOpen(false);
    // Matches the 340ms slide-out in _dashboard.scss.
    setTimeout(() => {
      setOnboardingLeaving(false);
      setData((current) => (current ? { ...current, onboardingDismissed: true } : current));
    }, 340);
    // Best-effort: the card is already gone from the UI either way.
    void api.setPreference('dash_onboarding_dismissed', true).catch(() => {});
  };

  const explore = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!data) {
      return [];
    }
    return needle
      ? data.exploreCourses.filter((course) => course.title.toLowerCase().includes(needle))
      : data.exploreCourses;
  }, [data, search]);

  const showOnboarding =
    data !== null && !data.onboardingDismissed && !data.hasStarted;

  return (
    <div className="kadsamhsa-shome">
      <StudentChrome search={search} onSearchChange={setSearch} />

      <main className="kadsamhsa-shome-main" id="kadsamhsa-shome-main">
        <div className="kadsamhsa-shome-main__inner">
          {showOnboarding && (
            <div
              className={`kadsamhsa-shome-modal${onboardingOpen ? ' is-visible' : ''}${
                onboardingLeaving ? ' is-leaving' : ''
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kadsamhsa-shome-modal-title"
              aria-hidden={!onboardingOpen}
            >
              <div className="kadsamhsa-shome-modal__card">
                <div className="kadsamhsa-shome-modal__head">
                  <h2 id="kadsamhsa-shome-modal-title">{strings.dashmodaltitle}</h2>
                  <span className="kadsamhsa-shome-modal__step">{strings.dashmodalstep}</span>
                </div>
                <div className="kadsamhsa-shome-modal__progress" aria-hidden="true">
                  <span className="is-active" />
                  <span />
                  <span />
                </div>
                <p className="kadsamhsa-shome-modal__body">{strings.dashmodalbody}</p>
                <button
                  type="button"
                  className="kadsamhsa-shome-modal__btn"
                  onClick={dismissOnboarding}
                >
                  {strings.dashmodalcta}
                </button>
              </div>
            </div>
          )}

          {loading && <p className="kadsamhsa-lead">Loading your dashboard…</p>}

          {!loading && !data && (
            <p className="kadsamhsa-lead">Could not load your dashboard. Refresh to try again.</p>
          )}

          {data?.hasStarted && data.continueCourse && (
            <>
              <section
                className="kadsamhsa-shome-hero kadsamhsa-shome-hero--returning"
                aria-labelledby="kadsamhsa-shome-hero-title"
              >
                <h1
                  id="kadsamhsa-shome-hero-title"
                  className="kadsamhsa-shome-hero__title kadsamhsa-shome-hero__title--wide"
                >
                  Welcome back, {data.user.fullName.split(' ')[0]}
                </h1>
                <p className="kadsamhsa-shome-hero__subtitle">{strings.dashcontinuesubtitle}</p>

                <ContinueCard course={data.continueCourse} />
              </section>

              {data.alsoStarted.length > 0 && (
                <section
                  className="kadsamhsa-shome-started"
                  aria-labelledby="kadsamhsa-shome-started-title"
                >
                  <h2
                    id="kadsamhsa-shome-started-title"
                    className="kadsamhsa-shome-started__title"
                  >
                    {strings.dashalsostarted}
                  </h2>
                  <div className="kadsamhsa-shome-started__list">
                    {data.alsoStarted.map((course) => (
                      <article key={course.enrolmentId} className="kadsamhsa-shome-started-card">
                        <div className="kadsamhsa-shome-started-card__media" aria-hidden="true">
                          <img
                            src={course.coverImageUrl ?? site.defaultCourseImage}
                            alt=""
                            loading="lazy"
                          />
                        </div>
                        <div className="kadsamhsa-shome-started-card__body">
                          <h3 className="kadsamhsa-shome-started-card__title">
                            {course.courseTitle}
                          </h3>
                          <p className="kadsamhsa-shome-started-card__module">
                            {strings.dashmodulelabel} {course.moduleCurrent} of{' '}
                            {course.moduleTotal}
                          </p>
                          <ProgressBar
                            percent={course.progressPercent}
                            className="kadsamhsa-shome-started-card__progress"
                          />
                        </div>
                        <ShomeButton
                          to={routes.course(course.courseSlug)}
                          variant="dark"
                          label={strings.dashcontinueshort}
                          className="kadsamhsa-shome-started-card__cta"
                        />
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {data && !data.hasStarted && (
            <section className="kadsamhsa-shome-hero" aria-labelledby="kadsamhsa-shome-hero-title">
              <p className="kadsamhsa-shome-hero__eyebrow">{strings.dashheroeyebrow}</p>
              <h1 id="kadsamhsa-shome-hero-title" className="kadsamhsa-shome-hero__title">
                {strings.dashherotitle}
              </h1>

              {data.featuredCourse && (
                <article className="kadsamhsa-shome-featured">
                  <div className="kadsamhsa-shome-featured__media" aria-hidden="true">
                    <img
                      src={data.featuredCourse.coverImageUrl ?? site.defaultCourseImage}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <div className="kadsamhsa-shome-featured__copy">
                    <h2 className="kadsamhsa-shome-featured__name">
                      {data.featuredCourse.title}
                    </h2>
                    <p className="kadsamhsa-shome-featured__price">
                      {strings.dashprice}:{' '}
                      {data.featuredCourse.priceType === 'free' ? 'Free' : 'Paid'}
                    </p>
                    <p className="kadsamhsa-shome-featured__summary">
                      {data.featuredCourse.summary}
                    </p>
                    <div className="kadsamhsa-shome-featured__actions">
                      <ShomeButton
                        to={routes.course(data.featuredCourse.slug)}
                        variant="light"
                        label={strings.dashenroll}
                      />
                      <Link
                        to={routes.course(data.featuredCourse.slug)}
                        className="kadsamhsa-shome-featured__more"
                      >
                        {strings.dashreadmore}
                      </Link>
                    </div>
                  </div>
                </article>
              )}
            </section>
          )}

          {data && (
            <section
              className="kadsamhsa-shome-explore"
              aria-labelledby="kadsamhsa-shome-explore-title"
            >
              <h2 id="kadsamhsa-shome-explore-title" className="kadsamhsa-shome-explore__title">
                {strings.dashexplore}
              </h2>
              <div className="kadsamhsa-shome-grid">
                {explore.map((course) => (
                  <article key={course.id} className="kadsamhsa-shome-card">
                    <div className="kadsamhsa-shome-card__media">
                      <img
                        src={course.coverImageUrl ?? site.defaultCourseImage}
                        alt=""
                        loading="lazy"
                      />
                      <span className="kadsamhsa-shome-card__badge">
                        {course.priceType === 'free'
                          ? strings.coursesbadgefree
                          : strings.coursesbadgepaid}
                      </span>
                    </div>
                    <div className="kadsamhsa-shome-card__body">
                      <h3 className="kadsamhsa-shome-card__title">{course.title}</h3>
                      <p className="kadsamhsa-shome-card__lessons">
                        {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                      </p>
                      <div className="kadsamhsa-shome-card__actions">
                        <ShomeButton
                          to={routes.course(course.slug)}
                          variant="dark"
                          label={strings.dashenroll}
                        />
                        <Link
                          to={routes.course(course.slug)}
                          className="kadsamhsa-shome-card__more"
                        >
                          {strings.dashreadmore}
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {explore.length === 0 && (
                <p className="kadsamhsa-shome-empty">{strings.dashemptysearch}</p>
              )}
            </section>
          )}

          {data && data.certificates.length > 0 && (
            <section className="kadsamhsa-shome-explore" aria-labelledby="kadsamhsa-certs-title">
              <h2 id="kadsamhsa-certs-title" className="kadsamhsa-shome-explore__title">
                Certificates
              </h2>
              <ul className="kadsamhsa-dash__certificates">
                {data.certificates.map((certificate) => (
                  <li key={certificate.id}>
                    <Link to={`/certificates/${certificate.id}`}>
                      <strong>{certificate.courseTitle}</strong>
                    </Link>
                    <span className="kadsamhsa-text-muted">
                      {' '}
                      · {new Date(certificate.issuedAt).toLocaleDateString()} ·{' '}
                      {certificate.verificationId}
                      {certificate.status === 'revoked' && ' · Revoked'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );

  function ContinueCard({ course }: { course: ContinueCourse }) {
    return (
      <article className="kadsamhsa-shome-featured kadsamhsa-shome-featured--continue">
        <div className="kadsamhsa-shome-featured__media" aria-hidden="true">
          <img src={course.coverImageUrl ?? site.defaultCourseImage} alt="" loading="lazy" />
        </div>
        <div className="kadsamhsa-shome-featured__copy">
          <h2 className="kadsamhsa-shome-featured__name">{course.courseTitle}</h2>
          <ul className="kadsamhsa-shome-featured__meta">
            <li>
              {strings.dashprice}: {course.priceLabel}
            </li>
            <li>
              {strings.dashmodulelabel}: {course.moduleCurrent} of {course.moduleTotal}
            </li>
            <li>
              {strings.dashdurationlabel}: {course.durationLabel}
            </li>
          </ul>
          <ProgressBar
            percent={course.progressPercent}
            className="kadsamhsa-shome-featured__progress"
          />
          <div className="kadsamhsa-shome-featured__actions">
            <button
              type="button"
              className="kadsamhsa-shome-btn kadsamhsa-shome-btn--light"
              onClick={() => navigate(routes.course(course.courseSlug))}
            >
              <span>{strings.dashcontinuecta}</span>
              <span className="kadsamhsa-shome-btn__icon" aria-hidden="true">
                <ArrowIcon />
              </span>
            </button>
          </div>
        </div>
      </article>
    );
  }
}
