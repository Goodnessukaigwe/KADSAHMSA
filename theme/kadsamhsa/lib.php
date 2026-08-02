<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Theme kadsamhsa library functions.
 *
 * @package    theme_kadsamhsa
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Returns the main SCSS content.
 *
 * @param theme_config $theme Theme config.
 * @return string
 */
function theme_kadsamhsa_get_main_scss_content($theme) {
    global $CFG;

    $scss = '';
    $filename = !empty($theme->settings->preset) ? $theme->settings->preset : null;
    $fs = get_file_storage();

    $context = context_system::instance();
    if ($filename == 'default.scss') {
        $scss .= file_get_contents($CFG->dirroot . '/theme/kadsamhsa/scss/preset/default.scss');
    } else if ($filename && ($presetfile = $fs->get_file($context->id, 'theme_kadsamhsa', 'preset', 0, '/', $filename))) {
        $scss .= $presetfile->get_content();
    } else {
        $scss .= file_get_contents($CFG->dirroot . '/theme/kadsamhsa/scss/preset/default.scss');
    }

    $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/moodle.scss');

    return $scss;
}

/**
 * Pre SCSS (CSS variables / tokens — Phase 1 will expand).
 *
 * @param theme_config $theme Theme config.
 * @return string
 */
function theme_kadsamhsa_get_pre_scss($theme) {
    $scss = '';
    // Placeholder brand tokens for Phase 1 Figma integration.
    $scss .= '$primary: #0b5f2a !default;' . "\n";
    $scss .= '$brand-color: #0b5f2a !default;' . "\n";

    if (!empty($theme->settings->scsspre)) {
        $scss .= $theme->settings->scsspre;
    }
    return $scss;
}

/**
 * Extra SCSS from theme settings.
 *
 * @param theme_config $theme Theme config.
 * @return string
 */
function theme_kadsamhsa_get_extra_scss($theme) {
    return !empty($theme->settings->scss) ? $theme->settings->scss : '';
}

/**
 * Get compiled CSS (fallback to Boost).
 *
 * @return string
 */
function theme_kadsamhsa_get_precompiled_css() {
    global $CFG;
    return file_get_contents($CFG->dirroot . '/theme/boost/style/moodle.css');
}
