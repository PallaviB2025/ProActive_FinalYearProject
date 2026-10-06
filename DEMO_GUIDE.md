# ProActive demo guide

## Start

Run `powershell -ExecutionPolicy Bypass -File .\START_PROACTIVE.ps1`, then open `http://localhost:3000`.

## Suggested walkthrough

1. Register with a disposable demo email and a 12+ character login password.
2. Log in, then create a separate 12+ character Master Password and initialize the vault.
3. Add two demo credentials, including a deliberately reused synthetic password.
4. Run the local security audit and review password health and recommended actions.
5. Demonstrate reveal, copy, search, edit, and delete.
6. Lock the vault and show that decrypted credentials disappear.
7. Unlock again, then log out and show that the session cookie is removed.

Never enter a real password during a demonstration. Stop everything with `powershell -ExecutionPolicy Bypass -File .\STOP_PROACTIVE.ps1`.

For CSV demonstration, import a small UTF-8 CSV with `url,username,password` headers and synthetic rows. Review valid/invalid/duplicate counts before importing, then run the audit. Delete the plaintext export afterward. The final audit screenshots use synthetic data and mocked HIBP responses, not evidence of a live breach check.
