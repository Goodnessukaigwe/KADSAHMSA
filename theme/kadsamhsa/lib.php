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

require_once(__DIR__ . '/classes/util/page_helper.php');

/**
 * Returns the main SCSS content.
 *
 * Boost child pattern: compile full Boost preset, then append KADSAMHSA post styles.
 * (Importing only moodle.scss without Bootstrap variables breaks compilation and
 * Moodle silently falls back to stock Boost CSS — which dropped all our UI.)
 *
 * @param theme_config $theme Theme config.
 * @return string
 */
function theme_kadsamhsa_get_main_scss_content($theme) {
    global $CFG;

    require_once($CFG->dirroot . '/theme/boost/lib.php');

    $scss = theme_boost_get_main_scss_content($theme);
    $scss .= "\n" . file_get_contents($CFG->dirroot . '/theme/kadsamhsa/scss/post.scss');

    return $scss;
}

/**
 * Pre SCSS — brand tokens injected before Boost compilation.
 *
 * @param theme_config $theme Theme config.
 * @return string
 */
function theme_kadsamhsa_get_pre_scss($theme) {
    $scss = '';
    $scss .= '$primary: #0b4d2c !default;' . "\n";
    $scss .= '$secondary: #1a3a2a !default;' . "\n";
    $scss .= '$success: #1a7a45 !default;' . "\n";
    $scss .= '$body-bg: #f4f7f5 !default;' . "\n";
    $scss .= '$body-color: #1a2e23 !default;' . "\n";
    $scss .= '$font-family-sans-serif: "Outfit", system-ui, sans-serif !default;' . "\n";
    $scss .= '$headings-font-family: "Fraunces", Georgia, serif !default;' . "\n";

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

/**
 * User preferences used by the student home shell.
 *
 * @return array[]
 */
function theme_kadsamhsa_user_preferences(): array {
    return [
        'theme_kadsamhsa_dash_onboarding' => [
            'type' => PARAM_INT,
            'null' => NULL_NOT_ALLOWED,
            'default' => 0,
            'choices' => [0, 1],
        ],
    ];
}

/**
 * Inject page-specific requirements.
 *
 * @return void
 */
function theme_kadsamhsa_page_init() {
    global $PAGE;

    if ($PAGE->pagetype === 'course-index') {
        $PAGE->requires->js_call_amd('theme_kadsamhsa/catalogue', 'init');
    }

    if ($PAGE->pagelayout === 'login') {
        $PAGE->requires->js_call_amd('theme_kadsamhsa/signup', 'init');
    }

    $PAGE->requires->js_call_amd('theme_kadsamhsa/lazyload', 'init');
}

/**
 * Callback for Moodle hook — runs before footer on every page.
 *
 * @return void
 */
function theme_kadsamhsa_before_footer() {
    theme_kadsamhsa_page_init();
}
