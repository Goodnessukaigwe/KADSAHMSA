<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA Course Play page (video / image / text lesson modes).
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

require_login();

$id = required_param('id', PARAM_INT);
$lesson = optional_param('lesson', 1, PARAM_INT);
$mode = optional_param('mode', '', PARAM_ALPHA);

$course = get_course($id);
$context = context_course::instance($course->id);
$PAGE->set_context($context);
$PAGE->set_course($course);
$PAGE->set_url(new moodle_url('/theme/kadsamhsa/play.php', [
    'id' => $id,
    'lesson' => $lesson,
    'mode' => $mode,
]));
$PAGE->set_pagelayout('mydashboard');
$PAGE->set_pagetype('theme-kadsamhsa-play');
$PAGE->set_title(format_string($course->fullname));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->add_body_class('kadsamhsa-play-page');

echo $OUTPUT->header();
echo $OUTPUT->footer();
