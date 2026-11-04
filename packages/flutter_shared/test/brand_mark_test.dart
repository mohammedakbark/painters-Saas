import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('BrandMark shows the app name with the product name for '
      'screen readers', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(body: BrandMark(appName: AppBrand.shopAppName)),
      ),
    );

    final text = tester.widget<Text>(find.text(AppBrand.shopAppName));
    expect(text.style?.color, AppColors.brandPrimary);
    expect(
      find.bySemanticsLabel('${AppBrand.productName}, ${AppBrand.shopAppName}'),
      findsOneWidget,
    );
    semantics.dispose();
  });

  test('layout tokens match the web container scale', () {
    // 28rem on the web (max-w-form); generated from tokens.json.
    expect(AppLayout.formMaxWidth, 448);
    expect(AppLayout.mediumBreakpoint, 600);
    expect(AppLayout.desktopBreakpoint, 900);
  });
}
