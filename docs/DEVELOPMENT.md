# Development and validation

The browser runtime uses HTML, CSS, JavaScript, Canvas 2D, Web Audio and local storage. It has no external runtime library or AI-service dependency.

## Local source edition

Run `python -m http.server 8000` from the repository root and open `http://localhost:8000/`. The offline edition is `LUNARIS-Play.html`.

## Builds

`python tools/build_standalone.py` creates the offline HTML. `python tools/prepare_static.py` creates a self-contained production entry in `dist/`, with fingerprinted assets for the module edition.

## Checks

- `node tests/boot.test.cjs`
- `node tests/v6-challenges.test.cjs`
- `python tests/build_assets_test.py`
- `python tools/validate_repo.py`

The test suite also covers story rules, hazards, navigation, mission completion, resource constraints and mobile controls. GitHub Actions runs the model and build checks on each push. `.prettierrc.json` defines source formatting.
