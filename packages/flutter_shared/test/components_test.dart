import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(
    body: Padding(padding: const EdgeInsets.all(AppSpacing.s16), child: child),
  ),
);

/// Opens an overlay from a real button so it has a Navigator context.
Widget _launcher(void Function(BuildContext context) open) => _host(
  Builder(
    builder: (context) =>
        AppButton(label: 'Open', onPressed: () => open(context)),
  ),
);

void main() {
  group('AppButton', () {
    testWidgets('meets the touch-target height and calls onPressed', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(AppButton(label: 'Save', onPressed: () => taps++)),
      );

      final size = tester.getSize(find.byType(AppButton));
      expect(size.height, greaterThanOrEqualTo(AppSpacing.minTouchTarget));
      await tester.tap(find.text('Save'));
      expect(taps, 1);
    });

    testWidgets('loading shows the loading label and ignores taps', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(
          AppButton(
            label: 'Save',
            loadingLabel: 'Saving…',
            loading: true,
            onPressed: () => taps++,
          ),
        ),
      );

      expect(find.text('Saving…'), findsOneWidget);
      expect(find.byType(AppSpinner), findsOneWidget);
      await tester.tap(find.byType(AppButton), warnIfMissed: false);
      expect(taps, 0);
    });

    testWidgets('labels use the theme font (Inter), not the platform font', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          Column(
            children: [
              AppButton(label: 'Save', onPressed: () {}),
              AppSegmentedControl<int>(
                value: 1,
                options: const [AppOption(1, 'Active'), AppOption(2, 'Old')],
                onChanged: (_) {},
              ),
            ],
          ),
        ),
      );

      for (final label in ['Save', 'Active']) {
        final paragraph = tester.renderObject<RenderParagraph>(
          find.text(label),
        );
        expect(
          paragraph.text.style?.fontFamily,
          contains(AppTypography.fontFamily),
          reason: label,
        );
      }
    });

    testWidgets('colours come from the component tokens', (tester) async {
      await tester.pumpWidget(
        _host(
          Column(
            children: [
              AppButton(label: 'Primary', onPressed: () {}),
              AppButton(
                label: 'Remove',
                variant: AppButtonVariant.destructive,
                onPressed: () {},
              ),
            ],
          ),
        ),
      );

      Color? background(String label) => tester
          .widget<TextButton>(find.widgetWithText(TextButton, label))
          .style
          ?.backgroundColor
          ?.resolve({});
      expect(background('Primary'), AppComponentTokens.buttonPrimaryBackground);
      expect(
        background('Remove'),
        AppComponentTokens.buttonDestructiveBackground,
      );
    });
  });

  group('AppTextField', () {
    testWidgets('shows the label, prefix and error and limits the length', (
      tester,
    ) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      await tester.pumpWidget(
        _host(
          AppTextField(
            label: 'Price',
            prefixText: '₹ ',
            controller: controller,
            maxLength: 4,
            error: 'Enter the price.',
          ),
        ),
      );

      expect(find.text('Price'), findsOneWidget);
      expect(find.text('Enter the price.'), findsOneWidget);
      await tester.enterText(find.byType(AppTextField), '123456');
      expect(controller.text, '1234');
      final decoration = tester
          .widget<TextField>(find.byType(TextField))
          .decoration!;
      expect(decoration.errorText, 'Enter the price.');
      expect(decoration.prefixText, '₹ ');
    });
  });

  group('AppSearchField', () {
    testWidgets('submits trimmed text and clears with the clear button', (
      tester,
    ) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      final searches = <String>[];
      await tester.pumpWidget(
        _host(
          AppSearchField(
            label: 'Search products',
            controller: controller,
            onSubmitted: searches.add,
          ),
        ),
      );

      await tester.enterText(find.byType(AppSearchField), '  emulsion ');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      await tester.tap(find.byTooltip('Clear search'));
      await tester.pump();

      expect(searches, ['emulsion', '']);
      expect(controller.text, isEmpty);
    });
  });

  group('AppDropdown', () {
    testWidgets('selects an option and shows its error', (tester) async {
      String? chosen;
      await tester.pumpWidget(
        _host(
          AppDropdown<String>(
            label: 'Unit',
            value: 'L',
            options: const [AppOption('L', 'L'), AppOption('ML', 'ml')],
            onChanged: (value) => chosen = value,
            error: 'Choose the unit.',
          ),
        ),
      );

      expect(find.text('Choose the unit.'), findsOneWidget);
      await tester.tap(find.byType(AppDropdown<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('ml').last);
      await tester.pumpAndSettle();

      expect(chosen, 'ML');
    });
  });

  group('choice rows', () {
    testWidgets('a switch row toggles from the whole row and has its label', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      bool? value;
      await tester.pumpWidget(
        _host(
          AppSwitchRow(
            label: '4 L',
            semanticLabel: '4 L available',
            value: false,
            onChanged: (next) => value = next,
          ),
        ),
      );

      expect(find.bySemanticsLabel(RegExp('4 L available')), findsOneWidget);
      await tester.tap(find.text('4 L'));
      expect(value, isTrue);
      handle.dispose();
    });

    testWidgets('a checkbox row reports the new value', (tester) async {
      bool? value;
      await tester.pumpWidget(
        _host(
          AppCheckboxRow(
            label: 'Sell 1 L',
            value: false,
            onChanged: (next) => value = next,
          ),
        ),
      );

      await tester.tap(find.text('Sell 1 L'));
      expect(value, isTrue);
    });

    testWidgets('a radio group selects one option', (tester) async {
      String? chosen;
      await tester.pumpWidget(
        _host(
          AppRadioGroup<String>(
            label: 'Pack size',
            value: null,
            options: const [AppOption('a', '1 L'), AppOption('b', '4 L')],
            onChanged: (value) => chosen = value,
          ),
        ),
      );

      await tester.tap(find.text('4 L'));
      expect(chosen, 'b');
    });

    testWidgets('a segmented control reports the chosen option', (
      tester,
    ) async {
      String? chosen;
      await tester.pumpWidget(
        _host(
          AppSegmentedControl<String>(
            value: 'ACTIVE',
            options: const [
              AppOption('ACTIVE', 'Active'),
              AppOption('ARCHIVED', 'Archived'),
            ],
            onChanged: (value) => chosen = value,
          ),
        ),
      );

      await tester.tap(find.text('Archived'));
      expect(chosen, 'ARCHIVED');
      expect(
        tester.getSize(find.byType(AppSegmentedControl<String>)).height,
        greaterThanOrEqualTo(AppSpacing.minTouchTarget),
      );
    });
  });

  group('surfaces and feedback', () {
    testWidgets('AppCard uses the card tokens and is tappable', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(AppCard(onTap: () => taps++, child: const Text('Products'))),
      );

      final shape =
          tester.widget<Card>(find.byType(Card)).shape!
              as RoundedRectangleBorder;
      expect(
        shape.borderRadius,
        BorderRadius.circular(AppComponentTokens.cardRadius),
      );
      expect(shape.side.color, AppComponentTokens.cardBorder);
      await tester.tap(find.text('Products'));
      expect(taps, 1);
    });

    testWidgets('AppNavRow shows its title and subtitle and opens', (
      tester,
    ) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(
          AppNavRow(
            title: 'Shop profile',
            subtitle: 'Address and map',
            icon: Icons.storefront_outlined,
            onTap: () => taps++,
          ),
        ),
      );

      expect(find.text('Address and map'), findsOneWidget);
      await tester.tap(find.text('Shop profile'));
      expect(taps, 1);
    });

    testWidgets('AppBadge shows its label in the tone colour', (tester) async {
      await tester.pumpWidget(
        _host(const AppBadge(label: 'Unavailable', tone: AppTone.warning)),
      );

      final text = tester.widget<Text>(find.text('Unavailable'));
      expect(text.style?.color, AppColors.statusWarning);
    });

    testWidgets('AppInlineMessage states its tone for screen readers', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(
        _host(
          const AppInlineMessage(
            tone: AppTone.error,
            message: "We couldn't save the price.",
          ),
        ),
      );

      expect(find.text("We couldn't save the price."), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('^Error')), findsOneWidget);
      handle.dispose();
    });

    testWidgets('showAppSnackBar shows the message and the action', (
      tester,
    ) async {
      var undone = false;
      await tester.pumpWidget(
        _launcher(
          (context) => showAppSnackBar(
            context,
            'Price saved.',
            actionLabel: 'Undo',
            onAction: () => undone = true,
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Price saved.'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      expect(undone, isTrue);
    });
  });

  group('overlays', () {
    testWidgets('the bottom sheet shows its title and returns a value', (
      tester,
    ) async {
      String? result;
      await tester.pumpWidget(
        _launcher((context) async {
          result = await showAppBottomSheet<String>(
            context: context,
            title: 'Change price',
            builder: (context) => AppButton(
              label: 'Done',
              onPressed: () => Navigator.of(context).pop('saved'),
            ),
          );
        }),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Change price'), findsOneWidget);
      await tester.tap(find.text('Done'));
      await tester.pumpAndSettle();
      expect(result, 'saved');
    });

    testWidgets('the bottom sheet moves above the keyboard', (tester) async {
      await tester.pumpWidget(
        _launcher(
          (context) => showAppBottomSheet<void>(
            context: context,
            title: 'Change price',
            builder: (context) => const AppTextField(label: 'Price'),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      final before = tester.getBottomLeft(find.byType(AppTextField)).dy;

      tester.view.viewInsets = const FakeViewPadding(bottom: 300);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();

      final after = tester.getBottomLeft(find.byType(AppTextField)).dy;
      expect(after, lessThan(before));
    });

    testWidgets('the confirm dialog returns true, false, or false on dismiss', (
      tester,
    ) async {
      final results = <bool>[];
      await tester.pumpWidget(
        _launcher((context) async {
          results.add(
            await showAppConfirmDialog(
              context: context,
              title: 'Archive this product?',
              message: 'Customers will no longer see it.',
              confirmLabel: 'Archive',
              destructive: true,
            ),
          );
        }),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(find.text('Customers will no longer see it.'), findsOneWidget);
      await tester.tap(find.text('Archive'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      await tester.tapAt(const Offset(4, 4));
      await tester.pumpAndSettle();

      expect(results, [true, false, false]);
    });
  });
}
