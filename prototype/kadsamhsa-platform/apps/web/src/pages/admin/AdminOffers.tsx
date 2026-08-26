import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminCourseSummary, AdminOffer } from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { AdminPage, StatusPill, errorMessage, formatMoney } from './AdminLayout';

const OFFER_STATUSES: AdminOffer['status'][] = ['draft', 'active', 'archived'];

interface OfferForm {
  name: string;
  description: string;
  priceNaira: string;
  status: AdminOffer['status'];
  seatCount: string;
  courseIds: string[];
}

const EMPTY_FORM: OfferForm = {
  name: '',
  description: '',
  priceNaira: '',
  status: 'draft',
  seatCount: '',
  courseIds: [],
};

function toForm(offer: AdminOffer): OfferForm {
  return {
    name: offer.name,
    description: offer.description,
    // Kobo on the wire, Naira in the field.
    priceNaira: String(offer.priceAmount / 100),
    status: offer.status,
    seatCount: offer.seatCount === null ? '' : String(offer.seatCount),
    courseIds: [...offer.courseIds],
  };
}

/**
 * Offers (PRD A5). Pricing lives here rather than on the course, so the same
 * course can be sold on its own, in a bundle, or as a seat pack for an
 * organisation without its content changing.
 */
export function AdminOffers() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.adminOffers(), api.adminCourses()])
      .then(([offerList, courseList]) => {
        if (active) {
          setOffers(offerList);
          setCourses(courseList);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setOffers([]);
          setCourses([]);
          setError(errorMessage(caught, 'Could not load offers.'));
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

  const courseTitles = new Map(courses.map((course) => [course.id, course.title]));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const openEdit = (offer: AdminOffer) => {
    setEditing(offer);
    setForm(toForm(offer));
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const toggleCourse = (courseId: string) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form.courseIds.length === 0) {
      setFormError('Select at least one course for this offer.');
      return;
    }
    const naira = Number.parseFloat(form.priceNaira);
    const seats = form.seatCount.trim();

    setSaving(true);
    setFormError(null);
    try {
      const saved = await api.adminSaveOffer(
        {
          name: form.name.trim(),
          description: form.description.trim(),
          // Naira to kobo, rounded — the ledger is integer minor units.
          priceAmount: Math.round((Number.isFinite(naira) ? naira : 0) * 100),
          currency: 'NGN',
          status: form.status,
          seatCount: seats === '' ? null : Number.parseInt(seats, 10),
          courseIds: form.courseIds,
        },
        editing?.id,
      );

      setOffers((current) =>
        current.some((offer) => offer.id === saved.id)
          ? current.map((offer) => (offer.id === saved.id ? saved : offer))
          : [saved, ...current],
      );
      setNotice(editing ? 'Offer updated.' : 'Offer created.');
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (caught) {
      setFormError(errorMessage(caught, 'Could not save the offer.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Offers"
      subtitle="What a learner or organisation actually buys."
      actions={
        <button
          type="button"
          className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
          onClick={formOpen && !editing ? () => setFormOpen(false) : openCreate}
          aria-expanded={formOpen}
        >
          {formOpen && !editing ? 'Cancel' : 'New offer'}
        </button>
      }
    >
      {notice && (
        <p className="kadsamhsa-admin__notice" role="status">
          {notice}
        </p>
      )}

      {formOpen && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__panel-head">
            <h2 className="kadsamhsa-admin__panel-title">
              {editing ? `Edit “${editing.name}”` : 'New offer'}
            </h2>
          </div>

          <form className="kadsamhsa-admin__form" onSubmit={save}>
            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-offer-name">
                Name
              </label>
              <input
                id="kadsamhsa-admin-offer-name"
                className="kadsamhsa-admin__input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-offer-desc">
                Description
              </label>
              <textarea
                id="kadsamhsa-admin-offer-desc"
                className="kadsamhsa-admin__textarea"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="kadsamhsa-admin__grid2">
              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-offer-price">
                  Price (₦)
                </label>
                <input
                  id="kadsamhsa-admin-offer-price"
                  className="kadsamhsa-admin__input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.priceNaira}
                  onChange={(event) => setForm({ ...form, priceNaira: event.target.value })}
                />
                <p className="kadsamhsa-admin__hint">Stored in kobo. Zero is a free offer.</p>
              </div>

              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-offer-status">
                  Status
                </label>
                <select
                  id="kadsamhsa-admin-offer-status"
                  className="kadsamhsa-admin__select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as AdminOffer['status'] })
                  }
                >
                  {OFFER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-offer-seats">
                  Seats
                </label>
                <input
                  id="kadsamhsa-admin-offer-seats"
                  className="kadsamhsa-admin__input"
                  type="number"
                  min={1}
                  value={form.seatCount}
                  onChange={(event) => setForm({ ...form, seatCount: event.target.value })}
                />
                <p className="kadsamhsa-admin__hint">Leave blank for a single-learner offer.</p>
              </div>
            </div>

            <fieldset className="kadsamhsa-admin__fieldset">
              <legend className="kadsamhsa-admin__label">Courses in this offer</legend>
              {courses.length === 0 ? (
                <p className="kadsamhsa-admin__state kadsamhsa-admin__state--tight">
                  No courses available to package yet.
                </p>
              ) : (
                <div className="kadsamhsa-admin__checks">
                  {courses.map((course) => (
                    <label key={course.id} className="kadsamhsa-admin__check">
                      <input
                        type="checkbox"
                        checked={form.courseIds.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                      />
                      <span>
                        {course.title}
                        <span className="kadsamhsa-admin__subtle"> · {course.status}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            {formError && (
              <p className="kadsamhsa-admin__error" role="alert">
                {formError}
              </p>
            )}

            <div className="kadsamhsa-admin__formactions">
              <button
                type="submit"
                className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save offer' : 'Create offer'}
              </button>
              <button
                type="button"
                className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {loading && <p className="kadsamhsa-admin__state">Loading offers…</p>}

      {!loading && error && (
        <p className="kadsamhsa-admin__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && offers.length === 0 && (
        <p className="kadsamhsa-admin__state">
          No offers yet. Create one to start selling a course.
        </p>
      )}

      {!loading && !error && offers.length > 0 && (
        <section className="kadsamhsa-admin__panel">
          <div className="kadsamhsa-admin__tablewrap">
            <table className="kadsamhsa-admin__table">
              <caption className="sr-only">Offers available on the platform</caption>
              <thead>
                <tr>
                  <th scope="col">Offer</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="kadsamhsa-admin__num">
                    Seats
                  </th>
                  <th scope="col">Courses</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <strong>{offer.name}</strong>
                      {offer.description && (
                        <span className="kadsamhsa-admin__subtle kadsamhsa-admin__wrap">
                          {offer.description}
                        </span>
                      )}
                    </td>
                    <td>{formatMoney(offer.priceAmount, offer.currency)}</td>
                    <td>
                      <StatusPill status={offer.status} />
                    </td>
                    <td className="kadsamhsa-admin__num">{offer.seatCount ?? '—'}</td>
                    <td>
                      <span className="kadsamhsa-admin__wrap">
                        {offer.courseIds
                          .map((id) => courseTitles.get(id) ?? 'Unknown course')
                          .join(', ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="kadsamhsa-admin__btn kadsamhsa-admin__btn--subtle"
                        onClick={() => openEdit(offer)}
                      >
                        Edit
                      </button>
                    </td>
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
