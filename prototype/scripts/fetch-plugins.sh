#!/usr/bin/env bash
# Fetch real plugins into plugins/ (customcert + enrol_paystack)
# Uses GitHub ZIP archives (more reliable than shallow git on slow links).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

# No MOODLE_405_STABLE branch upstream; 404 line is compatible with Moodle 4.5.
CUSTOMCERT_BRANCH="${CUSTOMCERT_BRANCH:-MOODLE_404_STABLE}"
CUSTOMCERT_ZIP="${CUSTOMCERT_ZIP:-https://github.com/mdjnelson/moodle-mod_customcert/archive/refs/heads/${CUSTOMCERT_BRANCH}.zip}"
PAYSTACK_REF="${PAYSTACK_REF:-v1.2.2}"
PAYSTACK_ZIP="${PAYSTACK_ZIP:-https://github.com/PaystackHQ/plugin-moodle-enrol/archive/refs/tags/${PAYSTACK_REF}.zip}"

echo "Fetching mod_customcert (${CUSTOMCERT_BRANCH})..."
curl -fL --retry 5 --retry-delay 3 -o "${TMP}/customcert.zip" "${CUSTOMCERT_ZIP}"
rm -rf "${ROOT}/plugins/customcert"
unzip -q "${TMP}/customcert.zip" -d "${TMP}/cc"
mv "${TMP}/cc"/moodle-mod_customcert-* "${ROOT}/plugins/customcert"

echo "Fetching enrol_paystack (${PAYSTACK_REF})..."
curl -fL --retry 5 --retry-delay 3 -o "${TMP}/paystack.zip" "${PAYSTACK_ZIP}"
rm -rf "${ROOT}/plugins/enrol_paystack"
unzip -q "${TMP}/paystack.zip" -d "${TMP}/ps"
SRC="$(find "${TMP}/ps" -mindepth 1 -maxdepth 1 -type d | head -1)"
if [[ -f "${SRC}/version.php" ]]; then
  mv "${SRC}" "${ROOT}/plugins/enrol_paystack"
elif [[ -d "${SRC}/paystack" ]] && [[ -f "${SRC}/paystack/version.php" ]]; then
  mv "${SRC}/paystack" "${ROOT}/plugins/enrol_paystack"
else
  FOUND="$(find "${SRC}" -name version.php | head -1)"
  DIR="$(dirname "${FOUND}")"
  mkdir -p "${ROOT}/plugins/enrol_paystack"
  rsync -a "${DIR}/" "${ROOT}/plugins/enrol_paystack/"
fi

echo "Paystack version.php:"
grep -E '\$plugin->(version|requires|component|release)' "${ROOT}/plugins/enrol_paystack/version.php" || true
echo "Customcert version.php:"
grep -E '\$plugin->(version|requires|component|release)' "${ROOT}/plugins/customcert/version.php" || true
echo "Plugins fetched into plugins/"
