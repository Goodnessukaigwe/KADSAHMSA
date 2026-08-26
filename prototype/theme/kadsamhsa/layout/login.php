<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA auth layout (login, signup, password reset).
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$issignup = ($PAGE->pagetype === 'login-signup');
$islogin = ($PAGE->pagetype === 'login-index');
$isabout = ($PAGE->pagetype === 'theme-kadsamhsa-about');
$iscourses = ($PAGE->pagetype === 'theme-kadsamhsa-courses');
$iserror404 = ($PAGE->pagetype === 'theme-kadsamhsa-error404' || $PAGE->pagetype === 'error-index');

// Login layout has no footer — load signup AMD here (before_footer never runs).
$PAGE->requires->js_call_amd('theme_kadsamhsa/signup', 'init');

$bodyattributes = $OUTPUT->body_attributes();
$navcontext = theme_kadsamhsa_get_signup_nav_context($issignup, $islogin, $isabout, $iscourses);

$templatecontext = [
    'sitename' => format_string($SITE->shortname, true, [
        'context' => context_course::instance(SITEID),
        'escape' => false,
    ]),
    'logourl' => theme_kadsamhsa_get_logo_url(),
    'output' => $OUTPUT,
    'bodyattributes' => $bodyattributes,
    'issignup' => $issignup,
    'islogin' => $islogin,
    'isabout' => $isabout,
    'iscourses' => $iscourses,
    'iserror404' => $iserror404,
    'signupnav' => $navcontext,
    'config' => [
        'wwwroot' => $CFG->wwwroot,
        'homeurl' => $CFG->wwwroot . '/',
    ],
];

echo $OUTPUT->render_from_template('theme_kadsamhsa/login', $templatecontext);
