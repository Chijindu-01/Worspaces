# Firestore Security Specification and TDD Scenarios

This document specifies the security requirements, data invariants, and adversarial test scenarios ("The Dirty Dozen") mapped against our Firestore rulesets.

## 1. Data Invariants & Authorization Rules

*   **Identities & Profiles (`staffMembers`)**:
    *   Any signed-in user can read developer staff profiles (which represent the collective simulator directory).
    *   Only authorized profiles can update notification configurations.
    *   No profile can elevate their own `roleType` to `admin` if they are not already an admin (privilege escalation guard).
*   **Directives (`tasks`)**:
    *   Tasks marked of `'personal'` category or set with `isPrivate: true` must be strictly restricted: the `assigneeId` is the *only* user who can read or write that task document.
    *   General work tasks are readable by the team.
    *   The `createdAt` field must be immutable once written.
    *   Modifications of task status can be updated by the assignee.
*   **Standups & Schedules (`meetings`)**:
    *   Meetings represent team alignment sessions, readable by all authenticated members.
    *   Only administrators or project managers can delete or update critical standup schedules.
*   **Visulas & Analytics (`goals`)**:
    *   Goal milestones are visible to all members.
    *   Only administrative or owner roles are permitted to update goal progress bounds.
*   **Reminders (`reminders`)**:
    *   Reminders are personal items or automated workspace escalations. Users can read or write them within proper bounds.
*   **Historically Protected Activity (`auditLogs`)**:
    *   Audit logs are strict *append-only* records. No user is ever allowed to update, modify, or delete a log document once created. This preserves compliance integrity.

---

## 2. The "Dirty Dozen" Adversarial Payloads

We define 12 malicious payloads designed to test boundaries and get cleanly rejected by the firestore engine with `PERMISSION_DENIED`:

### P01: Identity Spoofing / Profile Hijacking
A client tries to write standard profile attributes on behalf of another user ID.
```json
// Path: /staffMembers/staff-1
// Request user: auth.uid = "staff-3"
{
  "name": "Sarah Chen",
  "email": "malicious-admin@attack.com",
  "roleType": "admin"
}
```

### P02: Privilege Escalation
A standard staff member tries to update their own `roleType` to `admin`.
```json
// Path: /staffMembers/staff-3
// Request user: auth.uid = "staff-3"
{
  "roleType": "admin"
}
```

### P03: Task PII Leak
Unauthenticated users or unrelated players attempt to read private/personal tasks.
```json
// Path: /tasks/private-dentist-checkup
// Query/Get by user staff-2 when task assignee is staff-1 and isPrivate = true
```

### P04: Ghost Fields Insertion (Shadow Update)
Attempt to insert unsafe custom attributes (e.g. `isVerified: true`) on tasks inside high-trust collections.
```json
// Path: /tasks/task-1
{
  "title": "Redesign UI dashboard",
  "ghostField": "malicious_injection",
  "isVerified": true
}
```

### P05: Overwriting Historic Auditing Logs
Malicious entity attempts to update or erase an append-only audit record.
```json
// Path: /auditLogs/log-1
{
  "details": "Deleted trace of database exfiltration"
}
```

### P06: Resource Poisoning via Document ID Injection
Injecting massive, malicious strings as document IDs (e.g. >128 chars / special sequences) to corrupt path resolution.
```json
// Path: /tasks/<10,000 characters of junk payload>
```

### P07: Bypassing Server Time Checks
Providing fake historical or post-dated timestamps from client machines.
```json
// Path: /tasks/task-99
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```

### P08: Negative Boundary Progress Injection
Setting progress fields to negative values or numbers exceeding 100% boundary.
```json
// Path: /goals/goal-1
{
  "progress": -500
}
```

### P09: Deleting Active Workspace Profiles
Attempt to delete a critical staff profile to cause systemic orphaned references.
```json
// Path: /staffMembers/staff-1
// Request delete from client
```

### P10: Bypassing Relational Verification
Creating a task document reference with a non-existent goal ID.
```json
// Path: /tasks/task-new
{
  "goalId": "invalid-none-such-id-99"
}
```

### P11: Modifying Immutable Initial Fields
Attempting to change `createdAt` variable values during execution.
```json
// Path: /tasks/task-1
{
  "createdAt": "2050-12-31T23:59:59Z"
}
```

### P12: Overwriting Closed/Completed Milestone Goals
Attempting to slide progress indicators of already closed milestones.
```json
// Path: /goals/goal-3 (A completed milestone)
{
  "status": "completed",
  "progress": 50
}
```
