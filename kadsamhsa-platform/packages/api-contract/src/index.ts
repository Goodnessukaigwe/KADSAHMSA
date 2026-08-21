import type {
  AdminCourseDetail,
  AdminCourseSummary,
  AdminEnrolledLearner,
  AdminOffer,
  AdminOverview,
  AdminPayment,
  AdminCertificate,
  AdminQuiz,
  AdminUserDetail,
  AdminUserSummary,
  ApiErrorBody,
  AuthSession,
  CertificateVerification,
  CourseDetail,
  CourseSummary,
  Enrolment,
  ErrorCode,
  LearnerCertificate,
  LearnerDashboard,
  LessonProgressInput,
  LoginInput,
  Paginated,
  PublicUser,
  QuizAttempt,
  QuizAttemptResult,
  QuizResponse,
  QuizStatus,
  RegisterInput,
  CertificateTemplate,
  PlayerLessonContent,
  PlayerOutline,
  SchoolSettings,
} from '@kadsamhsa/domain';

export interface ClientOptions {
  baseUrl: string;
  /**
   * Called when a request fails with 401 after a refresh attempt, so the app
   * can clear its session state.
   */
  onUnauthenticated?: () => void;
}

export class ApiClientError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, body: ApiErrorBody | undefined) {
    super(body?.error?.message ?? 'Request failed');
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body?.error?.code ?? 'internal_error';
    this.fields = body?.error?.fields;
  }
}

/**
 * The only way `apps/web` talks to the API.
 *
 * The access token is held in memory, never in localStorage — a token in
 * localStorage is readable by any injected script. The refresh token lives in
 * an HTTP-only cookie the client cannot read, which is why every request sends
 * credentials. A 401 triggers one refresh-and-retry before giving up.
 */
export class ApiClient {
  private accessToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  /**
   * Bumped on sign-out. A refresh that was already in flight resolves after the
   * token has been cleared; without this it would quietly re-authenticate the
   * client the user just signed out.
   */
  private authGeneration = 0;

  constructor(private readonly options: ClientOptions) {}

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    retryOn401 = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && retryOn401) {
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.request<T>(path, init, false);
      }
      this.accessToken = null;
      this.options.onUnauthenticated?.();
    }

    if (!response.ok) {
      let body: ApiErrorBody | undefined;
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = undefined;
      }
      throw new ApiClientError(response.status, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /** Concurrent 401s share one refresh so the token rotates exactly once. */
  private refresh(): Promise<boolean> {
    const generation = this.authGeneration;
    this.refreshInFlight ??= (async () => {
      try {
        const response = await fetch(`${this.options.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          return false;
        }
        const session = (await response.json()) as AuthSession;
        // A sign-out landed while this was in flight — discard the new token.
        if (generation !== this.authGeneration) {
          return false;
        }
        this.accessToken = session.accessToken;
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  // ---- Public ----

  courses(query: {
    search?: string;
    priceType?: 'free' | 'paid';
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Paginated<CourseSummary>> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.request<Paginated<CourseSummary>>(`/courses${qs ? `?${qs}` : ''}`);
  }

  course(slug: string): Promise<CourseDetail> {
    return this.request<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);
  }

  verifyCertificate(verificationId: string): Promise<CertificateVerification> {
    return this.request<CertificateVerification>(
      `/certificate-verifications/${encodeURIComponent(verificationId)}`,
    );
  }

  // ---- Identity ----

  register(input: RegisterInput): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  login(input: LoginInput): Promise<AuthSession> {
    return this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Revokes the session server-side and drops the in-memory token.
   *
   * The token is cleared even if the request fails: a sign-out that leaves a
   * usable token behind because the network blipped is worse than one that
   * leaves a stale row in `sessions` for the server to expire. Callers are told
   * whether the server actually confirmed it.
   */
  async logout(): Promise<{ serverConfirmed: boolean }> {
    // Invalidate any refresh already in flight before the request goes out.
    this.authGeneration += 1;
    this.refreshInFlight = null;
    this.accessToken = null;
    try {
      await this.request<void>('/auth/logout', { method: 'POST' }, false);
      return { serverConfirmed: true };
    } catch {
      return { serverConfirmed: false };
    } finally {
      this.accessToken = null;
    }
  }

  me(): Promise<PublicUser> {
    return this.request<PublicUser>('/me');
  }

  /** Restores a session on page load from the refresh cookie alone. */
  async restoreSession(): Promise<PublicUser | null> {
    const refreshed = await this.refresh();
    if (!refreshed) {
      return null;
    }
    try {
      return await this.me();
    } catch {
      return null;
    }
  }

  // ---- Learning ----

  enrol(courseId: string): Promise<Enrolment> {
    return this.request<Enrolment>(`/courses/${encodeURIComponent(courseId)}/enrolments`, {
      method: 'POST',
    });
  }

  myEnrolments(): Promise<Enrolment[]> {
    return this.request<Enrolment[]>('/me/enrolments');
  }

  dashboard(): Promise<LearnerDashboard> {
    return this.request<LearnerDashboard>('/me/dashboard');
  }

  setPreference(key: 'dash_onboarding_dismissed', value: boolean): Promise<void> {
    return this.request<void>('/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    });
  }

  updateLessonProgress(lessonId: string, input: LessonProgressInput): Promise<Enrolment> {
    return this.request<Enrolment>(`/lessons/${encodeURIComponent(lessonId)}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // ---- Quizzes (learner) ----

  courseQuizzes(courseId: string): Promise<QuizStatus[]> {
    return this.request<QuizStatus[]>(`/courses/${encodeURIComponent(courseId)}/quizzes`);
  }

  startQuizAttempt(quizId: string): Promise<QuizAttempt> {
    return this.request<QuizAttempt>(`/quizzes/${encodeURIComponent(quizId)}/attempts`, {
      method: 'POST',
    });
  }

  submitQuizAttempt(attemptId: string, responses: QuizResponse[]): Promise<QuizAttemptResult> {
    return this.request<QuizAttemptResult>(
      `/quiz-attempts/${encodeURIComponent(attemptId)}/submit`,
      { method: 'POST', body: JSON.stringify({ responses }) },
    );
  }

  // ---- Admin ----

  adminOverview(): Promise<AdminOverview> {
    return this.request<AdminOverview>('/admin/overview');
  }

  adminCourses(): Promise<AdminCourseSummary[]> {
    return this.request<AdminCourseSummary[]>('/admin/courses');
  }

  adminCourse(courseId: string): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>(`/admin/courses/${encodeURIComponent(courseId)}`);
  }

  adminCreateCourse(input: { title: string; summary?: string }): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  adminUpdateCourse(
    courseId: string,
    input: Record<string, unknown>,
  ): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>(`/admin/courses/${encodeURIComponent(courseId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  adminSetCourseStatus(courseId: string, status: 'draft' | 'published' | 'archived') {
    return this.request<AdminCourseDetail>(
      `/admin/courses/${encodeURIComponent(courseId)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  }

  adminCreateModule(courseId: string, title: string): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>(
      `/admin/courses/${encodeURIComponent(courseId)}/modules`,
      { method: 'POST', body: JSON.stringify({ title }) },
    );
  }

  adminCreateLesson(moduleId: string, title: string): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>(
      `/admin/modules/${encodeURIComponent(moduleId)}/lessons`,
      { method: 'POST', body: JSON.stringify({ title }) },
    );
  }

  adminCreateBlock(
    lessonId: string,
    input: { type: string; payload: Record<string, unknown> },
  ): Promise<AdminCourseDetail> {
    return this.request<AdminCourseDetail>(
      `/admin/lessons/${encodeURIComponent(lessonId)}/blocks`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  adminDeleteBlock(blockId: string): Promise<void> {
    return this.request<void>(`/admin/blocks/${encodeURIComponent(blockId)}`, {
      method: 'DELETE',
    });
  }

  adminEnrolledLearners(courseId: string): Promise<AdminEnrolledLearner[]> {
    return this.request<AdminEnrolledLearner[]>(
      `/admin/courses/${encodeURIComponent(courseId)}/learners`,
    );
  }

  adminQuizzes(courseId: string): Promise<AdminQuiz[]> {
    return this.request<AdminQuiz[]>(`/admin/courses/${encodeURIComponent(courseId)}/quizzes`);
  }

  adminCreateQuiz(courseId: string, input: Record<string, unknown>): Promise<AdminQuiz> {
    return this.request<AdminQuiz>(`/admin/courses/${encodeURIComponent(courseId)}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  adminUpdateQuiz(quizId: string, input: Record<string, unknown>): Promise<AdminQuiz> {
    return this.request<AdminQuiz>(`/admin/quizzes/${encodeURIComponent(quizId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  adminAddQuestion(quizId: string, input: Record<string, unknown>): Promise<AdminQuiz> {
    return this.request<AdminQuiz>(`/admin/quizzes/${encodeURIComponent(quizId)}/questions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  adminDeleteQuestion(questionId: string): Promise<void> {
    return this.request<void>(`/admin/questions/${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
    });
  }

  adminOffers(): Promise<AdminOffer[]> {
    return this.request<AdminOffer[]>('/admin/offers');
  }

  adminSaveOffer(input: Record<string, unknown>, offerId?: string): Promise<AdminOffer> {
    return offerId
      ? this.request<AdminOffer>(`/admin/offers/${encodeURIComponent(offerId)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
      : this.request<AdminOffer>('/admin/offers', {
          method: 'POST',
          body: JSON.stringify(input),
        });
  }

  adminPayments(): Promise<AdminPayment[]> {
    return this.request<AdminPayment[]>('/admin/payments');
  }

  // ---- Course player (learner) ----

  playerOutline(slug: string): Promise<PlayerOutline> {
    return this.request<PlayerOutline>(`/me/courses/${encodeURIComponent(slug)}/player`);
  }

  myCertificate(certificateId: string): Promise<LearnerCertificate> {
    return this.request<LearnerCertificate>(
      `/me/certificates/${encodeURIComponent(certificateId)}`,
    );
  }

  playerLesson(lessonId: string): Promise<PlayerLessonContent> {
    return this.request<PlayerLessonContent>(`/me/lessons/${encodeURIComponent(lessonId)}`);
  }

  // ---- Admin: users & CRM ----

  adminUsers(search?: string): Promise<AdminUserSummary[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<AdminUserSummary[]>(`/admin/users${qs}`);
  }

  adminUser(userId: string): Promise<AdminUserDetail> {
    return this.request<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`);
  }

  adminSetUserRoles(userId: string, roles: string[]): Promise<AdminUserDetail> {
    return this.request<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  }

  adminSetUserStatus(userId: string, status: 'active' | 'suspended'): Promise<AdminUserDetail> {
    return this.request<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ---- Admin: certificates ----

  adminCertificates(): Promise<AdminCertificate[]> {
    return this.request<AdminCertificate[]>('/admin/certificates');
  }

  adminRevokeCertificate(certificateId: string, reason: string): Promise<AdminCertificate> {
    return this.request<AdminCertificate>(
      `/admin/certificates/${encodeURIComponent(certificateId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    );
  }

  adminReinstateCertificate(certificateId: string): Promise<AdminCertificate> {
    return this.request<AdminCertificate>(
      `/admin/certificates/${encodeURIComponent(certificateId)}/reinstate`,
      { method: 'POST' },
    );
  }

  adminCertificateTemplate(courseId: string): Promise<CertificateTemplate> {
    return this.request<CertificateTemplate>(
      `/admin/courses/${encodeURIComponent(courseId)}/certificate-template`,
    );
  }

  adminSaveCertificateTemplate(
    courseId: string,
    input: Partial<CertificateTemplate>,
  ): Promise<CertificateTemplate> {
    return this.request<CertificateTemplate>(
      `/admin/courses/${encodeURIComponent(courseId)}/certificate-template`,
      { method: 'PUT', body: JSON.stringify(input) },
    );
  }

  // ---- Admin: school settings ----

  adminSettings(): Promise<SchoolSettings> {
    return this.request<SchoolSettings>('/admin/settings');
  }

  adminSaveSettings(input: Partial<SchoolSettings>): Promise<SchoolSettings> {
    return this.request<SchoolSettings>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }
}

export type {
  AuthSession,
  CertificateVerification,
  CourseDetail,
  CourseSummary,
  Enrolment,
  LearnerDashboard,
  Paginated,
  PublicUser,
};
