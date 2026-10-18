# MASTER META-PROMPT: SkillSwap
## Secure, Scalable Peer-to-Peer Student Skill Exchange Platform

Act as a principal software architect, senior full-stack engineer, database architect, cybersecurity engineer, product designer, and UI/UX specialist.

Your task is to design and implement **SkillSwap**, a production-oriented peer-to-peer student skill exchange platform where students can discover one another, send and manage friend requests, exchange skills, schedule learning sessions, and communicate through secure, private chats.

Do not build only a landing page or static prototype. Design a coherent, full-stack application with a maintainable architecture, functional user flows, database persistence, server-side authorization, security controls, tests, and deployment documentation.

If an existing repository is provided, inspect it before changing anything. Preserve useful code, follow its conventions, and avoid unnecessary rewrites. If no stack is specified, use the recommended stack below. State reasonable assumptions and continue without asking unnecessary questions.

---

# 1. PRODUCT VISION

Build a student-focused learning community where every student can teach skills they already possess and learn skills they want to acquire.

Example:
- Student A can teach Python and wants to learn graphic design.
- Student B can teach graphic design and wants to learn Python.
- SkillSwap helps them discover one another, establish a connection, arrange learning sessions, and communicate privately.

The platform must support:
1. Student registration and authentication.
2. Student profiles and skill management.
3. Skill search, discovery, and matching.
4. Friend requests and connection management.
5. Private conversations between authorized users.
6. Secure chat-session creation and joining.
7. Inactivity-based chat locking and expiration.
8. Learning-session scheduling and management.
9. Notifications and unread message counts.
10. Reviews, reporting, blocking, and abuse prevention.
11. Administrative moderation and platform management.
12. Responsive, accessible desktop and mobile interfaces.

Prioritize correctness, security, privacy, and a usable student experience.

# 2. RECOMMENDED TECHNOLOGY STACK

Use these technologies unless an existing project requires compatible alternatives.

Frontend:
- Next.js with TypeScript.
- React and a consistent component system.
- Tailwind CSS.
- Accessible UI components.
- React Hook Form and Zod for form validation.
- TanStack Query where appropriate for server-state management.

Backend:
- NestJS with TypeScript, organized into modular domains.
- REST APIs with OpenAPI documentation.
- Socket.IO or WebSockets for real-time communication.
- Server-side authorization for every protected operation.

Database and infrastructure:
- PostgreSQL as the source of truth.
- Prisma ORM with migrations.
- Redis for rate limiting, ephemeral session state, caching, and Socket.IO coordination when needed.
- S3-compatible object storage for profile images and permitted attachments.
- A background worker and queue for notifications, cleanup, and other asynchronous jobs.
- Docker and Docker Compose for local development.
- Reverse proxy or managed ingress with TLS.
- CI/CD pipeline with automated tests and dependency checks.

Authentication:
- Prefer a mature identity provider or a well-maintained authentication library.
- If authentication is implemented directly, use secure password hashing and a carefully designed session lifecycle.
- Do not invent a custom cryptographic protocol.

Deployment:
- Keep application components stateless where possible.
- Support horizontal scaling of API and WebSocket instances.
- Externalize secrets and configuration.
- Document production infrastructure requirements separately from the local development setup.

Use compatible, currently supported package versions and pin dependencies appropriately.

# 3. SYSTEM ARCHITECTURE

Design a complete architecture containing:

A. Presentation layer
- Student web application.
- Responsive mobile-friendly layouts.
- Administrative interface.
- Accessible forms, navigation, dialogs, notifications, and error states.

B. Application layer
- Authentication and identity.
- User profiles.
- Skills catalog and matching.
- Friend requests and connections.
- Conversations and messages.
- Chat-session lifecycle management.
- Learning-session booking.
- Notifications.
- Reviews and moderation.
- Administrative tools.

C. Infrastructure layer
- PostgreSQL.
- Redis.
- WebSocket gateway.
- Background job queue and worker.
- Object storage.
- Centralized structured logging.
- Metrics, error reporting, and health checks.

D. Security boundaries
- Browser to server over HTTPS.
- WebSocket connections over WSS.
- Authentication at connection establishment.
- Authorization for every conversation subscription and message operation.
- Private network access for internal services where possible.
- Database and cache credentials unavailable to the browser.
- Secrets managed outside source control.

Produce:
1. A system context diagram.
2. A component architecture diagram.
3. A deployment diagram.
4. A chat-message sequence diagram.
5. A friend-request sequence diagram.
6. A chat inactivity and expiration state diagram.

Use Mermaid diagrams and explain the responsibilities and trust boundaries of each component.

Start with a modular monolith rather than unnecessary microservices. Explain which components could be extracted later if scale justifies it.

# 4. UI/UX DESIGN SYSTEM

Create a polished, modern, student-friendly interface.

Visual direction:
- Clean and minimal.
- Professional without feeling corporate.
- Clear typography and consistent spacing.
- Neutral surfaces with one restrained accent color.
- Strong visual hierarchy.
- Subtle transitions and meaningful interaction feedback.
- Mobile-first responsive design.
- WCAG 2.2 AA accessibility target.

Define:
- Color tokens.
- Typography scale.
- Spacing system.
- Border radii.
- Shadows.
- Buttons, inputs, cards, dialogs, badges, tabs, dropdowns, and toast notifications.
- Loading skeletons, empty states, errors, and confirmation dialogs.

Build the following pages:

1. Landing page
   - Platform explanation.
   - How skill exchange works.
   - Featured skills.
   - Registration and sign-in calls to action.

2. Authentication
   - Sign up.
   - Sign in.
   - Email verification.
   - Forgot password and reset password.
   - Session-expiration handling.

3. Onboarding
   - Profile details.
   - Institution and optional academic information.
   - Skills to teach.
   - Skills to learn.
   - Availability and preferred learning format.

4. Dashboard
   - Recommended peers.
   - Incoming friend requests.
   - Upcoming learning sessions.
   - Recent conversations.
   - Notifications and activity summaries.

5. Student discovery
   - Search by name, skill, category, and learning goals.
   - Filters for availability and skill level.
   - Pagination.
   - Student profile cards.

6. Student profile
   - Public profile information.
   - Skills offered and wanted.
   - Experience and availability.
   - Send, cancel, or manage friend requests.
   - Appropriate privacy controls.

7. Friends
   - Accepted connections.
   - Incoming requests.
   - Sent requests.
   - Accept, reject, cancel, and remove connection actions.

8. Messaging
   - Conversation list.
   - Unread counts.
   - Message history.
   - Text composition.
   - Sending and delivery states.
   - Typing indicators and online status, if enabled.
   - Session status and inactivity warnings.
   - Explicit session rejoin or restart flow when permitted.
   - Report and block actions.
   - Clear distinction between an expired chat session and deleted conversation history.

9. Learning sessions
   - Request a session.
   - Accept or decline a booking.
   - Calendar and time-zone handling.
   - Cancellation and rescheduling.
   - Completed and upcoming sessions.

10. Notifications
    - Friend requests.
    - Accepted requests.
    - Messages.
    - Booking changes.
    - Security alerts.

11. Settings
    - Profile privacy.
    - Active login sessions.
    - Sign out from other devices.
    - Password and authentication settings.
    - Notification preferences.
    - Account deletion and data export.

12. Administration
    - User management.
    - Reports and moderation.
    - Abuse and rate-limit monitoring.
    - Audit events.
    - Operational health information.

Provide a page map, reusable component inventory, interaction specifications, and implementation-ready screen designs. Implement the actual interfaces rather than leaving them as descriptions.

# 5. DATABASE DESIGN

Design a normalized PostgreSQL schema with suitable constraints, indexes, foreign keys, and migration files.

Include at least these entities:

- users
- user_profiles
- user_sessions or authentication-provider session references
- skills
- user_skills
- friend_requests
- friendships or an equivalent canonical connection model
- conversations
- conversation_participants
- chat_sessions
- messages
- message_receipts where needed
- learning_sessions
- notifications
- reviews
- user_blocks
- user_reports
- audit_events

Add supporting tables only when justified.

For every table, document:
- Purpose.
- Primary key.
- Foreign keys.
- Important fields.
- Uniqueness and check constraints.
- Indexing strategy.
- Data retention requirements.
- Whether the data is sensitive.

Friend-request requirements:
- A user cannot send a request to themselves.
- Prevent duplicate or conflicting pending requests.
- Prevent unauthorized status changes.
- Define how simultaneous reciprocal requests are handled.
- Allow accepted connections to be represented consistently.
- Make accept, reject, cancel, and remove operations transactional.
- Prevent blocked users from creating new connections or conversations.

Conversation requirements:
- Only authorized participants can access conversation metadata or messages.
- Define whether a conversation is one-to-one or supports groups.
- Prevent duplicate active direct conversations where appropriate.
- Enforce participant membership through database constraints and application transactions.

Message requirements:
- Use server-generated message IDs.
- Store sender, conversation, content or ciphertext, timestamps, and necessary delivery metadata.
- Enforce message-size limits.
- Define edit and deletion semantics.
- Avoid storing plaintext message bodies in logs.
- Define retention and deletion behavior.

Use UTC timestamps in storage and display dates in the user's selected time zone.

Provide:
1. An entity-relationship diagram.
2. A complete Prisma schema.
3. SQL migration examples.
4. Index and query design.
5. Transaction boundaries.
6. Data retention and deletion policies.

Never rely solely on frontend validation or application-level assumptions for integrity that PostgreSQL constraints can enforce.

# 6. AUTHENTICATION, PASSWORD HASHING, AND AUTHORIZATION

Implement a secure identity lifecycle.

Passwords:
- Never store plaintext passwords.
- Use Argon2id through a trusted library if managing passwords directly.
- Configure a suitable password-hashing work factor based on production benchmarking and current guidance.
- Use unique salts generated by the password-hashing library.
- Do not use SHA-256, MD5, or reversible encryption as password storage mechanisms.
- Support password reset using short-lived, single-use, cryptographically random tokens.
- Store only a hash of reset tokens when practical.
- Avoid leaking whether an email address is registered.

Sessions:
- Prefer opaque, high-entropy session identifiers in Secure, HttpOnly, appropriately configured SameSite cookies.
- Avoid persistent bearer tokens in browser localStorage.
- Implement CSRF defenses appropriate to the authentication and cookie model.
- Rotate sessions after login and privilege changes.
- Support revocation, logout, expiration, and logout from all devices.
- Revalidate critical permissions server-side.
- Define idle and absolute authentication-session expiration.
- Do not confuse authentication-session expiration with chat-session expiration.

Authorization:
- Apply deny-by-default authorization.
- Verify resource ownership and participant membership on the server.
- Prevent insecure direct object references (IDOR).
- Enforce role-based permissions for administrative functions.
- Add rate limits for login, signup, password reset, and sensitive actions.
- Use generic errors where detailed responses could enable account enumeration.

Explain and test the distinction between authentication, authorization, password hashing, and encryption.

# 7. PRIVATE CHAT ARCHITECTURE

Implement private one-to-one messaging.

Conversation access:
- A conversation must have an explicit participant list.
- Only participants can read messages, subscribe to the corresponding WebSocket room, or send messages.
- Check membership on every relevant API operation and event.
- Never trust a conversation ID or chat code supplied by the browser.
- Do not authorize access solely because a user possesses a conversation URL.

Chat invitation codes:
- Use cryptographically secure random values.
- Store only a hash of a high-entropy invitation token when practical.
- Scope invitations to a specific conversation and permitted recipient or eligibility rule.
- Apply expiration, use limits, and revocation.
- Make invitation redemption atomic.
- Do not treat a short, guessable code as a substitute for authentication.
- Ensure a code cannot bypass the participant allowlist.
- Do not automatically expose conversations to arbitrary third parties.

Real-time transport:
- Use WSS.
- Authenticate WebSocket connections.
- Validate origin and enforce message-size limits.
- Rate-limit messages and connection attempts.
- Validate event payloads with schemas.
- Authorize conversation subscriptions and sends.
- Use Redis-backed coordination when scaling WebSocket instances.
- Make message submission idempotent where practical.
- Define ordering, reconnection, retry, and duplicate-delivery behavior.
- Persist accepted messages before acknowledging durable delivery.
- Handle disconnects, reconnects, and stale presence safely.

Message storage:
- For the baseline server-readable design, use TLS in transit and managed encryption at rest.
- Do not claim that TLS or disk encryption makes messages end-to-end encrypted.
- Keep message content out of logs, analytics, traces, and error reports.
- Define attachment validation, size limits, access control, and malware-scanning requirements.
- Treat typing indicators and presence as ephemeral data.

# 8. E2EE DECISION: EXPLICITLY DISTINGUISH TWO MODES

Provide an architecture decision record comparing the following approaches.

MODE A — Secure server-readable chat:
- TLS protects data in transit.
- Database and storage encryption protect data at rest.
- The application server can decrypt or read message content.
- This mode is easier to moderate, search, recover, and operate.
- Clearly disclose its privacy limitations.

MODE B — True end-to-end encrypted chat:
- Message encryption and decryption happen on user devices.
- The server stores ciphertext and does not possess the private keys needed to decrypt message content.
- Use an established, audited cryptographic protocol and maintained library.
- Do not invent cryptographic primitives or a custom key-exchange protocol.
- Define identity verification, device keys, key rotation, device enrollment and revocation, multi-device synchronization, recovery limitations, and forward-secrecy considerations.
- Consider a vetted implementation of an established protocol such as the Signal Protocol, subject to current library availability, licensing, and platform compatibility.
- Do not claim E2EE unless the complete message and key-management path actually satisfies the definition.

If implementing E2EE is outside the initial scope, deliver MODE A securely, define a clean future migration path, and label the product accurately. Never present server-readable encrypted chat as E2EE.

Explain how E2EE affects server-side moderation, search, backups, account recovery, notifications, and message retention. Define an abuse-reporting workflow that allows users to voluntarily submit selected decrypted messages for review.

Do not store private encryption keys in plaintext on the backend.

# 9. CHAT INACTIVITY LIMITS AND SESSION LIFECYCLE

Implement a configurable chat-session lifecycle, separate from long-lived conversation history.

Use these initial example settings, configurable through server-side environment or application configuration:

- Inactivity warning: 5 minutes without qualifying activity.
- Inactivity lock: 10 minutes without qualifying activity.
- Absolute chat-session limit: 60 minutes from session start.
- Rejoin window: 15 minutes after inactivity lock, if the conversation remains eligible.
- A new session requires authorization and a valid conversation relationship.

These values are product defaults, not security guarantees.

Define explicit states:
- CREATED
- ACTIVE
- IDLE_WARNING
- LOCKED
- EXPIRED
- CLOSED

State transitions must be enforced by the backend.

Qualifying activity:
- Define whether sending a message, explicit session interaction, or an authenticated user action resets the inactivity deadline.
- Do not let background polling, typing spam, automatic pings, or an unattended open tab keep a session alive indefinitely.
- Presence heartbeats alone must not extend the absolute lifetime.
- Decide whether received messages count as activity; document the decision.
- Use server timestamps, not client-provided timestamps.

Enforcement:
- Store authoritative lifecycle state in PostgreSQL.
- Use Redis for efficient ephemeral coordination where appropriate.
- Use a worker or scheduled queue to process deadlines.
- Enforce expiration during API and WebSocket operations as well as through background jobs.
- Do not rely solely on browser timers.
- Handle concurrent requests and multiple application instances.
- Make state transitions atomic and idempotent.
- Prevent a reconnect from silently reviving an expired session.
- Define what happens to messages already sent when a session expires.
- Keep historical conversation data separate from temporary session access.
- Ensure a locked chat can be reopened only through an explicit, authorized flow.
- Enforce the absolute maximum even if the user remains active.

The UI must show:
- Session status.
- Inactivity warning.
- Time remaining when relevant.
- Clear explanation when a session is locked or expired.
- An explicit rejoin or restart action where permitted.
- A safe reconnection flow without losing acknowledged messages.

Provide test cases for timer boundaries, simultaneous requests, server restarts, reconnects, clock skew, and multi-instance deployment.

# 10. API DESIGN

Define versioned REST endpoints for:

Authentication:
- Registration, login, logout, password reset, account verification, and active sessions.

Profiles and skills:
- Read and update profiles.
- Manage skills.
- Search and filter students.

Friend requests:
- Create request.
- List incoming and outgoing requests.
- Accept or reject.
- Cancel.
- List friends.
- Remove a friend.

Conversations:
- Create or retrieve an authorized direct conversation.
- List conversations.
- Read paginated message history.
- Create, inspect, join, lock, or close chat sessions as permitted.
- Manage invitations if implemented.

Messages:
- Send messages through a defined REST or WebSocket interface.
- Edit or delete messages according to policy.
- Mark messages as read.
- Handle retries and idempotency.

Learning sessions:
- Create, accept, decline, cancel, reschedule, and complete bookings.

Safety:
- Block and unblock users.
- Report users or messages.
- Manage user privacy settings.

For every endpoint, document:
- HTTP method and route.
- Authentication requirement.
- Authorization rule.
- Request and response schemas.
- Validation.
- Status codes and error responses.
- Rate limits.
- Idempotency behavior where relevant.

Use consistent error formats and pagination. Never trust client-provided user IDs as proof of identity.

Document WebSocket event schemas, acknowledgments, authorization, retry behavior, and error handling.

# 11. SCALABILITY AND PERFORMANCE

Design for a gradual growth path from a small student community to a large multi-institution platform.

Address:
- Stateless API replicas.
- Database connection pooling.
- Query optimization and index selection.
- Cursor pagination for message histories.
- Redis caching with explicit invalidation.
- Redis-backed WebSocket adapters where required.
- Background workers for notifications and cleanup.
- Database backups and point-in-time recovery.
- Object storage for attachments.
- Read replicas only when justified.
- Monitoring, tracing, and performance testing.
- Queue retry policies and dead-letter handling.
- Graceful shutdown and health checks.
- Capacity planning and cost trade-offs.

Do not add sharding, Kafka, Kubernetes, or multiple microservices without a concrete requirement. Explain when each becomes justified.

Set measurable initial performance targets, identify the assumptions behind them, and propose load tests for concurrent users, message throughput, reconnect storms, and database contention.

# 12. SECURITY THREAT MODEL

Use OWASP guidance and threat-model the application before production release.

Cover:
- Broken access control and IDOR.
- Account takeover.
- Credential stuffing and brute force.
- XSS and unsafe rendering of messages.
- CSRF.
- SQL injection.
- SSRF where external URL fetching exists.
- WebSocket abuse and cross-site WebSocket hijacking.
- Spam and automated friend requests.
- Invitation-code enumeration.
- Message flooding.
- Malicious attachments.
- Sensitive data in logs.
- Privilege escalation.
- Session fixation and token theft.
- Race conditions.
- Backup exposure.
- Insider access to server-readable messages.
- E2EE key compromise if that mode is implemented.

Apply:
- Input validation and output encoding.
- Least privilege.
- Secure headers and a restrictive Content Security Policy.
- TLS and appropriate HSTS configuration.
- Rate limiting and abuse controls.
- Secret rotation.
- Dependency scanning.
- Audit logging without sensitive message content.
- Encrypted backups and tested recovery.
- Data minimization and deletion workflows.

Do not invent compliance certifications or claim the system is penetration-tested unless that has actually occurred.

# 13. TESTING STRATEGY

Implement:
- Unit tests.
- API integration tests.
- Database constraint tests.
- Authentication and authorization tests.
- Friend-request lifecycle tests.
- WebSocket security tests.
- Chat-session lifecycle tests.
- End-to-end browser tests.
- Accessibility tests.
- Load and stress tests.
- Backup restoration tests where practical.

Required negative tests:
- Nonparticipants cannot access conversation history.
- Nonparticipants cannot subscribe to private chat rooms.
- Forged user IDs cannot impersonate another user.
- Expired or revoked invitations cannot be reused.
- Blocked users cannot create unauthorized connections or conversations.
- Rejected requests cannot be accepted through an unauthorized state transition.
- Inactivity locking is enforced on the server.
- An active connection cannot bypass the absolute session limit.
- Message content never appears in application logs.
- Rate limits work across multiple API instances.
- Concurrent requests do not create duplicate active relationships.

Include reproducible commands and explain any tests that require external services.

# 14. IMPLEMENTATION PHASES

Build the project in the following order.

Phase 1: Foundation
- Repository structure.
- Architecture decisions.
- Design system.
- Environment configuration.
- Database and migrations.
- Authentication and authorization.

Phase 2: Student profiles and discovery
- Onboarding.
- Skill management.
- Search.
- Matching.

Phase 3: Friend requests
- Request lifecycle.
- Accepted connections.
- Notifications.
- Blocking and duplicate prevention.

Phase 4: Messaging
- Conversations.
- Participant authorization.
- Message persistence.
- WebSocket events.
- Reconnection and delivery handling.

Phase 5: Secure chat-session lifecycle
- Inactivity warning.
- Inactivity lock.
- Absolute expiration.
- Rejoin and restart.
- Worker and multi-instance consistency.

Phase 6: Learning sessions
- Booking workflow.
- Availability.
- Reviews and feedback.

Phase 7: Production hardening
- Security testing.
- Accessibility.
- Performance tests.
- Observability.
- Backups.
- Deployment documentation.

After each phase, run relevant tests, fix regressions, and report what is complete versus what remains.

# 15. REQUIRED DELIVERABLES

Produce the following, in order:

1. Assumptions and requirements.
2. Architecture decision records.
3. Mermaid system and sequence diagrams.
4. Database ER diagram and full schema.
5. API and WebSocket specifications.
6. Security threat model.
7. UI page map and design system.
8. Complete repository and module structure.
9. Working frontend and backend implementation.
10. Database migrations and seed data.
11. Automated tests.
12. Docker development environment.
13. Environment variable example containing placeholders only.
14. OpenAPI documentation.
15. CI workflow.
16. Production deployment guide.
17. Backup, recovery, logging, and monitoring guide.
18. Security checklist.
19. Performance and load-testing plan.
20. README with exact setup, migration, test, and run commands.

Do not expose actual secrets in example files. Include `.env.example`, not real credentials.

# 16. EXECUTION RULES

- Begin by examining the existing repository and available tools.
- If working in an empty project, establish a clear monorepo or equivalent structure.
- Explain important architectural decisions briefly before implementing them.
- Prioritize a functioning vertical slice over large amounts of disconnected boilerplate.
- Use strict TypeScript and meaningful types.
- Validate inputs on the server.
- Keep authorization logic centralized and testable.
- Use database transactions for multi-step state changes.
- Avoid fake functionality, hardcoded authentication, and placeholder API success responses.
- Do not silently omit requested security features.
- Clearly identify features that are designed but not implemented.
- Do not claim E2EE, production readiness, scalability, or security guarantees without evidence.
- Do not place private keys, credentials, or sensitive tokens in frontend code.
- Include useful loading, error, empty, and success states.
- Make the interface usable on mobile devices and with a keyboard.
- Keep business logic out of presentation components.
- Provide complete, runnable files rather than isolated fragments whenever implementation is requested.
- If the full scope exceeds one execution, complete the highest-priority phase, verify it, summarize progress, and continue with the next phase rather than pretending everything is finished.

Start now by inspecting the repository, stating the assumptions, creating the architecture and implementation plan, and then building the first fully functional vertical slice of SkillSwap.