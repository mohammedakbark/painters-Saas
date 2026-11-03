import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_spacing.dart';

/// Full-area loading state with a visible message (not just a spinner).
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message = 'Loading…'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Semantics(
          liveRegion: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: AppSpacing.s16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge
                    ?.copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Centred title, explanation and optional action, for empty, access and
/// error states. The title states the situation in words; colour is never the
/// only signal.
class MessageView extends StatelessWidget {
  const MessageView({
    super.key,
    required this.title,
    this.message,
    this.action,
    this.icon,
  });

  final String title;
  final String? message;
  final Widget? action;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: AppSpacing.s48, color: AppColors.textSecondary),
              const SizedBox(height: AppSpacing.s16),
            ],
            Semantics(
              header: true,
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: textTheme.titleLarge,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.s8),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: AppSpacing.s24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Error state with a retry button.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    this.title = 'Something went wrong',
    this.message = 'The service may be temporarily unavailable. Try again.',
    required this.onRetry,
  });

  final String title;
  final String? message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return MessageView(
      icon: Icons.error_outline,
      title: title,
      message: message,
      action: OutlinedButton(
        onPressed: onRetry,
        child: const Text('Try again'),
      ),
    );
  }
}
