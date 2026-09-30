# KDI Notification Policy & Quiet Hours

## 1. Multi-Channel Abstraction
Notifications are abstracted across delivery channels:
- `WEB`: Real-time dashboard toasts and telemetry alerts.
- `EMAIL`: Asynchronous briefings and weekly reports.
- `MESSAGING`: Immediate team chat webhooks.
- `PUSH`: Mobile/browser push notifications.

## 2. Quiet Hours Protocol
- **Default Window**: 22:00 to 07:00 (Asia/Jakarta timezone).
- **Suppression**: Low and medium priority notifications are queued until quiet hours expire.
- **Exceptions**: `CRITICAL` risk alerts, active production outages, and direct human approval requests immediately bypass quiet hours.

## 3. Deduplication
Identical notifications sharing a `deduplicationKey` are throttled within a 5-minute sliding window to prevent alert fatigue.
