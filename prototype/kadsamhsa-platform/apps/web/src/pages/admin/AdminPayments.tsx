import { useEffect, useState } from 'react';
import type { AdminPayment } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { AdminPage, StatusPill, errorMessage, formatDate, formatMoney } from './AdminLayout';

/**
 * Payment reconciliation (PRD A8) — one row per order, showing what was ordered
 * against what actually settled. An order with no payment row yet is a started
 * checkout, which is why the payment status can be blank.
 */
export function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .adminPayments()
      .then((result) => {
        if (active) {
          setPayments(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setPayments([]);
          setError(errorMessage(caught, 'Could not load payments.'));
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
  }, []);

  const settled = payments.filter((payment) => payment.orderStatus === 'paid');
  // Only paid orders are summed: pending and failed orders are not money.
  const settledTotal = settled.reduce((total, payment) => total + payment.amount, 0);
  const currency = settled[0]?.currency ?? payments[0]?.currency ?? 'NGN';

  return (
    <AdminPage
      title="Payments"
      subtitle={
        loading || error
          ? undefined
          : `${payments.length} orders · ${settled.length} paid · ${formatMoney(
              settledTotal,
              currency,
            )} settled`
      }
    >
      {loading && <p className="kadsamhsa-admin__state">Loading payments…</p>}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && payments.length === 0 && (
        <p className="kadsamhsa-admin__state">No orders have been placed yet.</p>
      )}

      {!loading && !error && payments.length > 0 && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__tablewrap">
            <table className="kadsamhsa-admin__table">
              <caption className="sr-only">Orders and their payment status</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Learner</th>
                  <th scope="col">Offer</th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Amount
                  </th>
                  <th scope="col">Order</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.orderId}>
                    <td>
                      <code className="kadsamhsa-admin__code">{payment.reference}</code>
                    </td>
                    <td>
                      {payment.learnerName}
                      <span className="kadsamhsa-admin__subtle kadsamhsa-admin__wrap">
                        {payment.learnerEmail}
                      </span>
                    </td>
                    <td>
                      <span className="kadsamhsa-admin__wrap">{payment.offerName}</span>
                    </td>
                    <td className="kadsamhsa-admin__num">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td>
                      <StatusPill status={payment.orderStatus} />
                    </td>
                    <td>
                      {payment.paymentStatus ? (
                        <StatusPill status={payment.paymentStatus} />
                      ) : (
                        <span className="kadsamhsa-admin__subtle">Not started</span>
                      )}
                    </td>
                    <td>{payment.channel ?? '—'}</td>
                    <td>{formatDate(payment.paidAt)}</td>
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
