import { BrandStrip } from '../components/BrandStrip';
import { Faq, type FaqEntry } from '../components/Faq';
import { PageFooter } from '../components/PageFooter';
import { strings } from '../content/strings';

const FAQS: FaqEntry[] = [
  { question: strings.aboutfaq1q, answer: strings.aboutfaq1a },
  { question: strings.aboutfaq2q, answer: strings.aboutfaq2a },
  { question: strings.aboutfaq3q, answer: strings.aboutfaq3a },
  { question: strings.aboutfaq4q, answer: strings.aboutfaq4a },
  { question: strings.aboutfaq5q, answer: strings.aboutfaq5a },
];

/** Port of templates/about.mustache (rendered by about.php). */
export function About() {
  return (
    <div className="kadsamhsa-about">
      <section className="kadsamhsa-about-hero" aria-labelledby="kadsamhsa-about-title">
        <div className="kadsamhsa-container kadsamhsa-about-hero__grid">
          <div className="kadsamhsa-about-hero__media" aria-hidden="true">
            <div className="kadsamhsa-about-ph kadsamhsa-about-ph--hero">
              <span>{strings.signupmediaplaceholder}</span>
            </div>
          </div>

          <div className="kadsamhsa-about-hero__copy">
            <p className="kadsamhsa-about-hero__eyebrow">{strings.aboutbadge}</p>
            <h1 id="kadsamhsa-about-title" className="kadsamhsa-about-hero__title">
              {strings.abouttitle}
            </h1>
            <p className="kadsamhsa-about-hero__lead">{strings.aboutlead}</p>

            <div className="kadsamhsa-about-panels">
              <div className="kadsamhsa-about-panel">
                <h2 className="kadsamhsa-about-panel__label">{strings.aboutmissionlabel}</h2>
                <p className="kadsamhsa-about-panel__text">{strings.aboutmission}</p>
              </div>
              <div className="kadsamhsa-about-panel">
                <h2 className="kadsamhsa-about-panel__label">{strings.aboutvisionlabel}</h2>
                <p className="kadsamhsa-about-panel__text">{strings.aboutvision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kadsamhsa-about-faq" aria-labelledby="kadsamhsa-about-faq-title">
        <div className="kadsamhsa-container">
          <h2 id="kadsamhsa-about-faq-title" className="kadsamhsa-about-faq__heading">
            {strings.aboutfaqtitle}
          </h2>

          <div className="kadsamhsa-about-faq__grid">
            <div className="kadsamhsa-about-faq__main">
              <span className="kadsamhsa-about-faq__pill">{strings.aboutfaqpill}</span>
              <div className="kadsamhsa-about-accordion">
                <Faq
                  items={FAQS}
                  defaultOpen={1}
                  itemClassName="kadsamhsa-about-acc"
                  bodyClassName="kadsamhsa-about-acc__body"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <BrandStrip variant="about" />
      <PageFooter variant="about" />
    </div>
  );
}
