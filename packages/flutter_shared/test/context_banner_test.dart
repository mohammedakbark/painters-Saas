import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('AppContextBanner names the context and runs its action', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: AppContextBanner(
            caption: 'Shopping from',
            title: 'ABC Paints',
            actionLabel: 'Change',
            onTap: () => taps++,
          ),
        ),
      ),
    );

    expect(find.text('ABC Paints'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Shopping from ABC Paints. Change'),
      findsOneWidget,
    );
    await tester.tap(find.text('Change'));
    expect(taps, 1);
  });
}
