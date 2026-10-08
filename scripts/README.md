# Scripts directory

The handoff includes **no executable application or cloud credentials**. Codex should generate the application, `package.json` scripts and tests in the target repository according to the PRD, then record the verified commands in `IMPLEMENTATION_STATUS.md`.

Expected build workflow after scaffold:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not invent execution results or deploy without explicit owner permission.
