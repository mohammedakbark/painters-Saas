import 'package:customer_app/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows the foundation screen with the shared theme', (
    tester,
  ) async {
    await tester.pumpWidget(const CustomerApp());

    expect(find.text('Customer App'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme?.colorScheme.primary, AppColors.brandPrimary);
  });
}
