import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../routing/paths.dart';

/// The first screen when signed out: the brand and one way in (CUS-001).
/// There is no guest browsing (question 59).
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return AppPlainScaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: AppLayout.formMaxWidth,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  const Center(child: LogoMark(height: 96)),
                  const SizedBox(height: AppSpacing.s24),
                  Semantics(
                    header: true,
                    child: Text(
                      AppBrand.productName,
                      textAlign: TextAlign.center,
                      style: textTheme.displaySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s12),
                  Text(
                    'Shop. Painter. Customer. Connected.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Order paint from the shops you trust, for your home or '
                    'for every site you work on.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s24),
                  AppButton(
                    label: 'Get started',
                    icon: Icons.arrow_forward,
                    expand: true,
                    onPressed: () => context.go(signInPath),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
