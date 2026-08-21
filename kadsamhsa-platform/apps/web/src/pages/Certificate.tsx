import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LearnerCertificate } from '@kadsamhsa/domain';
import { api } from '../data/api';
import { routes, site } from '../data/site';

/**
 * The learner's issued certificate (wireframe screen 8).
 *
 * Printing is the download path for now: `window.print()` against a print
 * stylesheet produces a real PDF through the browser's own dialog, on every
 * platform, with no server-side renderer. A worker-generated PDF is still the
 * target (PRD F6 wants one emailed on issue) — this is what makes the
 * certificate usable today rather than blocking on that.
 */
export function Certificate() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState<LearnerCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!certificateId) {
      setLoading(false);
      return;
    }
    let active = true;
    api
      .myCertificate(certificateId)
      .then((result) => {
        if (active) {
          setCertificate(result);
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
  }, [certificateId]);

  if (loading) {
    return (
      <section className="kadsamhsa-container">
        <p className="kadsamhsa-lead">Loading your certificate…</p>
      </section>
    );
  }

  if (!certificate) {
    return (
      <section className="kadsamhsa-container">
        <h1>Certificate not found</h1>
        <p className="kadsamhsa-lead">
          <Link to={routes.dashboard}>Back to your dashboard</Link>
        </p>
      </section>
    );
  }

  const verifyUrl = `${window.location.origin}${routes.verify}?id=${certificate.verificationId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be denied; the link is on screen either way.
      setCopied(false);
    }
  };

  return (
    <section className="kadsamhsa-cert">
      <div className="kadsamhsa-container">
        {certificate.status === 'revoked' && (
          <p className="kadsamhsa-cert__revoked" role="alert">
            This certificate has been revoked by KADSAMHSA. Public verification will report it
            as revoked.
          </p>
        )}

        <article
          className="kadsamhsa-cert__sheet"
          style={
            certificate.backgroundUrl
              ? { backgroundImage: `url(${CSS.escape(certificate.backgroundUrl)})` }
              : undefined
          }
        >
          <img
            src={certificate.logoUrl ?? site.logoUrl}
            alt=""
            className="kadsamhsa-cert__logo"
            width={120}
            height={90}
          />
          <h1 className="kadsamhsa-cert__title">{certificate.title}</h1>
          <p className="kadsamhsa-cert__body">{certificate.body}</p>
          <p className="kadsamhsa-cert__name">{certificate.learnerName}</p>
          <p className="kadsamhsa-cert__course">{certificate.courseTitle}</p>

          {certificate.signatories.length > 0 && (
            <div className="kadsamhsa-cert__signatories">
              {certificate.signatories.map((signatory) => (
                <div key={signatory.name} className="kadsamhsa-cert__signatory">
                  <span className="kadsamhsa-cert__sig-line" aria-hidden="true" />
                  <strong>{signatory.name}</strong>
                  <span>{signatory.title}</span>
                </div>
              ))}
            </div>
          )}

          <p className="kadsamhsa-cert__meta">
            ID: {certificate.verificationId} · Issued{' '}
            {new Date(certificate.issuedAt).toLocaleDateString('en-NG')}
            {certificate.scorePercent !== null && ` · Score ${certificate.scorePercent}%`}
          </p>
          <p className="kadsamhsa-cert__verify">Verify at {verifyUrl}</p>
        </article>

        <div className="kadsamhsa-cert__actions">
          <button
            type="button"
            className="kadsamhsa-btn kadsamhsa-btn--pill"
            onClick={() => window.print()}
          >
            Download PDF
          </button>
          <button type="button" className="kadsamhsa-btn kadsamhsa-btn--pill" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy verification link'}
          </button>
          <Link to={routes.dashboard} className="kadsamhsa-cert__back">
            Back to dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
