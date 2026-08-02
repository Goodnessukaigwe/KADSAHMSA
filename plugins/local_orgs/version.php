<?php
// This file is part of Moodle - http://moodle.org/

/**
 * local_orgs — organization scaffold on top of Moodle cohorts (not IOMAD).
 *
 * @package    local_orgs
 * @copyright  2026 KADSAMHSA
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_orgs';
$plugin->version   = 2025072800;
$plugin->requires  = 2024100700; // Moodle 4.5.
$plugin->maturity  = MATURITY_ALPHA;
$plugin->release   = '0.1.0 (Phase 0 scaffold)';
