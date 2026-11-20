import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() => AppPalette.use(AppPalette.standard));

  test('the standard palette is used until an app picks one', () {
    expect(AppPalette.current, same(AppPalette.standard));
    expect(AppColors.brandPrimary, const Color(0xFF0F6B66));
    expect(AppTypography.fontFamily, 'Inter');
  });

  test('the Customer App palette restyles tokens and the theme', () {
    AppPalette.use(AppPalette.customerApp);

    expect(AppColors.brandPrimary, const Color(0xFF1452E0));
    expect(AppColors.textPrimary, const Color(0xFF0B1B3F));
    expect(AppComponentTokens.buttonRadius, AppRadius.medium);
    expect(AppComponentTokens.bottomNavActive, AppColors.brandPrimary);

    final theme = AppTheme.light();
    expect(theme.colorScheme.primary, const Color(0xFF1452E0));
    expect(
      theme.textTheme.bodyMedium?.fontFamily,
      'packages/flutter_shared/Plus Jakarta Sans',
    );
  });

  test('status colours stay the same in every palette', () {
    for (final palette in AppPalette.values) {
      expect(palette.statusSuccess, AppPalette.standard.statusSuccess);
      expect(palette.statusError, AppPalette.standard.statusError);
    }
  });

  testWidgets('the logo keeps its SevenPalette colours in every palette', (
    tester,
  ) async {
    AppPalette.use(AppPalette.customerApp);
    await tester.pumpWidget(
      const MaterialApp(home: BrandMark(appName: 'Customer App')),
    );
    final word = tester.widget<RichText>(find.byType(RichText).first);
    final colours = <Color?>{};
    word.text.visitChildren((span) {
      colours.add(span.style?.color);
      return true;
    });
    expect(colours, contains(AppPalette.standard.brandPrimary));
  });
}
