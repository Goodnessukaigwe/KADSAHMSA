import { strings } from '../content/strings';
import { site } from '../data/site';

interface BrandStripProps {
  /** Chooses the `kadsamhsa-about-brand` or `kadsamhsa-courses-brand` block. */
  variant: 'about' | 'courses';
}

/**
 * The logo + contact band that closes the About and Courses pages. Both
 * templates carried the same structure under different block names, and only
 * About rendered the ◉/☎/✉ glyphs.
 */
export function BrandStrip({ variant }: BrandStripProps) {
  const block = `kadsamhsa-${variant}-brand`;
  const showIcons = variant === 'about';
  const phone = variant === 'about' ? strings.aboutphone : strings.coursesphone;

  return (
    <section className={block} aria-label={site.name}>
      <div className={`kadsamhsa-container ${block}__inner`}>
        <img
          src={site.logoUrl}
          alt="KADSAMHSA"
          className={`${block}__logo`}
          width={140}
          height={105}
        />
        <p className={`${block}__name`}>{site.name}</p>
        <div className={`${block}__contact`}>
          <div className={`${block}__contact-item`}>
            {showIcons && (
              <span className={`${block}__icon`} aria-hidden="true">
                ◉
              </span>
            )}
            <span>{strings.aboutlocation}</span>
          </div>
          <div className={`${block}__contact-item`}>
            {showIcons && (
              <span className={`${block}__icon`} aria-hidden="true">
                ☎
              </span>
            )}
            <span>{phone}</span>
          </div>
          <div className={`${block}__contact-item`}>
            {showIcons && (
              <span className={`${block}__icon`} aria-hidden="true">
                ✉
              </span>
            )}
            <a href={`mailto:${site.coursesContactEmail}`}>{site.coursesContactEmail}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
