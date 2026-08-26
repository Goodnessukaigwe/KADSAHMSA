<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Theme kadsamhsa settings.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $settings = new theme_boost_admin_settingspage_tabs('themesettingkadsamhsa', get_string('configtitle', 'theme_kadsamhsa'));

    $page = new admin_settingpage('theme_kadsamhsa_general', get_string('generalsettings', 'theme_kadsamhsa'));

    $name = 'theme_kadsamhsa/preset';
    $title = get_string('preset', 'theme_kadsamhsa');
    $description = get_string('preset_desc', 'theme_kadsamhsa');
    $default = 'default.scss';
    $choices = ['default.scss' => 'default.scss'];
    $setting = new admin_setting_configselect($name, $title, $description, $default, $choices);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $name = 'theme_kadsamhsa/scsspre';
    $title = get_string('rawscsspre', 'theme_kadsamhsa');
    $description = get_string('rawscsspre_desc', 'theme_kadsamhsa');
    $default = '';
    $setting = new admin_setting_scsscode($name, $title, $description, $default, PARAM_RAW);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $name = 'theme_kadsamhsa/scss';
    $title = get_string('rawscss', 'theme_kadsamhsa');
    $description = get_string('rawscss_desc', 'theme_kadsamhsa');
    $default = '';
    $setting = new admin_setting_scsscode($name, $title, $description, $default, PARAM_RAW);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    $settings->add($page);
}
