<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA public 404 error page (Figma).
 *
 * Also used as nginx ErrorDocument target.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

http_response_code(404);

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/error404.php'));
$PAGE->set_pagelayout('login');
$PAGE->set_title(get_string('error404title', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('error404title', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-error404-page');

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('theme_kadsamhsa/error404', theme_kadsamhsa_get_error404_context());
echo $OUTPUT->footer();
