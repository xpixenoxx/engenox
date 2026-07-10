# lint-fixtures — the deliberately-forbidden negative tests

> These files are **intentionally wrong**. They exist only to prove the boundary lints
> FIRE — a configured lint that never trips is untested (`24` §4). `tools/check-lint-fires`
> scans each fixture through its lint and asserts a **violation is caught**.
>
> **Do not** fix these files. **Do not** import from them. They are excluded from the real
> dependency-cruiser scan (`.dependency-cruiser.cjs` `exclude: tools/.*`) and from every
> compiler config. They are the negative corpus, nothing more (`23` testing strategy).
