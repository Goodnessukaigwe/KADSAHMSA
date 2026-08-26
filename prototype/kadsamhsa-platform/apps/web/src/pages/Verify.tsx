import { useState } from 'react';
import type { CertificateVerification } from '@kadsamhsa/domain';
import { api } from '../data/api';

/**
 * Public certificate verification (PRD F7). No account needed — an employer
 * types the ID printed on a certificate and gets back validity plus the three
 * fields §7.3 permits.
 */
export function Verify() {
  const [verificationId, setVerificationId] = useState('');
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setResult(null);
    try {
      setResult(await api.verifyCertificate(verificationId));
    } catch {
      setResult({
        verificationId,
        status: 'not_found',
        learnerName: null,
        courseTitle: null,
        issuedAt: null,
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="kadsamhsa-verify">
      <div className="kadsamhsa-container kadsamhsa-container--narrow">
        <h1>Verify a certificate</h1>
        <p className="kadsamhsa-lead">
          Enter the certificate ID printed on the document to confirm it was issued by KADSAMHSA.
        </p>

        <form className="kadsamhsa-form" onSubmit={submit}>
          <label className="kadsamhsa-form__field">
            <span>Certificate ID</span>
            <input
              type="text"
              value={verificationId}
              onChange={(event) => setVerificationId(event.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              required
            />
          </label>
          <button type="submit" className="kadsamhsa-btn kadsamhsa-btn--pill" disabled={checking}>
            {checking ? 'Checking…' : 'Verify'}
          </button>
        </form>

        {result && (
          <div className={`kadsamhsa-verify__result is-${result.status}`} role="status">
            {result.status === 'valid' && (
              <>
                <h2>Valid certificate</h2>
                <p>
                  <strong>{result.learnerName}</strong> completed{' '}
                  <strong>{result.courseTitle}</strong> on{' '}
                  {result.issuedAt && new Date(result.issuedAt).toLocaleDateString()}.
                </p>
              </>
            )}
            {result.status === 'revoked' && (
              <>
                <h2>Revoked certificate</h2>
                <p>
                  This certificate was issued to {result.learnerName} for {result.courseTitle} but
                  has since been revoked by KADSAMHSA.
                </p>
              </>
            )}
            {result.status === 'not_found' && (
              <>
                <h2>No matching certificate</h2>
                <p>Check the ID and try again.</p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
