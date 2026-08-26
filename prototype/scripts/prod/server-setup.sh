#!/usr/bin/env bash
# KADSAMHSA LMS — one-time VPS preparation (Ubuntu 22.04/24.04 or Debian 12).
# Run as root on a FRESH server:  sudo bash scripts/prod/server-setup.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-kadsamhsa}"
APP_DIR="${APP_DIR:-/opt/kadsamhsa}"

echo "==> Updating base system"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git rsync unzip ufw fail2ban \
  unattended-upgrades cron jq

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Firewall (SSH + HTTP + HTTPS only)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> Automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now fail2ban

echo "==> Swap (Moodle upgrades are memory-hungry on small boxes)"
TOTAL_MB="$(free -m | awk '/^Mem:/{print $2}')"
if [[ "${TOTAL_MB}" -lt 4096 ]] && [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "vm.swappiness=10" > /etc/sysctl.d/99-swappiness.conf
  sysctl -p /etc/sysctl.d/99-swappiness.conf
  echo "    2 GB swap enabled (RAM = ${TOTAL_MB} MB)"
else
  echo "    Skipped (RAM = ${TOTAL_MB} MB or swapfile already present)"
fi

echo "==> Deploy user + app directory"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"
mkdir -p "${APP_DIR}" "${APP_DIR}/backups"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

# Let the deploy user reuse root's authorised keys so you can SSH in directly.
if [[ -f /root/.ssh/authorized_keys ]]; then
  install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  install -m 600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
    /root/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

echo "==> Hardening sshd (key-only, no root password login)"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd || true

cat <<DONE

=========================================================
 Server ready.

 Next steps (as ${DEPLOY_USER}, NOT root):

   su - ${DEPLOY_USER}
   git clone https://github.com/Goodnessukaigwe/KADSAHMSA.git ${APP_DIR}/app
   cd ${APP_DIR}/app/KADSAHMSA
   cp config/.env.production.example .env.production
   nano .env.production          # fill in domain + secrets
   chmod 600 .env.production
   ./scripts/prod/deploy.sh --first-run

 Docker: $(docker --version)
 Compose: $(docker compose version --short 2>/dev/null || echo 'n/a')
=========================================================
DONE
