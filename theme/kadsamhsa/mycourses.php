<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA My Courses page (logged-in learner).
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
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/mycourses.php'));
$PAGE->set_pagelayout('mydashboard');
$PAGE->set_pagetype('theme-kadsamhsa-mycourses');
$PAGE->set_title(get_string('mycoursestitle', 'theme_kadsamhsa'));
$PAGE->set_heading(get_string('mycoursestitle', 'theme_kadsamhsa'));
$PAGE->add_body_class('kadsamhsa-mycourses-page');

echo $OUTPUT->header();
echo $OUTPUT->footer();
