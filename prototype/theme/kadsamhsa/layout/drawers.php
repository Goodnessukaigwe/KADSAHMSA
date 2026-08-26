<?php
// This file is part of Moodle - http://moodle.org/

/**
 * KADSAMHSA drawer-based layout.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/lib.php');

$addblockbutton = $OUTPUT->addblockbutton();

if (isloggedin()) {
    $courseindexopen = (get_user_preferences('drawer-open-index', true) == true);
    $blockdraweropen = (get_user_preferences('drawer-open-block') == true);
} else {
    $courseindexopen = false;
    $blockdraweropen = false;
}

if (defined('BEHAT_SITE_RUNNING') && get_user_preferences('behat_keep_drawer_closed') != 1) {
    $blockdraweropen = true;
}

$extraclasses = ['uses-drawers'];
if ($courseindexopen) {
    $extraclasses[] = 'drawer-open-index';
}

$blockshtml = $OUTPUT->blocks('side-pre');
$hasblocks = (strpos($blockshtml, 'data-block=') !== false || !empty($addblockbutton));
if (!$hasblocks) {
    $blockdraweropen = false;
}
$courseindex = core_course_drawer();
if (!$courseindex) {
    $courseindexopen = false;
}

$bodyattributes = $OUTPUT->body_attributes($extraclasses);
$forceblockdraweropen = $OUTPUT->firstview_fakeblocks();

$secondarynavigation = false;
$overflow = '';
if ($PAGE->has_secondary_navigation()) {
    $tablistnav = $PAGE->has_tablist_secondary_navigation();
    $moremenu = new \core\navigation\output\more_menu($PAGE->secondarynav, 'nav-tabs', true, $tablistnav);
    $secondarynavigation = $moremenu->export_for_template($OUTPUT);
    $overflowdata = $PAGE->secondarynav->get_overflow_menu_data();
    if (!is_null($overflowdata)) {
        $overflow = $overflowdata->export_for_template($OUTPUT);
    }
}

$primary = new core\navigation\output\primary($PAGE);
$renderer = $PAGE->get_renderer('core');
$primarymenu = $primary->export_for_template($renderer);
$buildregionmainsettings = !$PAGE->include_region_main_settings_in_header_actions()
    && !$PAGE->has_secondary_navigation();
$regionmainsettingsmenu = $buildregionmainsettings ? $OUTPUT->region_main_settings_menu() : false;

$header = $PAGE->activityheader;
$headercontent = $header->export_for_template($renderer);

// KADSAMHSA page-specific template flags.
$frontpagehero = false;
$catalogueheader = false;
$coursedetailhero = false;
$dashboardshell = false;

if ($PAGE->pagelayout === 'frontpage') {
    $frontpagehero = theme_kadsamhsa_get_frontpage_hero_context();
}

if ($PAGE->pagetype === 'course-index') {
    $catalogueheader = theme_kadsamhsa_get_catalogue_header_context();
}

if ($PAGE->pagelayout === 'course' && $PAGE->course->id > SITEID) {
    $coursedetailhero = theme_kadsamhsa_get_course_detail_context();
}

$dashboardhtml = '';
if (isloggedin() && !isguestuser()) {
    if ($PAGE->pagetype === 'my-index') {
        $dashboardshell = true;
        $dashboardhtml = $OUTPUT->render_learner_dashboard();
        $PAGE->requires->js_call_amd('theme_kadsamhsa/dashboard', 'init');
    } else if ($PAGE->pagetype === 'theme-kadsamhsa-mycourses') {
        $dashboardshell = true;
        $dashboardhtml = $OUTPUT->render_mycourses();
        $PAGE->requires->js_call_amd('theme_kadsamhsa/mycourses', 'init');
    } else if ($PAGE->pagetype === 'theme-kadsamhsa-course') {
        $dashboardshell = true;
        $courseid = (int) ($PAGE->course->id ?? optional_param('id', 0, PARAM_INT));
        $dashboardhtml = $OUTPUT->render_take_course($courseid);
    } else if ($PAGE->pagetype === 'theme-kadsamhsa-play') {
        $dashboardshell = true;
        $courseid = (int) ($PAGE->course->id ?? optional_param('id', 0, PARAM_INT));
        $lesson = optional_param('lesson', 1, PARAM_INT);
        $mode = optional_param('mode', '', PARAM_ALPHA);
        $dashboardhtml = $OUTPUT->render_course_play($courseid, $lesson, $mode);
        $PAGE->requires->js_call_amd('theme_kadsamhsa/play', 'init');
    } else if ($PAGE->pagetype === 'theme-kadsamhsa-quiz') {
        $dashboardshell = true;
        $courseid = (int) ($PAGE->course->id ?? optional_param('id', 0, PARAM_INT));
        $dashboardhtml = $OUTPUT->render_course_quiz($courseid);
        $PAGE->requires->js_call_amd('theme_kadsamhsa/quiz', 'init');
    } else if ($PAGE->pagetype === 'theme-kadsamhsa-quizzes') {
        $dashboardshell = true;
        $dashboardhtml = $OUTPUT->render_quiz_results();
    }
}

$templatecontext = [
    'sitename' => format_string($SITE->shortname, true, [
        'context' => context_course::instance(SITEID),
        'escape' => false,
    ]),
    'logourl' => theme_kadsamhsa_get_logo_url(),
    'output' => $OUTPUT,
    'sidepreblocks' => $blockshtml,
    'hasblocks' => $hasblocks,
    'bodyattributes' => $bodyattributes,
    'courseindexopen' => $courseindexopen,
    'blockdraweropen' => $blockdraweropen,
    'courseindex' => $courseindex,
    'primarymoremenu' => $primarymenu['moremenu'],
    'secondarymoremenu' => $secondarynavigation ?: false,
    'mobileprimarynav' => $primarymenu['mobileprimarynav'],
    'usermenu' => $primarymenu['user'],
    'langmenu' => $primarymenu['lang'],
    'forceblockdraweropen' => $forceblockdraweropen,
    'regionmainsettingsmenu' => $regionmainsettingsmenu,
    'hasregionmainsettingsmenu' => !empty($regionmainsettingsmenu),
    'overflow' => $overflow,
    'headercontent' => $headercontent,
    'addblockbutton' => $addblockbutton,
    'frontpagehero' => $frontpagehero,
    'catalogueheader' => $catalogueheader,
    'coursedetailhero' => $coursedetailhero,
    'dashboardshell' => $dashboardshell,
    'dashboardhtml' => $dashboardhtml,
    'config' => [
        'wwwroot' => $CFG->wwwroot,
        'homeurl' => $CFG->wwwroot . '/',
    ],
    'year' => date('Y'),
];

echo $OUTPUT->render_from_template('theme_kadsamhsa/drawers', $templatecontext);
