import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../providers.dart';

/// Home (CUS-001): a greeting until shops arrive with CUS-002 and CUS-003.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(customerProfileProvider).value?.displayName;
    return AppScaffold(
      title: name == null ? 'Home' : 'Hello, ${_firstName(name)}',
      subtitle: AppBrand.productName,
      body: const MessageView(
        icon: Icons.storefront_outlined,
        title: 'No shops yet',
        message:
            "You'll find paint shops near you here and shop from the one "
            'you choose.',
      ),
    );
  }
}

/// Orders (CUS-001): empty until ordering comes to the Customer App.
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) => const AppScaffold(
    title: 'Orders',
    body: MessageView(
      icon: Icons.receipt_long_outlined,
      title: 'No orders yet',
      message: 'Orders you place with a shop will appear here.',
    ),
  );
}

/// My Shops (CUS-001): empty until CUS-002.
class MyShopsScreen extends StatelessWidget {
  const MyShopsScreen({super.key});

  @override
  Widget build(BuildContext context) => const AppScaffold(
    title: 'My Shops',
    body: MessageView(
      icon: Icons.storefront_outlined,
      title: 'No shops added',
      message: 'Shops you add will appear here, so you can go back to them.',
    ),
  );
}

/// Sites, painters only (CUS-001): empty until the sites feature.
class SitesScreen extends StatelessWidget {
  const SitesScreen({super.key});

  @override
  Widget build(BuildContext context) => const AppScaffold(
    title: 'Sites',
    body: MessageView(
      icon: Icons.location_on_outlined,
      title: 'No sites yet',
      message: 'The sites you work on will appear here.',
    ),
  );
}

String _firstName(String name) => name.trim().split(RegExp(r'\s+')).first;
