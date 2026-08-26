import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AdminEnrolledLearner } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import {
  AdminPage,
  ProgressMeter,
  StatusPill,
  adminPaths,
  errorMessage,
  formatDate,
} from './AdminLayout';

/**
 * The learner roster for one course (PRD A6) — who is on it, how far they have
 * got, and whether a certificate was issued.
 */
export function AdminLearners() {
  const { courseId = '' } = useParams();
  const [learners, setLearners] = useState<AdminEnrolledLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('That course link is incomplete.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .adminEnrolledLearners(courseId)
      .then((result) => {
        if (active) {
          setLearners(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setLearners([]);
          setError(errorMessage(caught, 'Could not load the learner list.'));
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
  }, [courseId]);

  const completed = learners.filter((learner) => learner.status === 'completed').length;

  return (
    <AdminPage
      title="Learners"
      subtitle={
        loading || error
          ? undefined
          : `${learners.length} enrolled · ${completed} completed`
      }
      actions={
        courseId ? (
          <Link
            to={adminPaths.course(courseId)}
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost"
          >
            Back to builder
          </Link>
        ) : (
          <Link
            to={adminPaths.courses}
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost"
          >
            Back to courses
          </Link>
        )
      }
    >
      {loading && <p className="kadsamhsa-admin__state">Loading learners…</p>}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && learners.length === 0 && (
        <p className="kadsamhsa-admin__state">Nobody has enrolled on this course yet.</p>
      )}

      {!loading && !error && learners.length > 0 && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__tablewrap">
            <table className="kadsamhsa-admin__table">
              <caption className="sr-only">Learners enrolled on this course</caption>
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Email</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Final score
                  </th>
                  <th scope="col">Certificate</th>
                  <th scope="col">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner) => (
                  <tr key={learner.enrolmentId}>
                    <td>{learner.fullName}</td>
                    <td>
                      <span className="kadsamhsa-admin__wrap">{learner.email}</span>
                    </td>
                    <td>
                      <ProgressMeter percent={learner.progressPercent} />
                      <span className="kadsamhsa-admin__subtle">
                        {learner.lessonsCompleted} of {learner.lessonsTotal} lessons
                      </span>
                    </td>
                    <td>
                      <StatusPill status={learner.status} />
                    </td>
                    <td className="kadsamhsa-admin__num">
                      {learner.finalScorePercent === null ? '—' : `${learner.finalScorePercent}%`}
                    </td>
                    <td>
                      {learner.certificateVerificationId ? (
                        <code className="kadsamhsa-admin__code">
                          {learner.certificateVerificationId}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{formatDate(learner.enrolledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AdminPage>
  );
}
