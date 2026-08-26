/**
 * Async job runner: email delivery, certificate rendering, media processing and
 * report exports.
 *
 * Scaffolded, not implemented. The job contracts below are fixed now because
 * the API already needs to know what it will enqueue; the queue backend
 * (BullMQ over Redis) and the handlers land with M3/M4.
 */

export interface CertificateIssueJob {
  name: 'certificate.issue';
  data: {
    enrolmentId: string;
    /**
     * Idempotency key. Issuance must produce at most one certificate per
     * enrolment even if the job is delivered twice — the unique constraint on
     * certificates.enrolment_id is the backstop.
     */
    requestId: string;
  };
}

export interface EmailSendJob {
  name: 'email.send';
  data: {
    to: string;
    template:
      | 'welcome'
      | 'enrolment_confirmed'
      | 'course_completed'
      | 'certificate_issued'
      | 'payment_receipt'
      | 'password_reset';
    variables: Record<string, string>;
  };
}

export interface ReportExportJob {
  name: 'report.export';
  data: {
    requestedBy: string;
    organisationId: string | null;
    report: 'completions' | 'enrolments' | 'quiz_performance' | 'revenue';
  };
}

export type Job = CertificateIssueJob | EmailSendJob | ReportExportJob;

async function main() {
  console.log('worker: no queues registered yet (M3/M4)');
  // Keeps the container alive so compose health checks and log tailing behave
  // the same as they will once handlers exist.
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
