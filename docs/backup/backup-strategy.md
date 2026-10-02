# Backup Strategy & Encryption — KDI AI Office

## 1. Storage Location Policy
- Primary backups are placed on `D:\kdi-backups` (secondary volume with ~250 GB headroom).
- **Prohibition**: Writing database backups to drive `C:\` is strictly forbidden to prevent operating system failure from disk exhaustion.
- Encrypted copies are staged in `D:\kdi-offsite-vault` for offsite sync.

## 2. Authenticated Encryption at Rest
- Cipher: AES-256-GCM
- Key Derivation: PBKDF2 (SHA-256, 100,000 rounds)
- Initialization Vector: Cryptographically secure random 16 bytes
- Integrity: GCM Authentication Tag + SHA-256 Checksum on the envelope.

## 3. Retention Tiers
- **Daily**: Retained for 7 days.
- **Weekly**: Retained for 4 weeks.
- **Monthly**: Retained for 12 months.
Expired backup files are unlinked automatically by the `BackupService`.
