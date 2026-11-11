# Automated validation

The clinic-dev branch runs a GitHub Actions check on each push. The job installs the pinned dependencies, runs the TypeScript compiler in no-emit mode, and creates a production Vite build. The workflow deliberately does not require a committed lockfile yet; once the dependency set is finalized, a lockfile will be added and CI can move to npm ci.

A passing build verifies compilation and bundling only. It does not replace browser testing or physical Android performance measurements.