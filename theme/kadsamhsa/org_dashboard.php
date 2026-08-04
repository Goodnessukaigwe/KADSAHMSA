<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA organization dashboard page (Phase 1 UI shell).
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

require_login();

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/org_dashboard.php'));
$PAGE->set_pagelayout('standard');
$PAGE->set_title(get_string('orgdashboardtitle', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('orgdashboardtitle', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-org-dashboard');

echo $OUTPUT->header();
echo $OUTPUT->render_org_dashboard();
echo $OUTPUT->footer();
