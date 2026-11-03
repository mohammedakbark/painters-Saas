# flutter_shared

Design tokens and the Material 3 theme shared by `apps/customer_app` and
`apps/shop_app`. Only genuinely reusable Flutter code belongs here. App-specific
widgets stay in each app.

## Contents

- `AppColors`, `AppSpacing`, `AppRadius`, `AppTypography`: tokens from
  `docs/DESIGN_SYSTEM.md` (provisional). The web copy is
  `apps/admin_web/src/app/globals.css`; change both together.
- `AppTheme.light()`: `ThemeData` built only from the tokens.
- `fonts/`: Inter 4.1 static weights 400/500/600/700, licensed under the SIL Open
  Font License 1.1 (`fonts/OFL.txt`).

## Usage

```dart
import 'package:flutter_shared/flutter_shared.dart';

MaterialApp(theme: AppTheme.light(), home: ...);
```

## Checks (from the repo root)

```sh
fvm dart format --set-exit-if-changed packages/flutter_shared
fvm flutter analyze
cd packages/flutter_shared && fvm flutter test
```

The tests check that token values reach the theme, that only token text sizes are
used, and that documented text/background pairs meet WCAG AA contrast (4.5:1).
