import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';

/// Root widget of the Customer App (painters and normal customers).
class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppBrand.customerAppName,
      theme: AppTheme.light(),
      home: const _FoundationHome(),
    );
  }
}

/// Temporary foundation screen. Replaced by the first real feature.
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
              const BrandMark(appName: AppBrand.customerAppName),
              const SizedBox(height: AppSpacing.s8),
              Text('Welcome', style: textTheme.headlineLarge),
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
