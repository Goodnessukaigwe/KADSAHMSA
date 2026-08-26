<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA public About Us page.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/about.php'));
$PAGE->set_pagelayout('login');
$PAGE->set_title(get_string('aboutpagetitle', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('aboutpagetitle', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-about-page');

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('theme_kadsamhsa/about', theme_kadsamhsa_get_about_context());
echo $OUTPUT->footer();
