<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA theme core renderer.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace theme_kadsamhsa\output;

defined('MOODLE_INTERNAL') || die();

/**
 * Core renderer extending Boost.
 */
class core_renderer extends \theme_boost\output\core_renderer {

    /**
     * Add KADSAMHSA body classes.
     *
     * @param string[]|string $additionalclasses
     * @return string
     */
    public function body_attributes($additionalclasses = []) {
        if (!is_array($additionalclasses)) {
            $additionalclasses = explode(' ', $additionalclasses);
        }
        $additionalclasses = array_merge($additionalclasses, \theme_kadsamhsa_get_body_classes());
        return parent::body_attributes($additionalclasses);
    }

    /**
     * Render learner dashboard shell.
     *
     * @return string
     */
    /**
     * Attach shared student chrome avatar HTML.
     *
     * @param array $context
     * @return array
     */
    protected function with_student_avatar(array $context): array {
        global $USER;

        $userpicture = new \user_picture($USER);
        $userpicture->size = 64;
        $userpicture->link = false;
        $userpicture->class = 'kadsamhsa-shome-side__avatar-img';
        $context['userpicture'] = $this->render($userpicture);
        return $context;
    }

    public function render_learner_dashboard(): string {
        $context = $this->with_student_avatar(\theme_kadsamhsa_get_dashboard_context());
        return $this->render_from_template('theme_kadsamhsa/learner_dashboard', $context);
    }

    /**
     * Render My Courses page.
     *
     * @return string
     */
    public function render_mycourses(): string {
        $context = $this->with_student_avatar(\theme_kadsamhsa_get_mycourses_context());
        return $this->render_from_template('theme_kadsamhsa/mycourses', $context);
    }

    /**
     * Render Course Details (take course) page.
     *
     * @param int $courseid
     * @return string
     */
    public function render_take_course(int $courseid): string {
        $context = $this->with_student_avatar(\theme_kadsamhsa_get_take_course_detail_context($courseid));
        return $this->render_from_template('theme_kadsamhsa/take_course', $context);
    }

    /**
     * Render Course Play page.
     *
     * @param int $courseid
     * @param int $lessonid
     * @param string $mode
     * @return string
     */
    public function render_course_play(int $courseid, int $lessonid = 1, string $mode = ''): string {
        $context = $this->with_student_avatar(
            \theme_kadsamhsa_get_course_play_context($courseid, $lessonid, $mode)
        );
        return $this->render_from_template('theme_kadsamhsa/course_play', $context);
    }

    /**
     * Render Course Quiz demo page.
     *
     * @param int $courseid
     * @return string
     */
    public function render_course_quiz(int $courseid): string {
        $context = $this->with_student_avatar(
            \theme_kadsamhsa_get_course_quiz_context($courseid)
        );
        return $this->render_from_template('theme_kadsamhsa/course_quiz', $context);
    }

    /**
     * Render Quiz results overview page.
     *
     * @return string
     */
    public function render_quiz_results(): string {
        $context = $this->with_student_avatar(\theme_kadsamhsa_get_quiz_results_context());
        return $this->render_from_template('theme_kadsamhsa/quiz_results', $context);
    }

    /**
     * Render organization dashboard shell.
     *
     * @return string
     */
    public function render_org_dashboard(): string {
        $context = \theme_kadsamhsa_get_org_dashboard_context();
        return $this->render_from_template('theme_kadsamhsa/org_dashboard', $context);
    }

    /**
     * Render login form with KADSAMHSA two-column shell (matches signup).
     *
     * @param \core_auth\output\login $form
     * @return string
     */
    public function render_login(\core_auth\output\login $form) {
        global $SITE;

        $context = $form->export_for_template($this);
        $context->errorformatted = $this->error_text($context->error);
        // Prefer the Figma title + media panel over the site logo block.
        $context->logourl = false;
        $context->signinimageurl = $this->image_url('signin', 'theme_kadsamhsa')->out(false);
        $context->sitename = format_string(
            $SITE->fullname,
            true,
            ['context' => \context_course::instance(SITEID), 'escape' => false]
        );
        // Keep the page focused on the auth form (guest / first-time blocks hidden in UI).
        $context->canloginasguest = false;
        $context->hasinstructions = false;
        $context->languagemenu = null;

        return $this->render_from_template('core/loginform', $context);
    }

    /**
     * Render signup form with KADSAMHSA two-column layout context.
     *
     * @param \login_signup_form $form
     * @return string
     */
    public function render_login_signup_form($form) {
        global $SITE;

        $context = $form->export_for_template($this);
        $context['loginurl'] = (new \moodle_url('/login/index.php'))->out(false);
        $context['signinimageurl'] = $this->image_url('signin', 'theme_kadsamhsa')->out(false);
        $context['sitename'] = format_string(
            $SITE->fullname,
            true,
            ['context' => \context_course::instance(SITEID), 'escape' => false]
        );

        return $this->render_from_template('core/signup_form_layout', $context);
    }

    /**
     * Render Figma 404 page for not-found style fatal errors (when output not started).
     *
     * @param string $message
     * @param string $moreinfourl
     * @param string $link
     * @param array $backtrace
     * @param string|null $debuginfo
     * @param string $errorcode
     * @return string
     */
    public function fatal_error($message, $moreinfourl, $link, $backtrace, $debuginfo = null, $errorcode = "") {
        global $CFG;

        $notfoundcodes = [
            'invalidcourseid',
            'coursemisconf',
            'invalidcoursemodule',
            'invalidrecord',
            'filenotfound',
            'pagenotexist',
        ];

        $lookslike404 = in_array($errorcode, $notfoundcodes, true)
            || stripos($message, 'not found') !== false
            || stripos($message, 'does not exist') !== false
            || stripos($message, 'can\'t find') !== false;

        // Keep developer debug on the stock error UI when debugging is on.
        if ($lookslike404 && !$this->has_started() && empty($CFG->debugdeveloper)) {
            $protocol = (isset($_SERVER['SERVER_PROTOCOL']) ? $_SERVER['SERVER_PROTOCOL'] : 'HTTP/1.0');
            @header($protocol . ' 404 Not Found');

            while (ob_get_level() > 0) {
                $buff = ob_get_clean();
                if ($buff === false) {
                    break;
                }
            }

            $this->page->set_context(\context_system::instance());
            $this->page->set_url(new \moodle_url('/theme/kadsamhsa/error404.php'));
            $this->page->set_pagelayout('login');
            $this->page->set_title(get_string('error404title', 'theme_kadsamhsa'));
            $this->page->set_heading(get_string('error404title', 'theme_kadsamhsa'));
            $this->page->add_body_class('kadsamhsa-error404-page');
            $this->page->activityheader->disable();

            $output = $this->header();
            $output .= $this->render_from_template(
                'theme_kadsamhsa/error404',
                \theme_kadsamhsa_get_error404_context()
            );
            $output .= $this->footer();
            $output .= str_repeat(' ', 512);
            return $output;
        }

        return parent::fatal_error($message, $moreinfourl, $link, $backtrace, $debuginfo, $errorcode);
    }
}
