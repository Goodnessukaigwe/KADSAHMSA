import { Link } from 'react-router-dom';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';

interface PageFooterProps {
  /** Selects the `kadsamhsa-about-footer` or `kadsamhsa-courses-footer` block. */
  variant: 'about' | 'courses';
}

/** The link-column footer shared by the About and Courses templates. */
export function PageFooter({ variant }: PageFooterProps) {
  const block = `kadsamhsa-${variant}-footer`;

  return (
    <footer className={block}>
      <div className="kadsamhsa-container">
        <div className={`${block}__cols`}>
          <div>
            <h4>{strings.aboutfooterproduct}</h4>
            <ul>
              <li>
                <Link to={routes.courses}>{strings.catalogue}</Link>
              </li>
              <li>
                <Link to={routes.about}>{strings.landingnavabout}</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${block}__bottom`}>
          <span>
            © {site.year} {site.name}. {strings.allrightsreserved}
          </span>
        </div>
      </div>
    </footer>
  );
}
