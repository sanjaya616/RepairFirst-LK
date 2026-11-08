# RepairFirst LK - Security Specification & Rules Architecture

## 1. Data Invariants
1. **User Identity Boundary**: A user can only create, read, update, and delete their own user profile, registered devices, assessments, and repair vs replacement decisions (`users/{userId}/**`).
2. **Immutable Identity**: `userId` fields inside subcollections (`devices`, `assessments`, `decisions`) and `feedback` documents must strictly match `request.auth.uid`.
3. **Admin Privilege Isolation**: Ordinary users cannot grant themselves `admin` role or modify `role` field. Only users present in the `/admins/$(request.auth.uid)` document or matching the bootstrapped admin email `sanjayalasnan327@gmail.com` with `email_verified == true` can access administrative routes or modify `/providers` records.
4. **Public Read & Protected Mutation on Providers**: Repair providers can be read by public/authenticated users to browse repair services, but can only be created, updated, or deleted by authenticated administrators.
5. **Demonstration Data Transparency**: Demo providers must be flagged (`isDemo: true`) and ordinary users cannot verify or falsify provider records.
6. **Relational Sync**: User assessments and devices must belong to the verified owner.

## 2. The Dirty Dozen Payloads
1. **Payload 1 (Privilege Escalation on User Profile)**: Customer user writes `{ role: "admin" }` to their profile during update or registration. Expected: PERMISSION_DENIED.
2. **Payload 2 (Orphaned Device Creation)**: User `A` creates a device under `users/UserB/devices/dev1`. Expected: PERMISSION_DENIED.
3. **Payload 3 (Spoofed Assessment Owner)**: User `A` submits assessment with `userId: "UserB"`. Expected: PERMISSION_DENIED.
4. **Payload 4 (Unauthenticated Assessment Read)**: Unauthenticated request queries `users/UserA/assessments`. Expected: PERMISSION_DENIED.
5. **Payload 5 (Cross-User Decision Deletion)**: User `A` attempts to delete `users/UserB/decisions/dec1`. Expected: PERMISSION_DENIED.
6. **Payload 6 (Unauthorized Provider Creation)**: Non-admin user posts a new provider to `/providers`. Expected: PERMISSION_DENIED.
7. **Payload 7 (Unauthorized Provider Verification)**: Non-admin user patches provider with `{ verificationStatus: "verified" }`. Expected: PERMISSION_DENIED.
8. **Payload 8 (Admin Collection Tampering)**: Non-admin writes their own UID into `/admins/{uid}`. Expected: PERMISSION_DENIED.
9. **Payload 9 (Feedback Identity Forgery)**: User `A` posts feedback with `userId: "UserB"`. Expected: PERMISSION_DENIED.
10. **Payload 10 (Oversized Payload / Denial-of-Wallet)**: Request attempts to write a 1MB string into `brand` or `problemDescription`. Expected: PERMISSION_DENIED.
11. **Payload 11 (Shadow Field Injection)**: Creating a device with arbitrary inject properties `{ maliciousScript: "<script>", unauthorizedAdminFlag: true }`. Expected: PERMISSION_DENIED.
12. **Payload 12 (Email Spoofing Admin Attack)**: User signs in with unverified email or spoofed claims to access admin operations. Expected: PERMISSION_DENIED.
