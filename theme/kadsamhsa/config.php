<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Theme kadsamhsa config — Boost child with Phase 1 UI integration.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$THEME->name = 'kadsamhsa';
$THEME->parents = ['boost'];
$THEME->sheets = [];
$THEME->editor_sheets = [];
$THEME->usefallback = true;
$THEME->scss = function($theme) {
    return theme_kadsamhsa_get_main_scss_content($theme);
};
$THEME->pre_scss = function($theme) {
    return theme_kadsamhsa_get_pre_scss($theme);
};
$THEME->extrascsscallback = 'theme_kadsamhsa_get_extra_scss';
$THEME->precompiledcsscallback = 'theme_kadsamhsa_get_precompiled_css';
$THEME->yuicssmodules = [];
$THEME->rendererfactory = 'theme_overridden_renderer_factory';
$THEME->requiredblocks = '';
$THEME->addblockposition = BLOCK_ADDBLOCK_POSITION_FLATNAV;
$THEME->iconsystem = \core\output\icon_system::FONTAWESOME;
$THEME->haseditswitch = true;
$THEME->usescourseindex = true;
$THEME->activityheaderconfig = [
    'notitle' => true,
];

$drawerlayout = 'drawers.php';

$THEME->layouts = [
    'base' => [
        'file' => $drawerlayout,
        'regions' => [],
    ],
    'standard' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'course' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
        'options' => ['langmenu' => true],
    ],
    'coursecategory' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'incourse' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'frontpage' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
        'options' => ['nonavbar' => false],
    ],
    'admin' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'mycourses' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
        'options' => ['nonavbar' => true],
    ],
    'mydashboard' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
        'options' => ['nonavbar' => true, 'langmenu' => true],
    ],
    'mypublic' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'login' => [
        'file' => 'login.php',
        'regions' => [],
        'options' => ['langmenu' => true],
    ],
    'popup' => [
        'file' => $drawerlayout,
        'regions' => [],
        'options' => ['nofooter' => true, 'nonavbar' => true],
    ],
    'frametop' => [
        'file' => $drawerlayout,
        'regions' => [],
        'options' => ['nofooter' => true, 'nocoursefooter' => true],
    ],
    'embedded' => [
        'file' => $drawerlayout,
        'regions' => [],
    ],
    'maintenance' => [
        'file' => $drawerlayout,
        'regions' => [],
        'options' => ['nofooter' => true, 'nonavbar' => true],
    ],
    'print' => [
        'file' => $drawerlayout,
        'regions' => [],
        'options' => ['nofooter' => true, 'nonavbar' => true],
    ],
    'redirect' => [
        'file' => $drawerlayout,
        'regions' => [],
        'options' => ['nofooter' => true, 'nonavbar' => true],
    ],
    'report' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
    'secure' => [
        'file' => $drawerlayout,
        'regions' => ['side-pre'],
        'defaultregion' => 'side-pre',
    ],
];

$THEME->javascripts = [];
$THEME->javascripts_footer = [];
