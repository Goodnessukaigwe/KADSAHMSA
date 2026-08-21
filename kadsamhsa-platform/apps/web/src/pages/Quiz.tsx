import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiClientError } from '@kadsamhsa/api-contract';
import type {
  QuizAttempt,
  QuizAttemptResult,
  QuizQuestion,
  QuizResponse,
} from '@kadsamhsa/domain';
import { api } from '../data/api';
import { routes } from '../data/site';
import { pluralise } from '../format';

/** Instruction under the prompt, so the control type is never a guessing game. */
const TYPE_HINTS: Record<QuizQuestion['type'], string> = {
  mcq: 'Select one answer.',
  true_false: 'Select one answer.',
  multi: 'Select all answers that apply.',
  matching: 'Choose the matching term for each item.',
};

function responseFor(responses: QuizResponse[], questionId: string): QuizResponse | undefined {
  return responses.find((response) => response.questionId === questionId);
}

function upsert(responses: QuizResponse[], next: QuizResponse): QuizResponse[] {
  const position = responses.findIndex((response) => response.questionId === next.questionId);
  if (position === -1) {
    return [...responses, next];
  }
  const copy = responses.slice();
  copy[position] = next;
  return copy;
}

/**
 * Matching only counts as answered once every term is paired — a half-finished
 * grid would otherwise show a tick in the strip and mislead the learner.
 */
function isAnswered(question: QuizQuestion, response: QuizResponse | undefined): boolean {
  if (!response) {
    return false;
  }
  if (question.type === 'matching') {
    return (response.pairs?.length ?? 0) === question.options.length;
  }
  return (response.optionIds?.length ?? 0) > 0;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Learner quiz player (PRD F5).
 *
 * One question at a time with a number strip for jumping about, because the
 * mobile-first audience cannot comfortably scroll a twenty-question form. The
 * attempt is started server-side on mount, so the question payload — which
 * carries no correctness flags — is only ever fetched for a real attempt.
 */
export function Quiz() {
  const { quizId } = useParams();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const aliveRef = useRef(true);
  // A second submit (impatient click, or the timer firing mid-request) must not
  // reach the server: the attempt is already spent by the first one.
  const inFlightRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (!quizId) {
      setError('That quiz link is incomplete.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setResponses([]);
    setIndex(0);
    inFlightRef.current = false;
    try {
      const started = await api.startQuizAttempt(quizId);
      if (!aliveRef.current) {
        return;
      }
      setAttempt(started);
    } catch (caught) {
      if (!aliveRef.current) {
        return;
      }
      setAttempt(null);
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Could not start this quiz. Try again.',
      );
    } finally {
      if (aliveRef.current) {
        setLoading(false);
      }
    }
  }, [quizId]);

  useEffect(() => {
    void start();
  }, [start]);

  const submitAttempt = useCallback(
    async (auto: boolean) => {
      if (!attempt || inFlightRef.current || result) {
        return;
      }
      inFlightRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const outcome = await api.submitQuizAttempt(attempt.id, responses);
        if (!aliveRef.current) {
          return;
        }
        setResult(outcome);
        setSecondsLeft(null);
      } catch (caught) {
        if (!aliveRef.current) {
          return;
        }
        // The attempt may or may not have landed, so never imply the answers
        // were discarded — tell them to reload and check.
        inFlightRef.current = false;
        setError(
          auto
            ? 'Time ran out but the attempt could not be sent. Reload to see whether it was recorded.'
            : caught instanceof ApiClientError
              ? caught.message
              : 'Could not submit your answers. Check your connection and try again.',
        );
      } finally {
        if (aliveRef.current) {
          setSubmitting(false);
        }
      }
    },
    [attempt, responses, result],
  );

  // The timer must reach the *current* submit closure without restarting the
  // interval on every keystroke, hence the ref hand-off.
  const submitRef = useRef<(auto: boolean) => Promise<void>>(async () => {});
  useEffect(() => {
    submitRef.current = submitAttempt;
  }, [submitAttempt]);

  useEffect(() => {
    const deadline = attempt?.expiresAt ? Date.parse(attempt.expiresAt) : Number.NaN;
    if (Number.isNaN(deadline) || result) {
      setSecondsLeft(null);
      return;
    }
    let timer = 0;
    // Recomputed from the wall clock rather than decremented, so a backgrounded
    // tab whose interval is throttled still enforces the real deadline.
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        void submitRef.current(true);
      }
    };
    tick();
    timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result]);

  const questions = attempt?.questions ?? [];
  const current = questions[index];

  const answeredCount = useMemo(
    () => questions.filter((question) => isAnswered(question, responseFor(responses, question.id)))
      .length,
    [questions, responses],
  );

  const optionLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const question of questions) {
      for (const option of question.options) {
        labels.set(option.id, option.label);
      }
    }
    return labels;
  }, [questions]);

  /**
   * Announced text is deliberately coarser than the digits on screen: a polite
   * live region that changed every second would talk over everything else.
   */
  const countdownAnnouncement = useMemo(() => {
    if (secondsLeft === null) {
      return '';
    }
    if (secondsLeft <= 10) {
      return `${secondsLeft} seconds remaining`;
    }
    if (secondsLeft <= 30) {
      return '30 seconds remaining';
    }
    const minutes = Math.ceil(secondsLeft / 60);
    return `${pluralise(minutes, 'minute')} remaining`;
  }, [secondsLeft]);

  const selectSingle = (questionId: string, optionId: string) => {
    setResponses((existing) => upsert(existing, { questionId, optionIds: [optionId] }));
  };

  const toggleMulti = (questionId: string, optionId: string) => {
    setResponses((existing) => {
      const chosen = responseFor(existing, questionId)?.optionIds ?? [];
      const next = chosen.includes(optionId)
        ? chosen.filter((id) => id !== optionId)
        : [...chosen, optionId];
      return upsert(existing, { questionId, optionIds: next });
    });
  };

  const setPair = (questionId: string, optionId: string, matchTarget: string) => {
    setResponses((existing) => {
      const pairs = (responseFor(existing, questionId)?.pairs ?? []).filter(
        (pair) => pair.optionId !== optionId,
      );
      // The blank placeholder clears the pairing rather than storing "".
      const next = matchTarget ? [...pairs, { optionId, matchTarget }] : pairs;
      return upsert(existing, { questionId, pairs: next });
    });
  };

  if (loading) {
    return (
      <section className="kadsamhsa-quiz">
        <div className="kadsamhsa-quiz__inner">
          <p className="kadsamhsa-quiz__state">Starting your attempt…</p>
        </div>
      </section>
    );
  }

  if (!attempt) {
    return (
      <section className="kadsamhsa-quiz">
        <div className="kadsamhsa-quiz__inner">
          <h1 className="kadsamhsa-quiz__title">Quiz unavailable</h1>
          <p className="kadsamhsa-quiz__state">{error ?? 'This quiz could not be opened.'}</p>
          <Link to={routes.dashboard} className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--primary">
            Back to my learning
          </Link>
        </div>
      </section>
    );
  }

  if (result) {
    const canRetry =
      !result.passed && (result.attemptsRemaining === null || result.attemptsRemaining > 0);

    return (
      <section className="kadsamhsa-quiz">
        <div className="kadsamhsa-quiz__inner">
          <p className="kadsamhsa-quiz__eyebrow">{attempt.quiz.title}</p>
          <h1 className="kadsamhsa-quiz__title">Your result</h1>

          {/* Pass and fail differ by wording first, colour second — the badge
              text carries the verdict on its own. */}
          <div
            className={`kadsamhsa-quiz__verdict ${result.passed ? 'is-passed' : 'is-failed'}`}
            role="status"
          >
            <p className="kadsamhsa-quiz__verdict-badge">
              <span aria-hidden="true">{result.passed ? '✓' : '✗'}</span>{' '}
              {result.passed ? 'Passed' : 'Not passed'}
            </p>
            <p className="kadsamhsa-quiz__verdict-score">{result.scorePercent}%</p>
            <p className="kadsamhsa-quiz__verdict-detail">
              {result.correctCount} of {result.totalCount} correct. Pass mark{' '}
              {result.passMarkPercent}%.
            </p>
            <p className="kadsamhsa-quiz__verdict-meta">
              {result.attemptsRemaining === null
                ? 'You may retake this quiz as often as you need.'
                : result.attemptsRemaining > 0
                  ? `${pluralise(result.attemptsRemaining, 'attempt')} remaining.`
                  : 'No attempts remaining.'}
            </p>
          </div>

          {result.certificateVerificationId && (
            <div className="kadsamhsa-quiz__certificate">
              <h2 className="kadsamhsa-quiz__certificate-title">
                <span aria-hidden="true">🎓</span> Certificate issued
              </h2>
              <p>
                You have completed the course. Keep this verification ID — anyone can use it to
                confirm your certificate is genuine.
              </p>
              <p className="kadsamhsa-quiz__certificate-id">{result.certificateVerificationId}</p>
              <Link
                to={routes.verify}
                className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--primary"
              >
                Verify this certificate
              </Link>
            </div>
          )}

          <h2 className="kadsamhsa-quiz__review-title">Question feedback</h2>
          <ol className="kadsamhsa-quiz__review">
            {result.questions.map((item, position) => {
              const correctLabels = item.correctOptionIds
                .map((optionId) => optionLabels.get(optionId))
                .filter((label): label is string => Boolean(label));

              return (
                <li
                  key={item.questionId}
                  className={`kadsamhsa-quiz__review-item ${
                    item.isCorrect ? 'is-correct' : 'is-incorrect'
                  }`}
                >
                  <p className="kadsamhsa-quiz__review-status">
                    <span aria-hidden="true">{item.isCorrect ? '✓' : '✗'}</span>{' '}
                    {item.isCorrect ? 'Correct' : 'Incorrect'}
                  </p>
                  <h3 className="kadsamhsa-quiz__review-prompt">
                    Question {position + 1}. {item.prompt}
                  </h3>
                  {item.feedback && (
                    <p className="kadsamhsa-quiz__review-feedback">{item.feedback}</p>
                  )}
                  {!item.isCorrect && correctLabels.length > 0 && (
                    <p className="kadsamhsa-quiz__review-answer">
                      Correct answer: {correctLabels.join(', ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {error && <p className="kadsamhsa-quiz__error">{error}</p>}

          <div className="kadsamhsa-quiz__results-actions">
            {canRetry && (
              <button
                type="button"
                className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--primary"
                onClick={() => void start()}
              >
                Retry quiz
              </button>
            )}
            <Link to={routes.dashboard} className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--ghost">
              Back to my learning
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="kadsamhsa-quiz">
        <div className="kadsamhsa-quiz__inner">
          <h1 className="kadsamhsa-quiz__title">{attempt.quiz.title}</h1>
          <p className="kadsamhsa-quiz__state">This quiz has no questions yet.</p>
          <Link to={routes.dashboard} className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--primary">
            Back to my learning
          </Link>
        </div>
      </section>
    );
  }

  const currentResponse = responseFor(responses, current.id);
  const chosenIds = currentResponse?.optionIds ?? [];
  // A matching question without served targets would render empty selects, so
  // fall back to the terms carried on the options themselves.
  const matchTargets =
    current.matchTargets ??
    current.options
      .map((option) => option.matchTarget)
      .filter((target): target is string => Boolean(target));
  const unanswered = questions.length - answeredCount;
  const isLast = index === questions.length - 1;

  return (
    <section className="kadsamhsa-quiz">
      <div className="kadsamhsa-quiz__inner">
        <p className="kadsamhsa-quiz__eyebrow">
          {attempt.quiz.kind === 'final' ? 'Final assessment' : 'Module quiz'} · Attempt{' '}
          {attempt.attemptNo}
        </p>
        <h1 className="kadsamhsa-quiz__title">{attempt.quiz.title}</h1>

        <div className="kadsamhsa-quiz__meta">
          <span className="kadsamhsa-quiz__meta-item">Pass mark {attempt.quiz.passMarkPercent}%</span>
          <span className="kadsamhsa-quiz__meta-item">
            {pluralise(questions.length, 'question')}
          </span>
          {secondsLeft !== null && (
            <span
              className={`kadsamhsa-quiz__countdown${secondsLeft <= 30 ? ' is-urgent' : ''}`}
            >
              <span className="kadsamhsa-quiz__countdown-label">Time left</span>
              <span className="kadsamhsa-quiz__countdown-value" aria-hidden="true">
                {formatClock(secondsLeft)}
              </span>
              <span className="kadsamhsa-quiz__countdown-live" aria-live="polite">
                {countdownAnnouncement}
              </span>
            </span>
          )}
        </div>

        <p className="kadsamhsa-quiz__progress">
          {answeredCount} of {questions.length} answered
        </p>

        <nav className="kadsamhsa-quiz__strip" aria-label="Questions in this quiz">
          {questions.map((question, position) => {
            const answered = isAnswered(question, responseFor(responses, question.id));
            return (
              <button
                key={question.id}
                type="button"
                className={`kadsamhsa-quiz__chip${position === index ? ' is-current' : ''}${
                  answered ? ' is-answered' : ''
                }`}
                aria-current={position === index ? 'true' : undefined}
                aria-label={`Question ${position + 1}, ${answered ? 'answered' : 'not answered'}`}
                onClick={() => setIndex(position)}
              >
                <span aria-hidden="true">{position + 1}</span>
                {answered && (
                  <span className="kadsamhsa-quiz__chip-mark" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="kadsamhsa-quiz__card">
          <fieldset className="kadsamhsa-quiz__fieldset">
            <legend className="kadsamhsa-quiz__legend">
              <span className="kadsamhsa-quiz__counter">
                Question {index + 1} of {questions.length}
              </span>
              <h2 className="kadsamhsa-quiz__prompt">{current.prompt}</h2>
              <span className="kadsamhsa-quiz__hint">{TYPE_HINTS[current.type]}</span>
            </legend>

            {current.type === 'matching' ? (
              <ol className="kadsamhsa-quiz__matches">
                {current.options.map((option) => {
                  const selectId = `kadsamhsa-quiz-match-${current.id}-${option.id}`;
                  const paired =
                    currentResponse?.pairs?.find((pair) => pair.optionId === option.id)
                      ?.matchTarget ?? '';
                  return (
                    <li key={option.id} className="kadsamhsa-quiz__match">
                      <label className="kadsamhsa-quiz__match-term" htmlFor={selectId}>
                        {option.label}
                      </label>
                      <select
                        id={selectId}
                        className="kadsamhsa-quiz__match-select"
                        value={paired}
                        onChange={(event) => setPair(current.id, option.id, event.target.value)}
                      >
                        <option value="">Choose a match…</option>
                        {matchTargets.map((target) => (
                          <option key={target} value={target}>
                            {target}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="kadsamhsa-quiz__options">
                {current.options.map((option) => {
                  const selected = chosenIds.includes(option.id);
                  const multi = current.type === 'multi';
                  return (
                    <label
                      key={option.id}
                      className={`kadsamhsa-quiz__option${selected ? ' is-selected' : ''}`}
                    >
                      <input
                        type={multi ? 'checkbox' : 'radio'}
                        name={`kadsamhsa-quiz-${current.id}`}
                        value={option.id}
                        checked={selected}
                        onChange={() =>
                          multi
                            ? toggleMulti(current.id, option.id)
                            : selectSingle(current.id, option.id)
                        }
                      />
                      <span className="kadsamhsa-quiz__option-label">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        </div>

        {error && <p className="kadsamhsa-quiz__error">{error}</p>}

        <div className="kadsamhsa-quiz__actions">
          <button
            type="button"
            className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--ghost"
            onClick={() => setIndex((position) => Math.max(0, position - 1))}
            disabled={index === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--ghost"
            onClick={() => setIndex((position) => Math.min(questions.length - 1, position + 1))}
            disabled={isLast}
          >
            Next
          </button>
          <button
            type="button"
            className="kadsamhsa-quiz__btn kadsamhsa-quiz__btn--primary kadsamhsa-quiz__btn--submit"
            onClick={() => void submitAttempt(false)}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        </div>

        {unanswered > 0 && (
          <p className="kadsamhsa-quiz__actions-note">
            {pluralise(unanswered, 'question')} still unanswered. Unanswered questions are marked
            wrong.
          </p>
        )}
      </div>
    </section>
  );
}
