import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers.dart';

/// Ends the session on this device. The router then shows the sign-in screen.
class SignOutButton extends ConsumerWidget {
  const SignOutButton({super.key, this.filled = false});

  /// A prominent button (for empty and access states) instead of an app-bar action.
  final bool filled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void signOut() => ref.read(authRepositoryProvider).signOut();
    return filled
        ? FilledButton(onPressed: signOut, child: const Text('Sign out'))
        : TextButton(onPressed: signOut, child: const Text('Sign out'));
  }
}
