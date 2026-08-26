import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { RequirePermission } from './auth/RequirePermission';
import { LandingFooter } from './components/LandingFooter';
import { LandingNav } from './components/LandingNav';
import { strings } from './content/strings';
import { About } from './pages/About';
import { CourseDetail } from './pages/CourseDetail';
import { Courses } from './pages/Courses';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Verify } from './pages/Verify';
import { Certificate } from './pages/Certificate';
import { Quiz } from './pages/Quiz';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminCourses } from './pages/admin/AdminCourses';
import { AdminCourseBuilder } from './pages/admin/AdminCourseBuilder';
import { AdminLearners } from './pages/admin/AdminLearners';
import { AdminOffers } from './pages/admin/AdminOffers';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminNotBuilt } from './pages/admin/AdminNotBuilt';
import { useBodyClass } from './useBodyClass';

interface PageProps {
  bodyClass: string;
  title: string;
  children: ReactNode;
}

/** Sets the body class the theme SCSS keys off, plus the document title. */
function Page({ bodyClass, title, children }: PageProps) {
  useBodyClass(bodyClass);
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
}

/** Restores top-of-page on navigation, and honours #contact-style anchors. */
function ScrollBehaviour() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

/** Public pages: marketing header and footer around the route content. */
function MarketingLayout() {
  return (
    <div className="kadsamhsa-app">
      <a className="kadsamhsa-skip-link" href="#main">
        {strings.skiptomain}
      </a>
      <LandingNav />
      <main id="main" className="kadsamhsa-app__main">
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}

/**
 * Signed-in pages: no marketing chrome. The student home renders its own shell
 * (sidebar, top bar, brand) via StudentChrome, so wrapping it in the public
 * header would give the learner two navigations and two sign-out controls.
 */
function AppLayout() {
  return (
    <>
      <a className="kadsamhsa-skip-link" href="#kadsamhsa-shome-main">
        {strings.skiptomain}
      </a>
      <Outlet />
    </>
  );
}

export function App() {
  return (
    <>
      <ScrollBehaviour />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route
            path="/"
            element={
              <Page bodyClass="kadsamhsa-frontpage" title={`${strings.landingnavhome} | KADSAMHSA`}>
                <Landing />
              </Page>
            }
          />
          <Route
            path="/about"
            element={
              <Page bodyClass="kadsamhsa-about-page" title={`${strings.aboutpagetitle} | KADSAMHSA`}>
                <About />
              </Page>
            }
          />
          <Route
            path="/courses"
            element={
              <Page
                bodyClass="kadsamhsa-courses-page"
                title={`${strings.coursespagetitle} | KADSAMHSA`}
              >
                <Courses />
              </Page>
            }
          />
          <Route
            path="/courses/:slug"
            element={
              <Page
                bodyClass="kadsamhsa-coursedetail-page"
                title={`${strings.onlinecourse} | KADSAMHSA`}
              >
                <CourseDetail />
              </Page>
            }
          />
          <Route
            path="/login"
            element={
              <Page bodyClass="kadsamhsa-auth-page" title="Sign in | KADSAMHSA">
                <Login />
              </Page>
            }
          />
          <Route
            path="/register"
            element={
              <Page bodyClass="kadsamhsa-auth-page" title="Create account | KADSAMHSA">
                <Register />
              </Page>
            }
          />
          <Route
            path="/verify"
            element={
              <Page bodyClass="kadsamhsa-verify-page" title={`${strings.verifycert} | KADSAMHSA`}>
                <Verify />
              </Page>
            }
          />
        </Route>

        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <Page bodyClass="kadsamhsa-dashboard" title={`${strings.dashboard} | KADSAMHSA`}>
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              </Page>
            }
          />
          <Route
            path="/certificates/:certificateId"
            element={
              <Page bodyClass="kadsamhsa-certificate-page" title="Certificate | KADSAMHSA">
                <RequireAuth>
                  <Certificate />
                </RequireAuth>
              </Page>
            }
          />
          <Route
            path="/quizzes/:quizId"
            element={
              <Page bodyClass="kadsamhsa-quiz-page" title="Assessment | KADSAMHSA">
                <RequireAuth>
                  <Quiz />
                </RequireAuth>
              </Page>
            }
          />
        </Route>

        {/* Back office. The route guard mirrors the API's permission check;
            the API's is the one that actually protects the data. */}
        <Route
          path="/admin"
          element={
            <Page bodyClass="kadsamhsa-admin-page" title="Admin | KADSAMHSA">
              <RequirePermission permission="course:update">
                <AdminLayout />
              </RequirePermission>
            </Page>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/:courseId" element={<AdminCourseBuilder />} />
          <Route path="courses/:courseId/learners" element={<AdminLearners />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route
            path="users"
            element={
              <AdminNotBuilt
                title="Users & CRM"
                milestone="M4"
                scope={[
                  'Search and view every learner, with their enrolments and progress',
                  'Assign and revoke roles',
                  'Reset a learner\u2019s access',
                ]}
              />
            }
          />
          <Route
            path="organizations"
            element={
              <AdminNotBuilt
                title="Organizations"
                milestone="M5"
                scope={[
                  'Approve partner organisations',
                  'CSV staff import and invite codes',
                  'Seat allocation and per-organisation completion reports',
                ]}
              />
            }
          />
          <Route
            path="articles"
            element={
              <AdminNotBuilt
                title="Articles"
                milestone="M4"
                scope={['Standalone articles as a product type alongside courses']}
              />
            }
          />
          <Route
            path="marketing"
            element={
              <AdminNotBuilt
                title="Marketing"
                milestone="M4"
                scope={[
                  'Email templates and broadcasts to learner segments',
                  'Discount coupons',
                ]}
              />
            }
          />
          <Route
            path="certificates"
            element={
              <AdminNotBuilt
                title="Certificates"
                milestone="M3/M4"
                scope={[
                  'Per-course certificate template: logo, wording, signatories',
                  'Revoke an issued certificate',
                  'Issued-certificate register (exportable today via Completions CSV)',
                ]}
              />
            }
          />
          <Route
            path="settings"
            element={
              <AdminNotBuilt
                title="School settings"
                milestone="M4"
                scope={['Branding, contact details, custom domain, integrations']}
              />
            }
          />
        </Route>
      </Routes>
    </>
  );
}
