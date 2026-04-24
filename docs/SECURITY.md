# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 4.x.x   | :white_check_mark: |
| 3.x.x   | :warning: Critical fixes only |
| < 3.0   | :x:                |

## Reporting a Vulnerability

We take the security of KaizerIDE seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub Security Advisories:
- https://github.com/randheimer/KaizerIDE/security/advisories/new

### What to Include

Please include the following information in your report:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: We will acknowledge your report within 48 hours
- **Status Updates**: We will send you regular updates about our progress every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days

### What to Expect

If we accept your vulnerability report:
- We will work with you to understand and resolve the issue
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We will notify you when the vulnerability is fixed

If we decline your vulnerability report:
- We will explain why we don't consider it a security issue
- We may suggest alternative ways to address your concern

## Security Best Practices

When using KaizerIDE:
- Keep your installation up to date
- Only open projects from trusted sources
- Be cautious when installing third-party extensions
- Review code before executing terminal commands suggested by AI
- Use the latest version of Electron for security patches

## Known Security Considerations

- **AI Integration**: The IDE connects to AI endpoints. Ensure you trust the endpoint you configure
- **Terminal Access**: The integrated terminal has access to your system. Be careful with commands
- **File System Access**: The IDE can read and write files in your workspace directory

## Disclosure Policy

When we receive a security bug report, we will:
1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.
