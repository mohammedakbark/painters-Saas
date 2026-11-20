import 'dart:async';

import 'package:flutter_shared/flutter_shared.dart';

/// Every Customer App test runs with the app's palette, as `main()` does.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  AppPalette.use(AppPalette.customerApp);
  await testMain();
}
