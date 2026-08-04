<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA public Courses catalogue page.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/courses.php'));
$PAGE->set_pagelayout('login');
$PAGE->set_title(get_string('coursespagetitle', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('coursespagetitle', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-courses-page');

$PAGE->requires->js_call_amd('theme_kadsamhsa/courses', 'init');

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('theme_kadsamhsa/courses', theme_kadsamhsa_get_courses_page_context());
echo $OUTPUT->footer();
