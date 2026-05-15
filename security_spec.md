# Security Specification: AutoRed Seguridad Coquimbo

## 1. Data Invariants
- A **User** profile must exist for any authenticated user before they can interact with the system (except for creating their own profile).
- An **Incident** must be associated with a valid `reporterId` (the user's UID) and a `dealershipId`.
- An **Alert** must be linked to an existing `Incident`.
- Incident `status` transitions are restricted: Only Admins or the reporter can change status, and once it's `RESOLVED` or `FALSE_ALARM`, it might be locked (or restricted).
- Users cannot change their own `role`.
- `createdAt` and `reporterId` fields are immutable after creation.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Create an incident with `reporterId: "someone_else_uid"`.
2. **Privilege Escalation**: Update own user profile with `role: "ADMIN"`.
3. **Data Poisoning**: Create an incident with a 1MB string in the `description`.
4. **ID Injection**: Create an incident with a document ID containing special characters or path traversals: `../../secrets`.
5. **Orphaned Writes**: Create an alert for a non-existent `incidentId`.
6. **Immutable Field Tampering**: Update an incident and change the `reporterId`.
7. **State Shortcut**: Resolve an incident that wasn't previously open or by a user who isn't security/admin.
8. **Shadow Field Injection**: Create a user profile with an undocumented field `isSuperAdmin: true`.
9. **Relational Sync Break**: Create a dealership that references an `ownerId` of a user who doesn't exist.
10. **Time Spoofing**: Provide a `createdAt` in the future or past from the client.
11. **Boundary Breach**: Create an incident with coordinates outside the Coquimbo region coordinates (if enforced).
12. **Anonymous Scraping**: Attempt to list all `users` without being authenticated or as a standard user.

## 3. Security Rules Draft (DRAFT_firestore.rules)
Wait for Phase 4 to finalize.
