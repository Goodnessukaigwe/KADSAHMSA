<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Privacy API for local_orgs (Phase 0 scaffold — no personal data stored yet).
 *
 * @package    local_orgs
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_orgs\privacy;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider (null — no stored personal data in Phase 0).
 */
class provider implements \core_privacy\local\metadata\null_provider {

    /**
     * Explain why this plugin stores no personal data yet.
     *
     * @return string
     */
    public static function get_reason(): string {
        return 'privacy:metadata';
    }
}
