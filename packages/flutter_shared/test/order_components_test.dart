import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(body: child),
);

void main() {
  group('AppChoiceChips', () {
    testWidgets('shows counts, marks the selection and reports taps', (
      tester,
    ) async {
      final chosen = <String>[];
      await tester.pumpWidget(
        _app(
          AppChoiceChips<String>(
            label: 'Order step',
            value: 'new',
            options: const [
              AppChipOption('new', 'New', count: 3),
              AppChipOption('packing', 'Packing', count: 0),
              AppChipOption('all', 'All'),
            ],
            onChanged: chosen.add,
          ),
        ),
      );

      expect(find.text('3'), findsOneWidget);
      expect(find.bySemanticsLabel('New, 3'), findsOneWidget);
      expect(find.bySemanticsLabel('All'), findsOneWidget);
      expect(
        tester.getSemantics(find.bySemanticsLabel('New, 3')),
        isSemantics(isButton: true, isSelected: true, hasSelectedState: true),
      );

      await tester.tap(find.text('Packing'));
      expect(chosen, ['packing']);
    });

    testWidgets('chips are full touch targets and scroll sideways', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          AppChoiceChips<int>(
            label: 'Step',
            value: 0,
            options: [
              for (var i = 0; i < 8; i++) AppChipOption(i, 'Option $i'),
            ],
            onChanged: (_) {},
          ),
        ),
      );

      expect(tester.takeException(), isNull);
      expect(
        tester.getSize(find.byType(InkWell).first).height,
        greaterThanOrEqualTo(AppSpacing.minTouchTarget),
      );
    });
  });

  group('AppStatTile', () {
    testWidgets('reads as one figure and opens its list', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        _app(AppStatTile(label: 'New', value: '3', onTap: () => taps++)),
      );

      expect(find.bySemanticsLabel('New: 3'), findsOneWidget);
      await tester.tap(find.text('3'));
      expect(taps, 1);
    });
  });
}
