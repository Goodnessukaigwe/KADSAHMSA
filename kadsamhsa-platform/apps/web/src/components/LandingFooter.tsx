import { Link } from 'react-router-dom';
import { strings } from '../content/strings';
import { routes, site } from '../data/site';

export function LandingFooter() {
  return (
    <footer id="page-footer" className="kadsamhsa-footer kadsamhsa-footer--landing">
      <div className="kadsamhsa-container">
        <div className="kadsamhsa-footer__bottom">
          <div>
            © {site.year} {site.name}. {strings.allrightsreserved}
          </div>
          <div className="kadsamhsa-footer__links">
            <Link to={routes.courses}>{strings.landingnavcourses}</Link>
            <Link to={routes.about}>{strings.landingnavabout}</Link>
            <Link to={routes.verify}>{strings.verifycert}</Link>
            <Link to={`${routes.home}#contact`}>{strings.landingnavcontact}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
