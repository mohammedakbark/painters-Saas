import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_profile.dart';
import '../../shops/shop_settings.dart';
import '../catalogue/catalogue_parts.dart';

/// Messages of Shop settings (SHP-013), in the web portal's words (SHP-008).
abstract final class SettingsMessages {
  static const loadFailed = "We couldn't load the shop settings.";
  static const deliverySaved = 'Delivery settings saved';
  static const messagesSaved = 'Order messages saved';
  static const needsLocation =
      "Delivery needs the shop's map location, to measure the distance. Set "
      'it in Shop profile first.';
  static const forbidden = "You don't have permission to change the settings.";
  static const failed = "We couldn't save the settings. Try again.";
  static const chargeRequired = 'Enter the delivery charge (0 for free).';
  static const chargeTooHigh = 'The delivery charge can be at most ₹10,000.';
  static const radiusInvalid = 'Enter the delivery distance: 1 to 50 km.';
  static const messageLength = 'Each message needs 2 to 160 characters.';
  static const messageDuplicate = 'Each message must be different.';
  static const maxMessages = 'Keep at most 10 messages.';
}

String settingsErrorMessage(Object error) => switch (error) {
  ShopProfileForbidden() => SettingsMessages.forbidden,
  ApiException(code: 'delivery_needs_location') =>
    SettingsMessages.needsLocation,
  ApiException(:final detail?, :final status)
      when status == 400 || status == 409 =>
    detail,
  _ => SettingsMessages.failed,
};

/// "₹40 per order · free from ₹2,500 · up to 8 km".
String deliverySummary(DeliveryOptions delivery) {
  if (!delivery.enabled) return 'Off. Customers pick up their orders.';
  final charge = delivery.chargePaise ?? 0;
  final freeAbove = delivery.freeAbovePaise;
  return [
    if (charge == 0) 'Free delivery' else '${formatRupees(charge)} per order',
    if (charge > 0 && freeAbove != null) 'free from ${formatRupees(freeAbove)}',
    if (delivery.radiusKm case final km?) 'up to $km km',
  ].join(' · ');
}

/// Pickup, delivery and order messages (SHP-008) in the Shop App. Opens
/// only with `shop.settings` (D-056).
class ShopSettingsScreen extends ConsumerWidget {
  const ShopSettingsScreen({super.key, required this.shopId});

  final String shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(shopSettingsProvider(shopId));
    return AppScaffold(
      title: 'Shop settings',
      body: settings.when(
        loading: () => const LoadingView(message: 'Loading the settings…'),
        error: (error, _) => error is ShopNotFound
            ? const CatalogueShopNotFound()
            : ErrorView(
                title: SettingsMessages.loadFailed,
                onRetry: () => ref.invalidate(shopSettingsProvider(shopId)),
              ),
        data: (settings) => RefreshIndicator(
          onRefresh: () =>
              ref.refresh(shopSettingsProvider(shopId).future).then((_) {}),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            children: [
              const AppSection(
                title: 'Pickup',
                lines: ['Customers can always pick up orders at the shop.'],
              ),
              const SizedBox(height: AppSpacing.s16),
              _DeliverySection(shopId: shopId, settings: settings),
              const SizedBox(height: AppSpacing.s16),
              _MessagesSection(shopId: shopId, settings: settings),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeliverySection extends StatelessWidget {
  const _DeliverySection({required this.shopId, required this.settings});

  final String shopId;
  final ShopSettings settings;

  Future<void> _edit(BuildContext context) async {
    final saved = await showAppBottomSheet<ShopSettings>(
      context: context,
      title: 'Delivery',
      builder: (context) => DeliveryForm(shopId: shopId, settings: settings),
    );
    if (saved != null && context.mounted) {
      showAppSnackBar(
        context,
        SettingsMessages.deliverySaved,
        tone: AppTone.success,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final delivery = settings.delivery;
    return AppSection(
      title: 'Delivery',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AppBadge(
                label: delivery.enabled ? 'On' : 'Off',
                tone: delivery.enabled ? AppTone.success : AppTone.neutral,
              ),
              const SizedBox(width: AppSpacing.s8),
              Expanded(
                child: Text(
                  deliverySummary(delivery),
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            ],
          ),
          if (!settings.hasLocation) ...[
            const SizedBox(height: AppSpacing.s12),
            AppInlineMessage(
              message: SettingsMessages.needsLocation,
              action: Align(
                alignment: Alignment.centerLeft,
                child: AppButton(
                  label: 'Open Shop profile',
                  variant: AppButtonVariant.tertiary,
                  onPressed: () => context.go('/shops/$shopId/profile'),
                ),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.s12),
          Align(
            alignment: Alignment.centerLeft,
            child: AppButton(
              label: 'Edit delivery',
              icon: Icons.edit_outlined,
              variant: AppButtonVariant.secondary,
              onPressed: () => _edit(context),
            ),
          ),
        ],
      ),
    );
  }
}

/// Delivery on or off, the charge, free delivery from an amount and the
/// distance. Turning delivery off keeps the values for next time.
class DeliveryForm extends ConsumerStatefulWidget {
  const DeliveryForm({super.key, required this.shopId, required this.settings});

  final String shopId;
  final ShopSettings settings;

  @override
  ConsumerState<DeliveryForm> createState() => _DeliveryFormState();
}

class _DeliveryFormState extends ConsumerState<DeliveryForm> {
  late final DeliveryOptions _initial = widget.settings.delivery;
  late bool _enabled = _initial.enabled;
  late final _charge = TextEditingController(
    text: paiseToInput(_initial.chargePaise),
  );
  late final _freeAbove = TextEditingController(
    text: paiseToInput(_initial.freeAbovePaise),
  );
  late final _radius = TextEditingController(
    text: _initial.radiusKm?.toString(),
  );
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  @override
  void dispose() {
    _charge.dispose();
    _freeAbove.dispose();
    _radius.dispose();
    super.dispose();
  }

  /// Paise, null when empty; a message for a value that can't be read.
  ({int? paise, String? error}) _rupees(String text, String label) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return (paise: null, error: null);
    if (RegExp(r'^0+(\.0{1,2})?$').hasMatch(trimmed)) {
      return (paise: 0, error: null);
    }
    return switch (parseRupees(trimmed, label: label)) {
      RupeesParsed(:final paise) => (paise: paise, error: null),
      RupeesInvalid(:final message) => (paise: null, error: message),
    };
  }

  Future<void> _save() async {
    final charge = _rupees(_charge.text, 'delivery charge');
    final freeAbove = _rupees(_freeAbove.text, 'free delivery amount');
    final radiusText = _radius.text.trim();
    final radius = int.tryParse(radiusText);
    final chargePaise = charge.paise;
    final errors = <String, String>{
      if (charge.error case final error?)
        'chargePaise': error
      else if (_enabled && chargePaise == null)
        'chargePaise': SettingsMessages.chargeRequired
      else if (chargePaise != null &&
          chargePaise > ShopSettingsLimits.maxChargePaise)
        'chargePaise': SettingsMessages.chargeTooHigh,
      if (freeAbove.error case final error?)
        'freeAbovePaise': error
      else if (freeAbove.paise == 0)
        'freeAbovePaise': 'The free delivery amount must be at least ₹1.',
      if ((_enabled || radiusText.isNotEmpty) &&
          (radius == null ||
              radius < ShopSettingsLimits.minRadiusKm ||
              radius > ShopSettingsLimits.maxRadiusKm))
        'radiusKm': SettingsMessages.radiusInvalid,
    };
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _saving = true);
    try {
      final saved = await ref
          .read(shopSettingsRepositoryProvider)
          .saveDelivery(
            widget.shopId,
            DeliveryOptions(
              enabled: _enabled,
              chargePaise: chargePaise,
              freeAbovePaise: freeAbove.paise,
              radiusKm: radius,
            ),
          );
      ref.invalidate(shopSettingsProvider(widget.shopId));
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = error is ApiException
          ? error.fieldErrors
          : const <String, String>{};
      setState(() {
        _saving = false;
        _errors = fields;
        _formError = fields.isEmpty ? settingsErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppSwitchRow(
          label: 'Deliver orders',
          subtitle: 'Pickup at the shop is always offered.',
          value: _enabled,
          onChanged: _saving ? null : (on) => setState(() => _enabled = on),
        ),
        const SizedBox(height: AppSpacing.s16),
        AppTextField(
          label: 'Delivery charge (₹ per order)',
          helper: '0 means free delivery.',
          isRequired: _enabled,
          controller: _charge,
          enabled: !_saving,
          prefixText: '₹ ',
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textInputAction: TextInputAction.next,
          error: _errors['chargePaise'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Free delivery from (₹)',
          helper: 'Optional. Orders from this amount are delivered free.',
          controller: _freeAbove,
          enabled: !_saving,
          prefixText: '₹ ',
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          textInputAction: TextInputAction.next,
          error: _errors['freeAbovePaise'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Delivery distance (km)',
          helper: 'From the shop, 1 to 50 km.',
          isRequired: _enabled,
          controller: _radius,
          enabled: !_saving,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          maxLength: 2,
          error: _errors['radiusKm'],
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Save delivery',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}

/// The ready messages for items the shop can't supply (D-045). Every change
/// saves the whole list.
class _MessagesSection extends ConsumerStatefulWidget {
  const _MessagesSection({required this.shopId, required this.settings});

  final String shopId;
  final ShopSettings settings;

  @override
  ConsumerState<_MessagesSection> createState() => _MessagesSectionState();
}

class _MessagesSectionState extends ConsumerState<_MessagesSection> {
  /// The message being removed; its button waits for the API.
  int? _removing;

  List<String> get _messages => widget.settings.orderMessages;

  Future<void> _edit([int? index]) async {
    final saved = await showAppBottomSheet<ShopSettings>(
      context: context,
      title: index == null ? 'Add message' : 'Edit message',
      builder: (context) => OrderMessageForm(
        shopId: widget.shopId,
        messages: _messages,
        index: index,
      ),
    );
    if (saved != null && mounted) {
      showAppSnackBar(
        context,
        SettingsMessages.messagesSaved,
        tone: AppTone.success,
      );
    }
  }

  Future<void> _remove(int index) async {
    setState(() => _removing = index);
    try {
      await ref
          .read(shopSettingsRepositoryProvider)
          .saveOrderMessages(widget.shopId, [..._messages]..removeAt(index));
      ref.invalidate(shopSettingsProvider(widget.shopId));
      if (mounted) {
        showAppSnackBar(
          context,
          SettingsMessages.messagesSaved,
          tone: AppTone.success,
        );
      }
    } on Object catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          settingsErrorMessage(error),
          tone: AppTone.error,
        );
      }
    } finally {
      if (mounted) setState(() => _removing = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = _messages;
    final textTheme = Theme.of(context).textTheme;
    return AppSection(
      title: 'Order messages',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Ready messages for items you can't supply. Staff pick one when "
            'they mark an item not available.',
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          if (messages.isEmpty)
            const AppInlineMessage(
              message: 'No messages yet. Staff can still write their own.',
            ),
          for (final (index, message) in messages.indexed) ...[
            AppCard(
              tone: AppCardTone.subtle,
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.s16,
                AppSpacing.s12,
                AppSpacing.s8,
                AppSpacing.s4,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(message, style: textTheme.bodyLarge),
                  Wrap(
                    spacing: AppSpacing.s8,
                    children: [
                      AppButton(
                        label: 'Edit',
                        variant: AppButtonVariant.tertiary,
                        onPressed: _removing == null
                            ? () => _edit(index)
                            : null,
                      ),
                      AppButton(
                        label: 'Remove',
                        loadingLabel: 'Removing…',
                        variant: AppButtonVariant.tertiary,
                        loading: _removing == index,
                        onPressed: _removing == null
                            ? () => _remove(index)
                            : null,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.s8),
          ],
          const SizedBox(height: AppSpacing.s4),
          if (messages.length < ShopSettingsLimits.maxMessages)
            Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                label: 'Add message',
                icon: Icons.add,
                variant: AppButtonVariant.secondary,
                onPressed: _removing == null ? _edit : null,
              ),
            )
          else
            const AppInlineMessage(message: SettingsMessages.maxMessages),
        ],
      ),
    );
  }
}

/// Adds a message ([index] null) or edits one.
class OrderMessageForm extends ConsumerStatefulWidget {
  const OrderMessageForm({
    super.key,
    required this.shopId,
    required this.messages,
    this.index,
  });

  final String shopId;
  final List<String> messages;
  final int? index;

  @override
  ConsumerState<OrderMessageForm> createState() => _OrderMessageFormState();
}

class _OrderMessageFormState extends ConsumerState<OrderMessageForm> {
  late final _text = TextEditingController(
    text: widget.index == null ? null : widget.messages[widget.index!],
  );
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final text = _text.text.trim();
    final index = widget.index;
    final others = [
      for (final (i, message) in widget.messages.indexed)
        if (i != index) message.toLowerCase(),
    ];
    final error =
        text.length < ShopSettingsLimits.minMessageLength ||
            text.length > ShopSettingsLimits.maxMessageLength
        ? SettingsMessages.messageLength
        : others.contains(text.toLowerCase())
        ? SettingsMessages.messageDuplicate
        : null;
    setState(() => _error = error);
    if (error != null) return;
    if (index != null && widget.messages[index] == text) {
      Navigator.of(context).pop();
      return;
    }

    final messages = [...widget.messages];
    if (index == null) {
      messages.add(text);
    } else {
      messages[index] = text;
    }
    setState(() => _saving = true);
    try {
      final saved = await ref
          .read(shopSettingsRepositoryProvider)
          .saveOrderMessages(widget.shopId, messages);
      ref.invalidate(shopSettingsProvider(widget.shopId));
      if (mounted) Navigator.of(context).pop(saved);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = settingsErrorMessage(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Message',
          hint: 'For example, Stock not available.',
          isRequired: true,
          controller: _text,
          enabled: !_saving,
          maxLength: ShopSettingsLimits.maxMessageLength,
          maxLines: 3,
          error: _error,
        ),
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: widget.index == null ? 'Add message' : 'Save message',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
