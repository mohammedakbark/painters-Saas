import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/app.dart';

void main() {
  testWidgets('shows the foundation screen with the shared theme', (
    tester,
  ) async {
    await tester.pumpWidget(const ShopApp());

    expect(find.text('Shop App'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme?.colorScheme.primary, AppColors.brandPrimary);
  });
}
