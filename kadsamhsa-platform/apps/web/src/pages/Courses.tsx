import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, SearchIcon } from '../components/ArrowIcon';
import { BrandStrip } from '../components/BrandStrip';
import { PageFooter } from '../components/PageFooter';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';
import { useCourses } from '../data/useCourses';
import { pluralise } from '../format';

/**
 * Public catalogue (PRD F1). Free/paid tabs and search are query parameters on
 * `GET /courses` — the API filters, this renders.
 */
export function Courses() {
  const [priceType, setPriceType] = useState<'free' | 'paid'>('free');
  const [search, setSearch] = useState('');
  const { courses, loading, error } = useCourses({ priceType, search });

  return (
    <div className="kadsamhsa-courses">
      <section className="kadsamhsa-courses-hero" aria-labelledby="kadsamhsa-courses-title">
        <div className="kadsamhsa-container">
          <h1 id="kadsamhsa-courses-title" className="kadsamhsa-courses-hero__title">
            {strings.coursesherotitle}
          </h1>
          <p className="kadsamhsa-courses-hero__subtitle">{strings.coursesherosubtitle}</p>
        </div>
      </section>

      <section className="kadsamhsa-courses-list" aria-label={strings.coursespagetitle}>
        <div className="kadsamhsa-container">
          <div className="kadsamhsa-courses-toolbar">
            <div
              className="kadsamhsa-courses-tabs"
              role="tablist"
              aria-label={strings.coursesfilterlabel}
            >
              {(
                [
                  ['free', strings.coursesfilterfree],
                  ['paid', strings.coursesfilterpaid],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`kadsamhsa-courses-tabs__btn${
                    priceType === value ? ' is-active' : ''
                  }`}
                  role="tab"
                  aria-selected={priceType === value}
                  onClick={() => setPriceType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="kadsamhsa-courses-search">
              <label htmlFor="kadsamhsa-courses-search" className="sr-only">
                {strings.coursessearch}
              </label>
              <span className="kadsamhsa-courses-search__icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                type="search"
                id="kadsamhsa-courses-search"
                className="kadsamhsa-courses-search__input"
                placeholder={strings.coursessearchplaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="kadsamhsa-courses-grid" aria-busy={loading}>
            {courses.map((course) => (
              <article key={course.id} className="kadsamhsa-ccard">
                <div className="kadsamhsa-ccard__media">
                  <img
                    src={course.coverImageUrl ?? site.defaultCourseImage}
                    alt=""
                    loading="lazy"
                  />
                  <span
                    className={`kadsamhsa-ccard__badge kadsamhsa-ccard__badge--${course.priceType}`}
                  >
                    {course.priceType === 'free'
                      ? strings.coursesbadgefree
                      : strings.coursesbadgepaid}
                  </span>
                </div>
                <div className="kadsamhsa-ccard__body">
                  <h2 className="kadsamhsa-ccard__title">{course.title}</h2>
                  <p className="kadsamhsa-ccard__lessons">
                    {pluralise(course.lessonCount, 'lesson')}
                  </p>
                  <Link to={routes.course(course.slug)} className="kadsamhsa-ccard__enrol">
                    <span>{strings.coursesenroll}</span>
                    <span className="kadsamhsa-ccard__enrol-icon" aria-hidden="true">
                      <ArrowIcon />
                    </span>
                  </Link>
                  <Link to={routes.course(course.slug)} className="kadsamhsa-ccard__more">
                    {strings.coursesreadmore}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {error && <p className="kadsamhsa-courses-empty">{error}</p>}
          {!loading && !error && courses.length === 0 && (
            <p className="kadsamhsa-courses-empty">{strings.coursesempty}</p>
          )}
        </div>
      </section>

      <BrandStrip variant="courses" />
      <PageFooter variant="courses" />
    </div>
  );
}
