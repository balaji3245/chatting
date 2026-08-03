# Disaster Recovery & System Restoration Guide

This document outlines the step-by-step procedure for restoring the Private Two-Person Real-Time Chat Application from encrypted GPG backups.

---

## 1. Prerequisites

- GPG (`gnupg`) installed on target server
- PostgreSQL database provisioned & accessible via `DATABASE_URL`
- Encryption passphrase set in `GPG_PASSPHRASE` environment variable

---

## 2. Automated Restoration Procedure

Execute the `scripts/restore.sh` script passing the target `.gpg` backup file:

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/chatdb"
export GPG_PASSPHRASE="YourSecretPassphrase"
export UPLOAD_DIR="./uploads"

chmod +x scripts/restore.sh
./scripts/restore.sh /path/to/private_chat_backup_YYYYMMDD_HHMMSS.tar.gpg
```

---

## 3. Manual Restoration Steps

If executing manually:

### A. Decrypt the GPG Archive
```bash
gpg --decrypt --passphrase "YourSecretPassphrase" backup.tar.gpg > backup.tar
```

### B. Extract Archive Contents
```bash
mkdir -p /tmp/restore_stage
tar -xvf backup.tar -C /tmp/restore_stage
```

### C. Restore Database
```bash
psql "$DATABASE_URL" < /tmp/restore_stage/db_dump.sql
```

### D. Restore Private Media Vault
```bash
cp -r /tmp/restore_stage/uploads/* ./uploads/
```

---

## 4. Verification

1. Start server: `npm run dev` or `npm start`.
2. Access login page `/login`.
3. Verify session logins for `user1` and `user2`.
4. Confirm message history and attachment access (`/api/media/...`).
