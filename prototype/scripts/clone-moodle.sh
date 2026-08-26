#!/usr/bin/env bash
# Install Moodle 4.5 LTS into moodle/
# Prefers official download.moodle.org tarball (reliable); falls back to git/GitHub.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${ROOT}/moodle"
BRANCH="${MOODLE_BRANCH:-MOODLE_405_STABLE}"
REPO="${MOODLE_REPO:-https://github.com/moodle/moodle.git}"
OFFICIAL_URL="${MOODLE_OFFICIAL_URL:-https://download.moodle.org/download.php/direct/stable405/moodle-latest-405.tgz}"
TARBALL_URL="${MOODLE_TARBALL_URL:-https://github.com/moodle/moodle/archive/refs/heads/${BRANCH}.tar.gz}"

install_from_tarball() {
  local url="$1"
  local tmp
  tmp="$(mktemp -d)"
  echo "Downloading Moodle from ${url}..."
  curl -4 -fL --retry 5 --retry-delay 3 --retry-all-errors -o "${tmp}/moodle.tgz" "${url}"
  gzip -t "${tmp}/moodle.tgz"
  echo "Extracting..."
  mkdir -p "${TARGET}"
  tar -xzf "${tmp}/moodle.tgz" -C "${tmp}"
  local extracted
  if [[ -d "${tmp}/moodle" ]]; then
    extracted="${tmp}/moodle"
  else
    extracted="$(find "${tmp}" -mindepth 1 -maxdepth 1 -type d ! -path "${tmp}" | head -1)"
  fi
  shopt -s dotglob
  mv "${extracted}"/* "${TARGET}/"
  shopt -u dotglob
  rm -rf "${tmp}"
  echo "Done. Moodle is at ${TARGET}"
}

if [[ -f "${TARGET}/admin/cli/install.php" ]]; then
  echo "Moodle already present at ${TARGET}"
  exit 0
fi

if [[ -d "${TARGET}" ]] && [[ -n "$(ls -A "${TARGET}" 2>/dev/null || true)" ]]; then
  if [[ ! -f "${TARGET}/admin/cli/install.php" ]]; then
    echo "Incomplete moodle/ tree — removing and reinstalling..."
    rm -rf "${TARGET}"
  else
    echo "ERROR: ${TARGET} exists and is not empty / not a Moodle tree." >&2
    exit 1
  fi
fi

mkdir -p "${TARGET}"

# 1) Official package (preferred)
if install_from_tarball "${OFFICIAL_URL}"; then
  exit 0
fi

echo "Official tarball failed — trying GitHub archive..."
rm -rf "${TARGET}"
mkdir -p "${TARGET}"
if install_from_tarball "${TARBALL_URL}"; then
  exit 0
fi

echo "Tarball failed — trying git clone..."
rm -rf "${TARGET}"
if GIT_HTTP_LOW_SPEED_LIMIT=1000 GIT_HTTP_LOW_SPEED_TIME=120 \
  git clone --depth 1 --branch "${BRANCH}" "${REPO}" "${TARGET}"; then
  echo "Done (git). Moodle ${BRANCH} is at ${TARGET}"
  exit 0
fi

echo "ERROR: could not obtain Moodle ${BRANCH}" >&2
exit 1
