import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';

/// Root widget of the Shop App (shop owners and staff).
class ShopApp extends StatelessWidget {
  const ShopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Shop App',
      theme: AppTheme.light(),
      home: const _FoundationHome(),
    );
  }
}

/// Temporary foundation screen. Replaced by the login shell feature.
class _FoundationHome extends StatelessWidget {
  const _FoundationHome();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Shop App', style: textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.s8),
              Text(
                'Foundation build. No features are available yet.',
                style: textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
