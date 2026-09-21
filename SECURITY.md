# Security

This release runs local experiments and is designed for a single trusted user on loopback. Do not expose the API directly to the internet or a shared network.

The browser can request only registered experiments and bounded presets. Source files are allowlisted; writes require a local session token and trusted browser origin. Python runs in an isolated environment and process group, but this is **not** a general-purpose untrusted-code sandbox.

Keep API keys in the ignored `.env` file. Database records and Tutor conversations stay in the local data directory and must not be included in issues or release artifacts.

Report vulnerabilities using the repository's private vulnerability reporting feature if available. Do not post credentials, exploit payloads against live deployments, or private learner data in public issues.
