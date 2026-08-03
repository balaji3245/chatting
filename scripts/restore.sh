#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/backup.gpg"
  exit 1
fi

ENCRYPTED_FILE="$1"
PASSPHRASE="${GPG_PASSPHRASE:-SecretBackupPassphrase123!}"
UPLOADS_DIR="${UPLOAD_DIR:-./uploads}"

if [ ! -f "${ENCRYPTED_FILE}" ]; then
  echo "Error: Encrypted backup file '${ENCRYPTED_FILE}' does not exist."
  exit 1
fi

TEMP_STAGE=$(mktemp -d)
trap 'rm -rf "${TEMP_STAGE}"' EXIT

echo "[Restore] Decrypting backup archive..."
gpg --batch --yes --decrypt --passphrase "${PASSPHRASE}" -o "${TEMP_STAGE}/archive.tar" "${ENCRYPTED_FILE}"

echo "[Restore] Extracting archive..."
tar -xvf "${TEMP_STAGE}/archive.tar" -C "${TEMP_STAGE}"

# 1. Restore Database Dump
if [ -f "${TEMP_STAGE}/db_dump.sql" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "[Restore] Restoring database schema and data..."
  psql "${DATABASE_URL}" < "${TEMP_STAGE}/db_dump.sql"
fi

# 2. Restore Upload Vault Files
if [ -d "${TEMP_STAGE}/uploads" ]; then
  echo "[Restore] Restoring upload vault files to ${UPLOADS_DIR}..."
  mkdir -p "${UPLOADS_DIR}"
  cp -r "${TEMP_STAGE}/uploads/"* "${UPLOADS_DIR}/"
fi

echo "[Restore Success] Recovery process completed successfully."
