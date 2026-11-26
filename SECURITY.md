# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `0.2.x` (`main`) | Yes |
| `< 0.2.0` | No — please upgrade |

## Security Architecture

OpenLiate is built with strict secret hygiene:
- **Zero hardcoded API keys or model defaults** in source files.
- **Layer `[E]` Sandbox Guardrails** (`EnvironmentResolver.maskSecret`, `assertNetworkAllowed`, `runWithTimeout`).
- Environment variables use `$VAR` symbolic references in `agent.json` and `E` definitions.

## Reporting a Vulnerability

Please **do not** open a public GitHub Issue for security vulnerabilities, exposed credentials, or sandbox bypasses.

Instead, report privately via:
- **GitHub Security Advisories**: https://github.com/OpenLiate/Liate/security/advisories/new
- Or reach out to the **OpenLiate** organization maintainers via https://github.com/OpenLiate.

Please include:
1. A clear description of the vulnerability and affected file/layer (`L`, `I`, `A`, `T`, `E`, CLI, Runtime, or Python SDK).
2. Minimal reproduction steps or proof of concept.
3. Any suggested remediation if known.

We aim to acknowledge reports within **48 hours** and coordinate a fix before public disclosure.
