<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA theme page helper — builds template context for Phase 1 UI shells.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Theme logo image URL (pix/kadsamhsa.svg).
 *
 * @return string
 */
function theme_kadsamhsa_get_logo_url(): string {
    global $OUTPUT;

    return $OUTPUT->image_url('kadsamhsa', 'theme_kadsamhsa')->out(false);
}

/**
 * Get body CSS classes for the current page.
 *
 * @return string[]
 */
function theme_kadsamhsa_get_body_classes(): array {
    global $PAGE;

    $classes = ['kadsamhsa-theme'];

    switch ($PAGE->pagelayout) {
        case 'frontpage':
            $classes[] = 'kadsamhsa-frontpage';
            break;
        case 'login':
            $classes[] = 'kadsamhsa-login';
            break;
        case 'mydashboard':
            $classes[] = 'kadsamhsa-dashboard';
            break;
        case 'incourse':
            $classes[] = 'kadsamhsa-player';
            break;
        case 'admin':
            $classes[] = 'kadsamhsa-admin';
            break;
        case 'course':
            $classes[] = 'kadsamhsa-course-detail';
            break;
    }

    if ($PAGE->pagetype === 'course-index') {
        $classes[] = 'kadsamhsa-catalogue';
    }

    if ($PAGE->pagetype === 'login-signup') {
        $classes[] = 'kadsamhsa-signup-page';
    }

    if ($PAGE->pagetype === 'login-index') {
        $classes[] = 'kadsamhsa-login-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-about') {
        $classes[] = 'kadsamhsa-about-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-courses') {
        $classes[] = 'kadsamhsa-courses-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-mycourses') {
        $classes[] = 'kadsamhsa-mycourses-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-course') {
        $classes[] = 'kadsamhsa-coursedetail-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-play') {
        $classes[] = 'kadsamhsa-play-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-quiz') {
        $classes[] = 'kadsamhsa-quiz-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-quizzes') {
        $classes[] = 'kadsamhsa-quizzes-page';
    }

    if ($PAGE->pagetype === 'theme-kadsamhsa-error404' || $PAGE->pagetype === 'error-index') {
        $classes[] = 'kadsamhsa-error404-page';
    }

    if (strpos($PAGE->pagetype, 'mod-quiz-') === 0) {
        $classes[] = 'kadsamhsa-quiz';
    }

    if (strpos($PAGE->pagetype, 'mod-customcert-') === 0) {
        $classes[] = 'kadsamhsa-certificates';
    }

    if (strpos($PAGE->url->get_path(), 'verify_certificate') !== false) {
        $classes[] = 'kadsamhsa-verify';
    }

    if ($PAGE->pagetype === 'course-view' && $PAGE->user_is_editing()) {
        $classes[] = 'kadsamhsa-course-edit';
    }

    return $classes;
}

/**
 * Marketing navbar context for auth pages.
 *
 * @param bool $issignup Whether the current page is signup.
 * @param bool $islogin Whether the current page is login.
 * @return array
 */
function theme_kadsamhsa_get_signup_nav_context(
    bool $issignup = false,
    bool $islogin = false,
    bool $isabout = false,
    bool $iscourses = false
): array {
    global $CFG;

    $wwwroot = $CFG->wwwroot;

    return [
        'homeurl' => $wwwroot . '/',
        'abouturl' => $wwwroot . '/theme/kadsamhsa/about.php',
        'coursesurl' => $wwwroot . '/theme/kadsamhsa/courses.php',
        'blogurl' => $wwwroot . '/#blog',
        'loginurl' => $wwwroot . '/login/index.php',
        'signupurl' => $wwwroot . '/login/signup.php',
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'homeactive' => !$issignup && !$islogin && !$isabout && !$iscourses,
        'aboutactive' => $isabout,
        'coursesactive' => $iscourses,
        'loginactive' => $islogin,
        'signupactive' => $issignup,
    ];
}

/**
 * 404 error page template context.
 *
 * @return array
 */
function theme_kadsamhsa_get_error404_context(): array {
    global $CFG;

    return [
        'homeurl' => $CFG->wwwroot . '/',
        'logourl' => theme_kadsamhsa_get_logo_url(),
    ];
}

/**
 * Courses catalogue page template context.
 *
 * @return array
 */
function theme_kadsamhsa_get_courses_page_context(): array {
    global $CFG, $DB, $SITE;

    $coursesurl = (new moodle_url('/theme/kadsamhsa/courses.php'))->out(false);
    $courses = [];

    $records = $DB->get_records_select(
        'course',
        'id > 1 AND visible = 1',
        null,
        'sortorder ASC, fullname ASC',
        'id, fullname, summary, summaryformat',
        0,
        12
    );

    $lessonlabels = ['3 lessons', '6 lessons', '12 lessons'];
    $i = 0;
    foreach ($records as $course) {
        $courseurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false);
        $courses[] = [
            'name' => format_string($course->fullname),
            'url' => $courseurl,
            'enrolurl' => $courseurl,
            'lessons' => $lessonlabels[$i % 3],
            'pricetype' => 'free',
            'badgelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'imageurl' => theme_kadsamhsa_get_course_image_url($course),
        ];
        $i++;
    }

    return [
        'sitename' => format_string($SITE->shortname, true, [
            'context' => context_course::instance(SITEID),
            'escape' => false,
        ]),
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'homeurl' => $CFG->wwwroot . '/',
        'abouturl' => (new moodle_url('/theme/kadsamhsa/about.php'))->out(false),
        'coursesurl' => $coursesurl,
        'catalogueurl' => $coursesurl,
        'verifyurl' => (new moodle_url('/mod/customcert/verify_certificate.php'))->out(false),
        'contactemail' => 'info@kadsamhsa.com',
        'year' => date('Y'),
        'courses' => $courses,
    ];
}

/**
 * About Us page template context.
 *
 * @return array
 */
function theme_kadsamhsa_get_about_context(): array {
    global $CFG, $SITE;

    return [
        'sitename' => format_string($SITE->shortname, true, [
            'context' => context_course::instance(SITEID),
            'escape' => false,
        ]),
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'homeurl' => $CFG->wwwroot . '/',
        'abouturl' => (new moodle_url('/theme/kadsamhsa/about.php'))->out(false),
        'catalogueurl' => (new moodle_url('/theme/kadsamhsa/courses.php'))->out(false),
        'verifyurl' => (new moodle_url('/mod/customcert/verify_certificate.php'))->out(false),
        'orgurl' => (new moodle_url('/theme/kadsamhsa/org_dashboard.php'))->out(false),
        'signupurl' => (new moodle_url('/login/signup.php'))->out(false),
        'contactemail' => 'info@kadsamhsa.com',
        'year' => date('Y'),
    ];
}

/**
 * Frontpage / landing page template context.
 *
 * @return array|null
 */
function theme_kadsamhsa_get_frontpage_hero_context(): ?array {
    global $CFG, $DB, $SITE;

    $catalogueurl = (new moodle_url('/theme/kadsamhsa/courses.php'))->out(false);
    $signupurl = (new moodle_url('/login/signup.php'))->out(false);
    $loginurl = (new moodle_url('/login/index.php'))->out(false);
    $dashboardurl = (new moodle_url('/my/'))->out(false);
    $orgurl = (new moodle_url('/theme/kadsamhsa/org_dashboard.php'))->out(false);

    $coursecount = (int) $DB->count_records_select('course', 'id > 1 AND visible = 1');
    $courses = [];

    $records = $DB->get_records_select(
        'course',
        'id > 1 AND visible = 1',
        null,
        'sortorder ASC, fullname ASC',
        'id, fullname, summary, summaryformat',
        0,
        3
    );

    foreach ($records as $course) {
        $context = context_course::instance($course->id);
        $summary = trim(strip_tags(format_text($course->summary, $course->summaryformat, ['context' => $context])));
        if (core_text::strlen($summary) > 120) {
            $summary = core_text::substr($summary, 0, 117) . '…';
        }
        if ($summary === '') {
            $summary = get_string('landingcoursedefaultsummary', 'theme_kadsamhsa');
        }
        $courses[] = [
            'name' => format_string($course->fullname),
            'summary' => $summary,
            'url' => (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false),
            'lessons' => get_string('landingcourselessons', 'theme_kadsamhsa'),
            'duration' => get_string('durationplaceholder', 'theme_kadsamhsa'),
            'rating' => get_string('landingcourserating', 'theme_kadsamhsa'),
            'imageurl' => theme_kadsamhsa_get_course_image_url($course),
        ];
    }

    $isloggedin = isloggedin() && !isguestuser();

    return [
        'sitename' => format_string($SITE->shortname, true, [
            'context' => context_course::instance(SITEID),
            'escape' => false,
        ]),
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'catalogueurl' => $catalogueurl,
        'signupurl' => $signupurl,
        'loginurl' => $loginurl,
        'dashboardurl' => $dashboardurl,
        'orgurl' => $orgurl,
        'getstartedurl' => $isloggedin ? $catalogueurl : $signupurl,
        'isloggedin' => $isloggedin,
        'isguest' => isguestuser() || !isloggedin(),
        'coursecount' => max($coursecount, 1),
        'courses' => $courses,
        'contactemail' => 'info@kadsamhsa.org',
        'abouturl' => (new moodle_url('/theme/kadsamhsa/about.php'))->out(false),
        'year' => date('Y'),
        'config' => [
            'wwwroot' => $CFG->wwwroot,
            'homeurl' => $CFG->wwwroot . '/',
        ],
    ];
}

/**
 * Catalogue page header context.
 *
 * @return array|null
 */
function theme_kadsamhsa_get_catalogue_header_context(): ?array {
    return [];
}

/**
 * Course detail hero context.
 *
 * @return array|null
 */
function theme_kadsamhsa_get_course_detail_context(): ?array {
    global $PAGE, $COURSE, $DB;

    if (empty($COURSE) || $COURSE->id <= SITEID) {
        return null;
    }

    $context = context_course::instance($COURSE->id);
    $summary = format_text($COURSE->summary, $COURSE->summaryformat, ['context' => $context]);

    $enrolurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $COURSE->id]))->out(false);
    $enrollabel = get_string('enrolme', 'core_enrol');

    $category = $DB->get_record('course_categories', ['id' => $COURSE->category]);

    return [
        'coursename' => format_string($COURSE->fullname),
        'summary' => $summary,
        'categoryname' => $category ? format_string($category->name) : '',
        'duration' => get_string('durationplaceholder', 'theme_kadsamhsa'),
        'enrolurl' => $enrolurl,
        'enrollabel' => $enrollabel,
        'courseimage' => theme_kadsamhsa_get_course_image_url($COURSE),
    ];
}

/**
 * Theme default course thumbnail (pix/Course.png).
 *
 * @return string
 */
function theme_kadsamhsa_get_default_course_image_url(): string {
    global $OUTPUT;

    return $OUTPUT->image_url('Course', 'theme_kadsamhsa')->out(false);
}

/**
 * Course overview image URL, or theme Course.png fallback.
 *
 * @param stdClass $course
 * @return string
 */
function theme_kadsamhsa_get_course_image_url(stdClass $course): string {
    global $CFG;

    require_once($CFG->dirroot . '/course/lib.php');

    $course = new core_course_list_element($course);
    foreach ($course->get_course_overviewfiles() as $file) {
        if ($file->is_valid_image()) {
            return moodle_url::make_pluginfile_url(
                $file->get_contextid(),
                $file->get_component(),
                $file->get_filearea(),
                null,
                $file->get_filepath(),
                $file->get_filename()
            )->out(false);
        }
    }
    return theme_kadsamhsa_get_default_course_image_url();
}

/**
 * Truncate plain-text course summary for cards.
 *
 * @param stdClass $course
 * @param int $maxlen
 * @param string $fallback
 * @return string
 */
function theme_kadsamhsa_course_summary_plain(stdClass $course, int $maxlen, string $fallback): string {
    $context = context_course::instance($course->id);
    $summary = trim(strip_tags(format_text($course->summary ?? '', $course->summaryformat ?? FORMAT_HTML, [
        'context' => $context,
    ])));
    if ($summary === '') {
        return $fallback;
    }
    if (core_text::strlen($summary) > $maxlen) {
        return core_text::substr($summary, 0, $maxlen - 1) . '…';
    }
    return $summary;
}

/**
 * Count visible course sections that look like modules (skip section 0).
 *
 * @param stdClass $course
 * @return int
 */
function theme_kadsamhsa_count_course_modules(stdClass $course): int {
    global $DB;

    $count = (int) $DB->count_records_select(
        'course_sections',
        'course = ? AND section > 0 AND visible = 1',
        [$course->id]
    );
    return max(1, $count);
}

/**
 * Build enrolled-course card data for the returning-student home.
 *
 * @param stdClass $course
 * @param int $userid
 * @param int $lastaccess
 * @return array
 */
function theme_kadsamhsa_enrolled_course_card(stdClass $course, int $userid, int $lastaccess = 0): array {
    global $CFG;

    require_once($CFG->libdir . '/completionlib.php');

    $progress = 0;
    $completion = new completion_info($course);
    if ($completion->is_enabled()) {
        $percentage = \core_completion\progress::get_course_progress_percentage($course, $userid);
        $progress = $percentage !== null ? (int) round($percentage) : 0;
    }

    $moduletotal = theme_kadsamhsa_count_course_modules($course);
    $modulecurrent = max(1, (int) ceil(($progress / 100) * $moduletotal));
    if ($progress >= 100) {
        $modulecurrent = $moduletotal;
    }

    $detailurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false);
    $delivery = theme_kadsamhsa_get_course_delivery_type($course);
    $continueurl = (new moodle_url('/theme/kadsamhsa/play.php', [
        'id' => $course->id,
        'mode' => $delivery === 'text' ? 'text' : 'video',
    ]))->out(false);

    return [
        'id' => (int) $course->id,
        'name' => format_string($course->fullname),
        'url' => $detailurl,
        'continueurl' => $continueurl,
        'progress' => $progress,
        'imageurl' => theme_kadsamhsa_get_course_image_url($course),
        'pricelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
        'moduleslabel' => get_string('dashmodulescount', 'theme_kadsamhsa', $moduletotal),
        'durationlabel' => get_string('dashdurationplaceholder', 'theme_kadsamhsa'),
        'moduleline' => get_string('dashmoduleline', 'theme_kadsamhsa', [
            'current' => $modulecurrent,
            'total' => $moduletotal,
        ]),
        'lastaccess' => $lastaccess,
    ];
}

/**
 * Learner dashboard (post-login student home) context — Figma shell.
 *
 * Two states:
 * - New learner: recommend DPTC + explore cards + onboarding modal
 * - Returning learner (has started courses): welcome back + continue hero + also-started + explore
 *
 * @return array
 */
function theme_kadsamhsa_get_dashboard_context(): array {
    global $USER, $DB, $CFG, $SITE;

    require_once($CFG->libdir . '/completionlib.php');

    $coursesurl = (new moodle_url('/theme/kadsamhsa/mycourses.php'))->out(false);
    $dashboardurl = (new moodle_url('/my/'))->out(false);
    $helpurl = (new moodle_url('/theme/kadsamhsa/about.php'))->out(false);
    $quizurl = (new moodle_url('/theme/kadsamhsa/quizzes.php'))->out(false);
    $logouturl = (new moodle_url('/login/logout.php', ['sesskey' => sesskey()]))->out(false);

    $records = $DB->get_records_select(
        'course',
        'id > 1 AND visible = 1',
        null,
        'sortorder ASC, fullname ASC',
        'id, fullname, summary, summaryformat',
        0,
        12
    );
    $records = array_values($records);

    // Enrolled / in-progress courses for returning-student home.
    $enrolledraw = enrol_get_users_courses($USER->id, true, 'id, fullname, shortname, summary, summaryformat, visible');
    $lastaccessmap = $DB->get_records_menu('user_lastaccess', ['userid' => $USER->id], '', 'courseid, timeaccess');
    $enrolled = [];
    foreach ($enrolledraw as $course) {
        if ((int) $course->id === SITEID || empty($course->visible)) {
            continue;
        }
        $enrolled[] = theme_kadsamhsa_enrolled_course_card(
            $course,
            (int) $USER->id,
            (int) ($lastaccessmap[$course->id] ?? 0)
        );
    }
    usort($enrolled, static function (array $a, array $b): int {
        // Prefer incomplete courses, then most recently accessed.
        $ainc = $a['progress'] < 100 ? 0 : 1;
        $binc = $b['progress'] < 100 ? 0 : 1;
        if ($ainc !== $binc) {
            return $ainc <=> $binc;
        }
        return $b['lastaccess'] <=> $a['lastaccess'];
    });

    $hasstarted = !empty($enrolled);
    $enrolledids = array_column($enrolled, 'id');

    $continuecourse = null;
    $alsostarted = [];
    if ($hasstarted) {
        $continuecourse = $enrolled[0];
        $alsostarted = array_slice($enrolled, 1, 3);
    }

    // New-learner featured recommendation (when no started courses).
    $featuredrecord = null;
    foreach ($records as $course) {
        if (stripos($course->fullname, 'DPTC') !== false || stripos($course->fullname, 'Sensiti') !== false) {
            $featuredrecord = $course;
            break;
        }
    }
    if ($featuredrecord === null && !empty($records)) {
        $featuredrecord = $records[0];
    }

    $defaultsummary = get_string('dashfeaturedfallbacksummary', 'theme_kadsamhsa');
    $publiccatalogueurl = (new moodle_url('/theme/kadsamhsa/courses.php'))->out(false);
    if ($featuredrecord) {
        $featuredurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $featuredrecord->id]))->out(false);
        $featured = [
            'name' => format_string($featuredrecord->fullname),
            'summary' => theme_kadsamhsa_course_summary_plain($featuredrecord, 180, $defaultsummary),
            'url' => $featuredurl,
            'enrolurl' => $featuredurl,
            'pricelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'imageurl' => theme_kadsamhsa_get_course_image_url($featuredrecord),
        ];
        $featuredid = (int) $featuredrecord->id;
    } else {
        $featured = [
            'name' => get_string('dashfeaturedname', 'theme_kadsamhsa'),
            'summary' => $defaultsummary,
            'url' => $publiccatalogueurl,
            'enrolurl' => $publiccatalogueurl,
            'pricelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'imageurl' => theme_kadsamhsa_get_default_course_image_url(),
        ];
        $featuredid = 0;
    }

    // Explore = catalogue courses the learner is not already enrolled in.
    $explore = [];
    $lessonlabels = ['3 lessons', '6 lessons', '12 lessons'];
    $i = 0;
    foreach ($records as $course) {
        if (in_array((int) $course->id, $enrolledids, true)) {
            continue;
        }
        if (!$hasstarted && (int) $course->id === $featuredid) {
            continue;
        }
        if (count($explore) >= 3) {
            break;
        }
        $courseurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false);
        $explore[] = [
            'name' => format_string($course->fullname),
            'url' => $courseurl,
            'enrolurl' => $courseurl,
            'lessons' => $lessonlabels[$i % 3],
            'badgelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'imageurl' => theme_kadsamhsa_get_course_image_url($course),
        ];
        $i++;
    }

    $dismissed = (int) get_user_preferences('theme_kadsamhsa_dash_onboarding', 0);

    return [
        'sitename' => format_string($SITE->shortname, true, [
            'context' => context_course::instance(SITEID),
            'escape' => false,
        ]),
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'username' => fullname($USER),
        'firstname' => !empty($USER->firstname) ? $USER->firstname : fullname($USER),
        'homeurl' => $CFG->wwwroot . '/',
        'dashboardurl' => $dashboardurl,
        'coursesurl' => $coursesurl,
        'catalogueurl' => $coursesurl,
        'quizurl' => $quizurl,
        'helpurl' => $helpurl,
        'logouturl' => $logouturl,
        'navhome' => true,
        'navcourses' => false,
        'navquiz' => false,
        'navhelp' => false,
        'hasstarted' => $hasstarted,
        'continuecourse' => $continuecourse,
        'hasalsostarted' => !empty($alsostarted),
        'alsostarted' => $alsostarted,
        'featured' => $featured,
        'explorecourses' => $explore,
        // Onboarding only for learners who have not started a course yet.
        'showonboarding' => !$hasstarted && $dismissed !== 1,
    ];
}

/**
 * Organization dashboard shell context (Phase 1 placeholder data).
 *
 * @return array
 */
function theme_kadsamhsa_get_org_dashboard_context(): array {
    return [
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'orgname' => get_string('orgplaceholdername', 'theme_kadsamhsa'),
        'totalstaff' => '—',
        'activelearners' => '—',
        'completions' => '—',
        'certificatesissued' => '—',
        'hasstaff' => false,
        'staff' => [],
    ];
}

/**
 * Shared student app chrome (top bar + sidebar) context.
 *
 * @param string $active One of home|courses|quiz|help
 * @return array
 */
function theme_kadsamhsa_get_student_chrome_context(string $active = 'home'): array {
    global $USER, $CFG, $SITE;

    $mycoursesurl = (new moodle_url('/theme/kadsamhsa/mycourses.php'))->out(false);
    $quizzesurl = (new moodle_url('/theme/kadsamhsa/quizzes.php'))->out(false);

    return [
        'sitename' => format_string($SITE->shortname, true, [
            'context' => context_course::instance(SITEID),
            'escape' => false,
        ]),
        'logourl' => theme_kadsamhsa_get_logo_url(),
        'firstname' => !empty($USER->firstname) ? $USER->firstname : fullname($USER),
        'homeurl' => $CFG->wwwroot . '/',
        'dashboardurl' => (new moodle_url('/my/'))->out(false),
        'coursesurl' => $mycoursesurl,
        'quizurl' => $quizzesurl,
        'helpurl' => (new moodle_url('/theme/kadsamhsa/about.php'))->out(false),
        'logouturl' => (new moodle_url('/login/logout.php', ['sesskey' => sesskey()]))->out(false),
        'navhome' => $active === 'home',
        'navcourses' => $active === 'courses',
        'navquiz' => $active === 'quiz',
        'navhelp' => $active === 'help',
    ];
}

/**
 * Delivery type for the Figma player: video (default) or text.
 *
 * Demo rule: shortname/fullname containing "test 1", "test1", or "[text]" → text course.
 *
 * @param stdClass $course
 * @return string 'video'|'text'
 */
function theme_kadsamhsa_get_course_delivery_type(stdClass $course): string {
    $hay = core_text::strtolower(
        ($course->shortname ?? '') . ' ' . ($course->fullname ?? '') . ' ' . ($course->idnumber ?? '')
    );
    if (preg_match('/\btest\s*1\b|\btest1\b|\[text\]|\btext\s*course\b/', $hay)) {
        return 'text';
    }
    return 'video';
}

/**
 * Demo lesson curriculum for the Figma course-play flow.
 *
 * @param int $courseid
 * @param string $delivery 'video'|'text'
 * @return array[]
 */
function theme_kadsamhsa_get_demo_lessons(int $courseid, string $delivery = 'video'): array {
    if ($delivery === 'text') {
        $lessons = [
            [
                'id' => 1,
                'mode' => 'text',
                'title' => get_string('playlesson5title', 'theme_kadsamhsa'),
                'label' => get_string('playlesson5label', 'theme_kadsamhsa'),
                'timestamp' => '01',
                'duration' => '',
                'readtime' => get_string('playreadtime', 'theme_kadsamhsa', 5),
            ],
            [
                'id' => 2,
                'mode' => 'text',
                'title' => get_string('textlesson2title', 'theme_kadsamhsa'),
                'label' => get_string('textlesson2label', 'theme_kadsamhsa'),
                'timestamp' => '02',
                'duration' => '',
                'readtime' => get_string('playreadtime', 'theme_kadsamhsa', 4),
            ],
            [
                'id' => 3,
                'mode' => 'text',
                'title' => get_string('textlesson3title', 'theme_kadsamhsa'),
                'label' => get_string('textlesson3label', 'theme_kadsamhsa'),
                'timestamp' => '03',
                'duration' => '',
                'readtime' => get_string('playreadtime', 'theme_kadsamhsa', 6),
            ],
        ];
    } else {
        $lessons = [
            [
                'id' => 1,
                'mode' => 'video',
                'title' => get_string('playlesson1title', 'theme_kadsamhsa'),
                'label' => get_string('playlesson1label', 'theme_kadsamhsa'),
                'timestamp' => '00:00',
                'duration' => '04:31',
                'readtime' => '',
            ],
            [
                'id' => 2,
                'mode' => 'video',
                'title' => get_string('playlesson2title', 'theme_kadsamhsa'),
                'label' => get_string('playlesson2label', 'theme_kadsamhsa'),
                'timestamp' => '02:00',
                'duration' => '02:26',
                'readtime' => '',
            ],
            [
                'id' => 3,
                'mode' => 'image',
                'title' => get_string('playlesson3title', 'theme_kadsamhsa'),
                'label' => get_string('playlesson3label', 'theme_kadsamhsa'),
                'timestamp' => '04:26',
                'duration' => '03:09',
                'readtime' => '',
            ],
            [
                'id' => 4,
                'mode' => 'image',
                'title' => get_string('playlesson4title', 'theme_kadsamhsa'),
                'label' => get_string('playlesson4label', 'theme_kadsamhsa'),
                'timestamp' => '07:35',
                'duration' => '02:40',
                'readtime' => '',
            ],
            [
                'id' => 5,
                'mode' => 'video',
                'title' => get_string('playlesson1title', 'theme_kadsamhsa'),
                'label' => get_string('videolesson5label', 'theme_kadsamhsa'),
                'timestamp' => '10:17',
                'duration' => '03:20',
                'readtime' => '',
            ],
        ];
    }

    foreach ($lessons as $i => &$lesson) {
        $lesson['url'] = (new moodle_url('/theme/kadsamhsa/play.php', [
            'id' => $courseid,
            'lesson' => $lesson['id'],
            'mode' => $lesson['mode'],
        ]))->out(false);
        $lesson['index'] = $i + 1;
        $lesson['total'] = count($lessons);
    }
    unset($lesson);

    return $lessons;
}

/**
 * My Courses page context (logged-in learner catalogue).
 *
 * @return array
 */
function theme_kadsamhsa_get_mycourses_context(): array {
    global $USER, $DB, $CFG;

    require_once($CFG->libdir . '/completionlib.php');

    $chrome = theme_kadsamhsa_get_student_chrome_context('courses');
    $enrolledraw = enrol_get_users_courses($USER->id, true, 'id, fullname, summary, summaryformat, visible');
    $enrolledids = [];
    $inprogress = 0;
    $completed = 0;
    $enrolledcards = [];

    foreach ($enrolledraw as $course) {
        if ((int) $course->id === SITEID || empty($course->visible)) {
            continue;
        }
        $enrolledids[] = (int) $course->id;
        $card = theme_kadsamhsa_enrolled_course_card($course, (int) $USER->id);
        if ($card['progress'] >= 100) {
            $completed++;
            $status = 'completed';
        } else if ($card['progress'] > 0) {
            $inprogress++;
            $status = 'inprogress';
        } else {
            $status = 'notstarted';
        }
        $delivery = theme_kadsamhsa_get_course_delivery_type($course);
        $enrolledcards[] = [
            'name' => $card['name'],
            'url' => (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false),
            'enrolurl' => (new moodle_url('/theme/kadsamhsa/play.php', [
                'id' => $course->id,
                'mode' => $delivery === 'text' ? 'text' : 'video',
            ]))->out(false),
            'lessons' => $card['moduleslabel'],
            'badgelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'typelabel' => $delivery === 'text'
                ? get_string('coursetypetext', 'theme_kadsamhsa')
                : get_string('coursetypevideo', 'theme_kadsamhsa'),
            'istextcourse' => $delivery === 'text',
            'isvideocourse' => $delivery === 'video',
            'imageurl' => $card['imageurl'],
            'status' => $status,
            'progress' => $card['progress'],
        ];
    }

    $records = $DB->get_records_select(
        'course',
        'id > 1 AND visible = 1',
        null,
        'sortorder ASC, fullname ASC',
        'id, fullname, summary, summaryformat',
        0,
        16
    );

    $notstarted = [];
    $lessonlabels = ['3 lessons', '6 lessons', '12 lessons'];
    $i = 0;
    foreach ($records as $course) {
        if (in_array((int) $course->id, $enrolledids, true)) {
            continue;
        }
        $delivery = theme_kadsamhsa_get_course_delivery_type($course);
        $courseurl = (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $course->id]))->out(false);
        $notstarted[] = [
            'name' => format_string($course->fullname),
            'url' => $courseurl,
            'enrolurl' => $courseurl,
            'lessons' => $lessonlabels[$i % 3],
            'badgelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
            'typelabel' => $delivery === 'text'
                ? get_string('coursetypetext', 'theme_kadsamhsa')
                : get_string('coursetypevideo', 'theme_kadsamhsa'),
            'istextcourse' => $delivery === 'text',
            'isvideocourse' => $delivery === 'video',
            'imageurl' => theme_kadsamhsa_get_course_image_url($course),
            'status' => 'notstarted',
            'progress' => 0,
        ];
        $i++;
    }

    $all = array_merge($enrolledcards, $notstarted);
    $notstartedcount = count($notstarted);

    return array_merge($chrome, [
        'statinprogress' => (string) $inprogress,
        'statcerts' => '0',
        'statdptc' => '0%',
        'stattime' => '0',
        'countall' => count($all),
        'countinprogress' => $inprogress,
        'countcompleted' => $completed,
        'countnotstarted' => $notstartedcount,
        'hasnotstarted' => $notstartedcount > 0,
        'notstartedcourses' => $notstarted,
        'courses' => $all,
    ]);
}

/**
 * Course details page context (pre-enrol / outline).
 *
 * @param int $courseid
 * @return array
 */
function theme_kadsamhsa_get_take_course_detail_context(int $courseid): array {
    global $USER;

    $course = get_course($courseid);
    $chrome = theme_kadsamhsa_get_student_chrome_context('courses');
    $context = context_course::instance($courseid);
    $isenrolled = is_enrolled($context, $USER, '', true);
    $delivery = theme_kadsamhsa_get_course_delivery_type($course);
    $lessons = theme_kadsamhsa_get_demo_lessons($courseid, $delivery);
    $defaultmode = $delivery === 'text' ? 'text' : 'video';

    $outline = [];
    foreach ($lessons as $i => $lesson) {
        $outline[] = [
            'number' => ($i + 1) . '.',
            'title' => $lesson['title'],
            'meta' => $delivery === 'text'
                ? get_string('coursemodulemetatext', 'theme_kadsamhsa')
                : get_string('coursemodulemeta', 'theme_kadsamhsa'),
            'completedlabel' => get_string('coursemodulecompleted', 'theme_kadsamhsa', [
                'done' => 0,
                'total' => $delivery === 'text' ? 1 : 23,
            ]),
            'progress' => 0,
            'url' => $lesson['url'],
        ];
    }

    $enrolurl = (new moodle_url('/enrol/index.php', ['id' => $courseid]))->out(false);
    $playurl = (new moodle_url('/theme/kadsamhsa/play.php', [
        'id' => $courseid,
        'lesson' => 1,
        'mode' => $defaultmode,
    ]))->out(false);

    $summary = theme_kadsamhsa_course_summary_plain(
        $course,
        320,
        $delivery === 'text'
            ? get_string('coursedetailfallbacksummarytext', 'theme_kadsamhsa')
            : get_string('coursedetailfallbacksummary', 'theme_kadsamhsa')
    );

    return array_merge($chrome, [
        'courseid' => $courseid,
        'coursename' => format_string($course->fullname),
        'summary' => $summary,
        'imageurl' => theme_kadsamhsa_get_course_image_url($course),
        'levellabel' => get_string('courselevelintro', 'theme_kadsamhsa'),
        'pricelabel' => get_string('coursesbadgefree', 'theme_kadsamhsa'),
        'typelabel' => $delivery === 'text'
            ? get_string('coursetypetext', 'theme_kadsamhsa')
            : get_string('coursetypevideo', 'theme_kadsamhsa'),
        'istextcourse' => $delivery === 'text',
        'isvideocourse' => $delivery === 'video',
        'statmodules' => (string) count($lessons),
        'statduration' => $delivery === 'text'
            ? get_string('coursestatedurationtext', 'theme_kadsamhsa')
            : get_string('coursestateduration', 'theme_kadsamhsa'),
        'statpass' => get_string('coursestatepass', 'theme_kadsamhsa'),
        'statenrolled' => get_string('coursestateenrolled', 'theme_kadsamhsa'),
        'accesslabel' => get_string('courseaccesslifetime', 'theme_kadsamhsa'),
        'certlabel' => get_string('coursecertincluded', 'theme_kadsamhsa'),
        'outline' => $outline,
        'isenrolled' => $isenrolled,
        'ctaurl' => $isenrolled ? $playurl : $enrolurl,
        'ctalabel' => $isenrolled
            ? ($delivery === 'text'
                ? get_string('dashcontinueread', 'theme_kadsamhsa')
                : get_string('dashcontinuecta', 'theme_kadsamhsa'))
            : get_string('dashenroll', 'theme_kadsamhsa'),
        'detailurl' => (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $courseid]))->out(false),
        'playurl' => $playurl,
    ]);
}

/**
 * Course play page context (video / image / text lesson modes).
 *
 * @param int $courseid
 * @param int $lessonid
 * @param string $modeforced Optional mode override from query string.
 * @return array
 */
function theme_kadsamhsa_get_course_play_context(int $courseid, int $lessonid = 1, string $modeforced = ''): array {
    global $USER;

    $course = get_course($courseid);
    $chrome = theme_kadsamhsa_get_student_chrome_context('courses');
    $delivery = theme_kadsamhsa_get_course_delivery_type($course);
    $lessons = theme_kadsamhsa_get_demo_lessons($courseid, $delivery);
    $total = count($lessons);

    $currentindex = 0;
    foreach ($lessons as $i => $lesson) {
        if ((int) $lesson['id'] === $lessonid) {
            $currentindex = $i;
            break;
        }
    }
    $current = $lessons[$currentindex];
    // Text courses always stay in text UI; video courses keep lesson mode (or forced override).
    if ($delivery === 'text') {
        $mode = 'text';
    } else {
        $mode = in_array($modeforced, ['video', 'image', 'text'], true) ? $modeforced : $current['mode'];
    }
    $current['mode'] = $mode;

    foreach ($lessons as $i => &$lesson) {
        $lesson['isactive'] = ($i === $currentindex);
    }
    unset($lesson);

    $prev = $currentindex > 0 ? $lessons[$currentindex - 1] : null;
    $next = $currentindex < $total - 1 ? $lessons[$currentindex + 1] : null;

    $takequizurl = (new moodle_url('/theme/kadsamhsa/quiz.php', [
        'id' => $courseid,
    ]))->out(false);

    return array_merge($chrome, [
        'courseid' => $courseid,
        'coursename' => format_string($course->fullname),
        'publisher' => get_string('playpublisher', 'theme_kadsamhsa'),
        'detailurl' => (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $courseid]))->out(false),
        'lesson' => $current,
        'lessons' => $lessons,
        'isvideo' => $mode === 'video',
        'isimage' => $mode === 'image',
        'istext' => $mode === 'text',
        'istextcourse' => $delivery === 'text',
        'isvideocourse' => $delivery === 'video',
        'mediaimageurl' => theme_kadsamhsa_get_course_image_url($course),
        'hasprev' => $prev !== null,
        'hasnext' => $next !== null,
        'prevurl' => $prev['url'] ?? '',
        'nexturl' => $next['url'] ?? '',
        'prevlabel' => get_string('playprevious', 'theme_kadsamhsa'),
        'nextlabel' => $next
            ? get_string('playnextnumbered', 'theme_kadsamhsa', [
                'current' => $currentindex + 1,
                'total' => $total,
            ])
            : get_string('playnext', 'theme_kadsamhsa'),
        'takequizurl' => $takequizurl,
        'lessonbanner' => get_string('playlessonbanner', 'theme_kadsamhsa', [
            'num' => $currentindex + 1,
            'title' => format_string($current['label']),
        ]),
        'bodyhtml' => format_text(get_string('playtextbody', 'theme_kadsamhsa'), FORMAT_HTML, [
            'context' => context_course::instance($courseid),
            'para' => true,
        ]),
        'keyterm' => get_string('playkeyterm', 'theme_kadsamhsa'),
        'description' => get_string('playlessondescription', 'theme_kadsamhsa'),
        'rating' => get_string('playrating', 'theme_kadsamhsa'),
        'reviews' => get_string('playreviews', 'theme_kadsamhsa'),
        'firstname' => !empty($USER->firstname) ? $USER->firstname : fullname($USER),
    ]);
}

/**
 * Demo module quiz questions (Figma Module 1 Quiz).
 *
 * @return array[]
 */
function theme_kadsamhsa_get_demo_quiz_questions(): array {
    return [
        [
            'prompt' => get_string('quizq1prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq1a', 'theme_kadsamhsa'),
                get_string('quizq1b', 'theme_kadsamhsa'),
                get_string('quizq1c', 'theme_kadsamhsa'),
                get_string('quizq1d', 'theme_kadsamhsa'),
            ],
            'correct' => 'B',
        ],
        [
            'prompt' => get_string('quizq2prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq2a', 'theme_kadsamhsa'),
                get_string('quizq2b', 'theme_kadsamhsa'),
                get_string('quizq2c', 'theme_kadsamhsa'),
                get_string('quizq2d', 'theme_kadsamhsa'),
            ],
            'correct' => 'A',
        ],
        [
            'prompt' => get_string('quizq3prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq3a', 'theme_kadsamhsa'),
                get_string('quizq3b', 'theme_kadsamhsa'),
                get_string('quizq3c', 'theme_kadsamhsa'),
                get_string('quizq3d', 'theme_kadsamhsa'),
            ],
            'correct' => 'C',
        ],
        [
            'prompt' => get_string('quizq4prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq4a', 'theme_kadsamhsa'),
                get_string('quizq4b', 'theme_kadsamhsa'),
                get_string('quizq4c', 'theme_kadsamhsa'),
                get_string('quizq4d', 'theme_kadsamhsa'),
            ],
            'correct' => 'B',
        ],
        [
            'prompt' => get_string('quizq5prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq5a', 'theme_kadsamhsa'),
                get_string('quizq5b', 'theme_kadsamhsa'),
                get_string('quizq5c', 'theme_kadsamhsa'),
                get_string('quizq5d', 'theme_kadsamhsa'),
            ],
            'correct' => 'D',
        ],
        [
            'prompt' => get_string('quizq6prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq6a', 'theme_kadsamhsa'),
                get_string('quizq6b', 'theme_kadsamhsa'),
                get_string('quizq6c', 'theme_kadsamhsa'),
                get_string('quizq6d', 'theme_kadsamhsa'),
            ],
            'correct' => 'A',
        ],
        [
            'prompt' => get_string('quizq7prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq7a', 'theme_kadsamhsa'),
                get_string('quizq7b', 'theme_kadsamhsa'),
                get_string('quizq7c', 'theme_kadsamhsa'),
                get_string('quizq7d', 'theme_kadsamhsa'),
            ],
            'correct' => 'C',
        ],
        [
            'prompt' => get_string('quizq8prompt', 'theme_kadsamhsa'),
            'options' => [
                get_string('quizq8a', 'theme_kadsamhsa'),
                get_string('quizq8b', 'theme_kadsamhsa'),
                get_string('quizq8c', 'theme_kadsamhsa'),
                get_string('quizq8d', 'theme_kadsamhsa'),
            ],
            'correct' => 'B',
        ],
    ];
}

/**
 * Course quiz page context.
 *
 * @param int $courseid
 * @return array
 */
function theme_kadsamhsa_get_course_quiz_context(int $courseid): array {
    global $USER;

    $course = get_course($courseid);
    $chrome = theme_kadsamhsa_get_student_chrome_context('quiz');
    $questions = theme_kadsamhsa_get_demo_quiz_questions();
    $count = count($questions);
    $timelimit = 30 * 60;

    $segments = [];
    for ($i = 0; $i < $count; $i++) {
        $segments[] = [
            'index' => $i,
            'number' => $i + 1,
            'active' => $i === 0,
        ];
    }

    $delivery = theme_kadsamhsa_get_course_delivery_type($course);
    $playmode = $delivery === 'text' ? 'text' : 'video';
    $first = $questions[0];
    $letters = ['A', 'B', 'C', 'D'];
    $firstoptions = [];
    foreach ($first['options'] as $i => $text) {
        $firstoptions[] = [
            'letter' => $letters[$i] ?? (string) ($i + 1),
            'text' => $text,
        ];
    }

    return array_merge($chrome, [
        'navquiz' => true,
        'navcourses' => false,
        'courseid' => $courseid,
        'coursename' => format_string($course->fullname),
        'quiztitle' => get_string('quizmoduletitle', 'theme_kadsamhsa'),
        'questioncount' => $count,
        'questioncounter' => get_string('quizquestionof', 'theme_kadsamhsa', [
            'current' => 1,
            'total' => $count,
        ]),
        'firstprompt' => $first['prompt'],
        'firstoptions' => $firstoptions,
        'progresssegments' => $segments,
        'questionsjson' => json_encode(array_values($questions), JSON_UNESCAPED_UNICODE),
        'passmark' => 70,
        'attemptsleft' => 2,
        'attemptstotal' => 3,
        'attemptslabel' => get_string('quizattemptslabel', 'theme_kadsamhsa', [
            'left' => 2,
            'total' => 3,
        ]),
        'passheadline' => get_string('quizpassheadline', 'theme_kadsamhsa'),
        'failheadline' => get_string('quizfailheadline', 'theme_kadsamhsa'),
        'resultfeedback' => get_string('quizresultfeedback', 'theme_kadsamhsa'),
        'moveonlabel' => get_string('quizmoveon', 'theme_kadsamhsa'),
        'retakelabel' => get_string('quizretake', 'theme_kadsamhsa'),
        'timelimit' => $timelimit,
        'timerdisplay' => '30:00',
        'playurl' => (new moodle_url('/theme/kadsamhsa/play.php', [
            'id' => $courseid,
            'lesson' => 1,
            'mode' => $playmode,
        ]))->out(false),
        'detailurl' => (new moodle_url('/theme/kadsamhsa/course.php', ['id' => $courseid]))->out(false),
        'firstname' => !empty($USER->firstname) ? $USER->firstname : fullname($USER),
    ]);
}

/**
 * Quiz results overview page context (sidebar Quiz destination).
 *
 * @return array
 */
function theme_kadsamhsa_get_quiz_results_context(): array {
    $chrome = theme_kadsamhsa_get_student_chrome_context('quiz');

    // Prefer Test 1 (text course) for demo retake links when present.
    $democourseid = 5;
    try {
        $test1 = get_course(5);
        if ($test1) {
            $democourseid = (int) $test1->id;
        }
    } catch (Throwable $e) {
        $democourseid = 2;
    }

    $takeurl = (new moodle_url('/theme/kadsamhsa/quiz.php', ['id' => $democourseid]))->out(false);
    $course = 'DPTC sensitization';
    $assessment = 'Module 7 quiz';
    $date = '19 July 2026';

    $rows = [
        [
            'course' => $course,
            'assessment' => $assessment,
            'score' => '86%',
            'attempts' => '1 of 3',
            'date' => $date,
            'statuslabel' => get_string('quizstatuspass', 'theme_kadsamhsa'),
            'ispass' => true,
            'isfail' => false,
            'url' => $takeurl,
        ],
        [
            'course' => $course,
            'assessment' => $assessment,
            'score' => '86%',
            'attempts' => '1 of 3',
            'date' => $date,
            'statuslabel' => get_string('quizstatuspass', 'theme_kadsamhsa'),
            'ispass' => true,
            'isfail' => false,
            'url' => $takeurl,
        ],
        [
            'course' => $course,
            'assessment' => $assessment,
            'score' => '86%',
            'attempts' => '1 of 3',
            'date' => $date,
            'statuslabel' => get_string('quizstatusfail', 'theme_kadsamhsa'),
            'ispass' => false,
            'isfail' => true,
            'url' => $takeurl,
        ],
        [
            'course' => $course,
            'assessment' => 'Module 1 quiz',
            'score' => '64%',
            'attempts' => '2 of 3',
            'date' => '18 July 2026',
            'statuslabel' => get_string('quizstatusfail', 'theme_kadsamhsa'),
            'ispass' => false,
            'isfail' => true,
            'url' => $takeurl,
        ],
        [
            'course' => 'Test 1',
            'assessment' => 'Module 1 quiz',
            'score' => '89%',
            'attempts' => '1 of 3',
            'date' => '17 July 2026',
            'statuslabel' => get_string('quizstatuspass', 'theme_kadsamhsa'),
            'ispass' => true,
            'isfail' => false,
            'url' => (new moodle_url('/theme/kadsamhsa/quiz.php', ['id' => 5]))->out(false),
        ],
    ];

    return array_merge($chrome, [
        'stattaken' => '9',
        'statpassed' => '7',
        'statretry' => '2',
        'stataverage' => '78%',
        'rows' => $rows,
    ]);
}
