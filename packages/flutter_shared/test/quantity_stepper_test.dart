import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pump(WidgetTester tester, Widget child) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: Center(child: child)),
  ),
);

void main() {
  testWidgets('AppQuantityStepper adds and removes within its limits', (
    tester,
  ) async {
    var value = 1;
    Future<void> build() => _pump(
      tester,
      StatefulBuilder(
        builder: (context, setState) => AppQuantityStepper(
          value: value,
          max: 3,
          onChanged: (next) => setState(() => value = next),
        ),
      ),
    );
    await build();

    IconButton button(String key) =>
        tester.widget<IconButton>(find.byKey(Key(key)));
    expect(button('quantity-minus').onPressed, isNull);

    await tester.tap(find.byKey(const Key('quantity-plus')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('quantity-plus')));
    await tester.pump();
    expect(value, 3);
    expect(find.text('3'), findsOneWidget);
    expect(button('quantity-plus').onPressed, isNull);

    await tester.tap(find.byKey(const Key('quantity-minus')));
    await tester.pump();
    expect(value, 2);
  });

  testWidgets('AppQuantityStepper is one adjustable value for screen readers', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await _pump(
      tester,
      AppQuantityStepper(label: 'Tins', value: 2, onChanged: (_) {}),
    );
    expect(
      tester.getSemantics(find.byType(AppQuantityStepper)),
      matchesSemantics(
        label: 'Tins',
        value: '2',
        increasedValue: '3',
        decreasedValue: '1',
        hasIncreaseAction: true,
        hasDecreaseAction: true,
      ),
    );
    handle.dispose();
  });

  testWidgets('a disabled AppQuantityStepper cannot change', (tester) async {
    await _pump(tester, const AppQuantityStepper(value: 2, onChanged: null));
    expect(
      tester
          .widget<IconButton>(find.byKey(const Key('quantity-plus')))
          .onPressed,
      isNull,
    );
  });

  testWidgets('AppIconButton shows a count and says it', (tester) async {
    await _pump(
      tester,
      AppIconButton(
        icon: Icons.shopping_cart_outlined,
        tooltip: 'Cart',
        count: 3,
        onPressed: () {},
      ),
    );
    expect(find.text('3'), findsOneWidget);
    expect(find.byTooltip('Cart, 3'), findsOneWidget);

    await _pump(
      tester,
      AppIconButton(
        icon: Icons.shopping_cart_outlined,
        tooltip: 'Cart',
        count: 0,
        onPressed: () {},
      ),
    );
    expect(find.byTooltip('Cart'), findsOneWidget);
  });
}
