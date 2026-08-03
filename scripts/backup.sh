#!/usr/bin/env bash

# Exit immediately if a command fails
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/tmp/chat-backups}"
UPLOADS_DIR="${UPLOAD_DIR:-./uploads}"
PASSPHRASE="${GPG_PASSPHRASE:-SecretBackupPassphrase123!}"

mkdir -p "${BACKUP_DIR}"

ARCHIVE_NAME="private_chat_backup_${TIMESTAMP}.tar"
ENCRYPTED_ARCHIVE="${BACKUP_DIR}/${ARCHIVE_NAME}.gpg"
TEMP_STAGE=$(mktemp -d)

trap 'rm -rf "${TEMP_STAGE}"' EXIT

echo "[Backup] Starting automated backup at ${TIMESTAMP}..."

# 1. PostgreSQL Database Dump
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[Backup] Dumping PostgreSQL database..."
  pg_dump "${DATABASE_URL}" > "${TEMP_STAGE}/db_dump.sql"
else
  echo "[Warning] DATABASE_URL not set, skipping pg_dump"
fi

# 2. Copy Upload Vault files
if [ -d "${UPLOADS_DIR}" ]; then
  echo "[Backup] Copying upload vault files..."
  cp -r "${UPLOADS_DIR}" "${TEMP_STAGE}/uploads"
fi

# 3. Create unencrypted tarball in staging
tar -cvf "${TEMP_STAGE}/${ARCHIVE_NAME}" -C "${TEMP_STAGE}" db_dump.sql uploads 2>/dev/null || true

# 4. GPG AES-256 Encryption
echo "[Backup] Encrypting archive with AES-256..."
gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase "${PASSPHRASE}" -o "${ENCRYPTED_ARCHIVE}" "${TEMP_STAGE}/${ARCHIVE_NAME}"

echo "[Backup Success] Encrypted backup created at: ${ENCRYPTED_ARCHIVE}"
