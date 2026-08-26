import { Link } from 'react-router-dom';
import { ArrowIcon } from '../components/ArrowIcon';
import { Faq, type FaqEntry } from '../components/Faq';
import { useAuth } from '../auth/AuthProvider';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';
import { useCourses } from '../data/useCourses';
import { formatDuration, pluralise } from '../format';

const FAQS: FaqEntry[] = [
  { question: strings.landingfaq1q, answer: strings.landingfaq1a },
  { question: strings.landingfaq2q, answer: strings.landingfaq2a },
  { question: strings.landingfaq3q, answer: strings.landingfaq3a },
  { question: strings.landingfaq4q, answer: strings.landingfaq4a },
];

const PLANS = [
  {
    name: strings.landingplan1name,
    price: strings.landingplan1price,
    features: [strings.landingplan1f1, strings.landingplan1f2, strings.landingplan1f3],
    href: routes.register,
  },
  {
    name: strings.landingplan2name,
    price: strings.landingplan2price,
    features: [strings.landingplan2f1, strings.landingplan2f2, strings.landingplan2f3],
    href: routes.courses,
  },
] as const;

/** Public landing page (PRD F1). */
export function Landing() {
  const { user } = useAuth();
  const { courses } = useCourses({ pageSize: 3 });

  // Signed-in visitors have already done the "get started" step.
  const getStartedHref = user ? routes.dashboard : routes.register;

  return (
    <div className="kadsamhsa-landing">
      {/* —— Hero —— */}
      <section className="kadsamhsa-landing-hero" aria-labelledby="kadsamhsa-landing-hero-title">
        <div className="kadsamhsa-container kadsamhsa-landing-hero__inner">
          <h1 id="kadsamhsa-landing-hero-title" className="kadsamhsa-landing-hero__title">
            {strings.landingherotitle}
          </h1>
          <p className="kadsamhsa-landing-hero__subtitle">{strings.landingherosubtitle}</p>
          <Link to={getStartedHref} className="kadsamhsa-btn kadsamhsa-btn--pill">
            <span>{strings.landinggetstarted}</span>
            <span className="kadsamhsa-btn__arrow" aria-hidden="true">
              <ArrowIcon />
            </span>
          </Link>

          <div className="kadsamhsa-landing-hero__gallery" aria-hidden="true">
            <div className="kadsamhsa-media-ph kadsamhsa-media-ph--hero" />
            <div className="kadsamhsa-media-ph kadsamhsa-media-ph--hero" />
            <div className="kadsamhsa-media-ph kadsamhsa-media-ph--hero" />
          </div>
        </div>
      </section>

      {/* —— About + stats —— */}
      <section id="about" className="kadsamhsa-landing-about">
        <div className="kadsamhsa-container kadsamhsa-landing-about__grid">
          <div className="kadsamhsa-landing-about__copy">
            <h2 className="kadsamhsa-landing-about__title">{strings.landingabouttitle}</h2>
            <p className="kadsamhsa-landing-about__text">{strings.landingaboutbody}</p>
            <Link to={routes.courses} className="kadsamhsa-btn kadsamhsa-btn--pill">
              {strings.landinglearnmore}
            </Link>

            <div className="kadsamhsa-landing-stats" role="list">
              <div className="kadsamhsa-landing-stats__item" role="listitem">
                <div className="kadsamhsa-landing-stats__number">{strings.landingstat1num}</div>
                <div className="kadsamhsa-landing-stats__label">{strings.landingstat1label}</div>
              </div>
              <div className="kadsamhsa-landing-stats__item" role="listitem">
                <div className="kadsamhsa-landing-stats__number">
                  {Math.max(courses.length, 1)}+
                </div>
                <div className="kadsamhsa-landing-stats__label">{strings.landingstat2label}</div>
              </div>
              <div className="kadsamhsa-landing-stats__item" role="listitem">
                <div className="kadsamhsa-landing-stats__number">{strings.landingstat3num}</div>
                <div className="kadsamhsa-landing-stats__label">{strings.landingstat3label}</div>
              </div>
            </div>
          </div>
          <div className="kadsamhsa-landing-about__media" aria-hidden="true">
            <div className="kadsamhsa-media-ph kadsamhsa-media-ph--about">
              <span>{strings.signupmediaplaceholder}</span>
            </div>
          </div>
        </div>
      </section>

      {/* —— Featured courses —— */}
      <section id="courses" className="kadsamhsa-landing-courses">
        <div className="kadsamhsa-container">
          <header className="kadsamhsa-landing-sectionhead">
            <h2>{strings.landingfeaturedtitle}</h2>
            <p>{strings.landingfeaturedsubtitle}</p>
          </header>

          <div className="kadsamhsa-landing-courses__grid">
            {courses.map((course) => (
              <article key={course.id} className="kadsamhsa-course-card">
                <div className="kadsamhsa-course-card__media" aria-hidden="true">
                  <img
                    src={course.coverImageUrl ?? site.defaultCourseImage}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <div className="kadsamhsa-course-card__body">
                  <h3 className="kadsamhsa-course-card__title">{course.title}</h3>
                  <ul className="kadsamhsa-course-card__meta">
                    <li>{pluralise(course.lessonCount, 'lesson')}</li>
                    <li>
                      {course.durationMinutes
                        ? formatDuration(course.durationMinutes)
                        : strings.durationplaceholder}
                    </li>
                    <li>{strings.landingcourserating}</li>
                  </ul>
                  <p className="kadsamhsa-course-card__desc">{course.summary}</p>
                  <Link
                    to={routes.course(course.slug)}
                    className="kadsamhsa-btn kadsamhsa-btn--pill kadsamhsa-btn--block"
                  >
                    {strings.landingenrollnow}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* —— Plans —— */}
      <section id="plans" className="kadsamhsa-landing-plans">
        <div className="kadsamhsa-container">
          <header className="kadsamhsa-landing-sectionhead">
            <h2>{strings.landingplanstitle}</h2>
            <p>{strings.landingplanssubtitle}</p>
          </header>

          <div className="kadsamhsa-landing-plans__grid">
            {PLANS.map((plan) => (
              <article key={plan.name} className="kadsamhsa-plan-card">
                <h3 className="kadsamhsa-plan-card__name">{plan.name}</h3>
                <p className="kadsamhsa-plan-card__price">{plan.price}</p>
                <ul className="kadsamhsa-plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className="kadsamhsa-btn kadsamhsa-btn--pill kadsamhsa-btn--block"
                >
                  {strings.landingchooseplan}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* —— FAQ + contact visual —— */}
      <section id="faq" className="kadsamhsa-landing-faq">
        <div className="kadsamhsa-container kadsamhsa-landing-faq__grid">
          <div className="kadsamhsa-landing-faq__copy">
            <h2>{strings.landingfaqtitle}</h2>
            <div className="kadsamhsa-faq-list">
              <Faq
                items={FAQS}
                defaultOpen={0}
                itemClassName="kadsamhsa-faq-item"
                bodyClassName="kadsamhsa-faq-item__body"
              />
            </div>
          </div>
          <div className="kadsamhsa-landing-faq__aside">
            <div className="kadsamhsa-media-ph kadsamhsa-media-ph--faq" aria-hidden="true">
              <span>{strings.signupmediaplaceholder}</span>
            </div>
            <div className="kadsamhsa-landing-faq__contact-card" id="contact">
              <p>{strings.landingcontactblurb}</p>
              <a href={`mailto:${site.contactEmail}`} className="kadsamhsa-btn kadsamhsa-btn--pill">
                {strings.landingcontactcta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* —— Brand strip —— */}
      <section className="kadsamhsa-landing-brand" aria-label={site.name}>
        <div className="kadsamhsa-container kadsamhsa-landing-brand__inner">
          <img
            src={site.logoUrl}
            alt="KADSAMHSA"
            className="kadsamhsa-landing-brand__logo"
            width={120}
            height={90}
          />
          <p className="kadsamhsa-landing-brand__name">{site.name}</p>
          <div className="kadsamhsa-landing-brand__contact">
            <div>
              <strong>{strings.landingaddresslabel}</strong>
              <span>{strings.landingaddress}</span>
            </div>
            <div>
              <strong>{strings.landingemaillabel}</strong>
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </div>
            <div>
              <strong>{strings.landingphonelabel}</strong>
              <span>{strings.landingphone}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
