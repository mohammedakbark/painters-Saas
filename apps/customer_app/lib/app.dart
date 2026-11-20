import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'src/routing/router.dart';

/// Root widget of the Customer App (painters and normal customers).
class CustomerApp extends ConsumerWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: AppBrand.customerAppName,
      theme: AppTheme.light(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

/// Shown instead of the app when the build-time configuration is invalid.
class ConfigErrorApp extends StatelessWidget {
  const ConfigErrorApp({super.key, required this.problems});

  final List<String> problems;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppBrand.customerAppName,
      theme: AppTheme.light(),
      home: AppPlainScaffold(
        body: MessageView(
          icon: Icons.settings_outlined,
          title: 'The app is not configured',
          message:
              '${problems.join(' ')} Build with '
              '--dart-define-from-file=config/local.json.',
        ),
      ),
    );
  }
}
