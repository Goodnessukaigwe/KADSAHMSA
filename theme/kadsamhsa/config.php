<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Theme kadsamhsa config — Boost child skeleton.
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
