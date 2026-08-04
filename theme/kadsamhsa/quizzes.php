<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA Quiz results overview (sidebar Quiz destination).
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

require_login();

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/quizzes.php'));
$PAGE->set_pagelayout('mydashboard');
$PAGE->set_pagetype('theme-kadsamhsa-quizzes');
$PAGE->set_title(get_string('quizresultstitle', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('quizresultstitle', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-quizzes-page');

echo $OUTPUT->header();
echo $OUTPUT->footer();
