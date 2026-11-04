import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('LoadingView shows a spinner and a message', (tester) async {
    await tester.pumpWidget(
      _host(const LoadingView(message: 'Loading shops…')),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Loading shops…'), findsOneWidget);
  });

  testWidgets('MessageView shows title, message and action', (tester) async {
    await tester.pumpWidget(
      _host(
        MessageView(
          title: 'No shops yet',
          message: 'Register on the web portal.',
          action: AppButton(label: 'Sign out', onPressed: () {}),
        ),
      ),
    );

    expect(find.text('No shops yet'), findsOneWidget);
    expect(find.text('Register on the web portal.'), findsOneWidget);
    expect(find.widgetWithText(AppButton, 'Sign out'), findsOneWidget);
  });

  testWidgets('ErrorView calls onRetry', (tester) async {
    var retries = 0;
    await tester.pumpWidget(_host(ErrorView(onRetry: () => retries++)));

    await tester.tap(find.widgetWithText(AppButton, 'Try again'));

    expect(retries, 1);
    expect(find.text('Something went wrong'), findsOneWidget);
  });
}
