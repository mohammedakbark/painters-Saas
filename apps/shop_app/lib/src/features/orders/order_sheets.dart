import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../orders/order_labels.dart';
import '../../orders/order_models.dart';
import '../../orders/order_providers.dart';
import '../../orders/shop_orders_repository.dart';
import '../../providers.dart';
import 'order_messages.dart';

// The bottom sheets of the order screen (SHP-007). Each one saves through
// the order's controller, so the screen shows the order the API returns, and
// answers true when it saved.

/// Limits of the API (`ORDER_LIMITS` in orders.schemas.ts).
const _noteMin = 2;
const _noteMax = 200;
const _maxQuantity = 999;
const _shadeCodeMax = 40;

typedef _Action = Future<OrderDetail> Function(
  ShopOrdersRepository repository,
  String shopId,
  String orderId,
);

/// Shared saving state of a sheet: runs the action, closes the sheet on
/// success, and keeps the API's field errors and message otherwise.
mixin _SheetSaving<T extends ConsumerStatefulWidget> on ConsumerState<T> {
  bool saving = false;
  String? formError;
  Map<String, String> fieldErrors = const {};

  Future<void> save(OrderKey orderKey, _Action action) async {
    setState(() {
      saving = true;
      formError = null;
      fieldErrors = const {};
    });
    try {
      await ref.read(orderProvider(orderKey).notifier).apply(action);
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = error is ApiException
          ? error.fieldErrors
          : const <String, String>{};
      setState(() {
        saving = false;
        fieldErrors = fields;
        formError = fields.isEmpty ? orderErrorMessage(error) : null;
      });
    }
  }

  List<Widget> get formErrorBox => [
    if (formError != null) ...[
      const SizedBox(height: AppSpacing.s16),
      AppInlineMessage(tone: AppTone.error, message: formError!),
    ],
  ];
}

/// One of the shop's ready messages, or the shop's own text.
class _MessageChoice extends StatelessWidget {
  const _MessageChoice({
    required this.label,
    required this.messages,
    required this.chosen,
    required this.ownText,
    required this.onChosen,
    required this.enabled,
    this.error,
  });

  final String label;
  final List<String> messages;

  /// A ready message, or [OrderMessages.writeMyOwn].
  final String? chosen;
  final TextEditingController ownText;
  final ValueChanged<String?> onChosen;
  final bool enabled;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final own = messages.isEmpty || chosen == OrderMessages.writeMyOwn;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (messages.isNotEmpty)
          AppRadioGroup<String>(
            label: label,
            isRequired: true,
            value: chosen,
            options: [
              for (final message in messages) AppOption(message, message),
              const AppOption(
                OrderMessages.writeMyOwn,
                OrderMessages.writeMyOwn,
              ),
            ],
            onChanged: enabled ? onChosen : (_) {},
            error: own ? null : error,
          ),
        if (own) ...[
          if (messages.isNotEmpty) const SizedBox(height: AppSpacing.s8),
          AppTextField(
            label: messages.isEmpty ? label : 'Your message',
            isRequired: true,
            controller: ownText,
            enabled: enabled,
            maxLength: _noteMax,
            helper: 'The customer sees this.',
            error: error,
          ),
        ],
      ],
    );
  }
}

/// Reads the chosen or typed message; null with an error to show.
({String? message, String? error}) _readMessage(
  List<String> messages,
  String? chosen,
  String ownText, {
  required String emptyError,
}) {
  if (messages.isNotEmpty && chosen == null) {
    return (message: null, error: emptyError);
  }
  if (messages.isNotEmpty && chosen != OrderMessages.writeMyOwn) {
    return (message: chosen, error: null);
  }
  final text = ownText.trim();
  if (text.isEmpty) return (message: null, error: emptyError);
  if (text.length < _noteMin) {
    return (message: null, error: OrderMessages.messageTooShort);
  }
  return (message: text, error: null);
}

/// What a message sheet does with the message.
enum _MessageSheetKind { cancel, notAvailable }

/// Cancels the order with a reason for the customer.
Future<bool> showCancelOrderSheet(
  BuildContext context, {
  required OrderKey orderKey,
}) async =>
    await showAppBottomSheet<bool>(
      context: context,
      title: 'Cancel this order?',
      builder: (context) =>
          _MessageForm(orderKey: orderKey, kind: _MessageSheetKind.cancel),
    ) ??
    false;

/// Marks [item] not available with a message for the customer.
Future<bool> showNotAvailableSheet(
  BuildContext context, {
  required OrderKey orderKey,
  required OrderItem item,
}) async =>
    await showAppBottomSheet<bool>(
      context: context,
      title: '${item.productName} not available',
      builder: (context) => _MessageForm(
        orderKey: orderKey,
        kind: _MessageSheetKind.notAvailable,
        item: item,
      ),
    ) ??
    false;

class _MessageForm extends ConsumerStatefulWidget {
  const _MessageForm({required this.orderKey, required this.kind, this.item});

  final OrderKey orderKey;
  final _MessageSheetKind kind;
  final OrderItem? item;

  @override
  ConsumerState<_MessageForm> createState() => _MessageFormState();
}

class _MessageFormState extends ConsumerState<_MessageForm> with _SheetSaving {
  final _own = TextEditingController();
  String? _chosen;
  String? _error;

  bool get _cancelling => widget.kind == _MessageSheetKind.cancel;

  @override
  void dispose() {
    _own.dispose();
    super.dispose();
  }

  Future<void> _submit(List<String> messages) async {
    final read = _readMessage(
      messages,
      _chosen,
      _own.text,
      emptyError: _cancelling
          ? OrderMessages.cancelReasonRequired
          : OrderMessages.chooseMessage,
    );
    setState(() => _error = read.error);
    final message = read.message;
    if (message == null) return;
    final itemId = widget.item?.id;
    await save(
      widget.orderKey,
      (repository, shopId, orderId) => itemId == null
          ? repository.changeStatus(
              shopId,
              orderId,
              OrderStatus.cancelled,
              reason: message,
            )
          : repository.markNotAvailable(shopId, orderId, itemId, message),
    );
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(orderMessagesProvider(widget.orderKey.shopId));
    if (messages.isLoading) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.s24),
        child: Center(child: AppSpinner()),
      );
    }
    final ready = messages.value ?? const <String>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_cancelling) ...[
          Text(
            "The customer is told, and the order can't be opened again.",
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        _MessageChoice(
          label: _cancelling ? 'Reason for the customer' : 'Message',
          messages: ready,
          chosen: _chosen,
          ownText: _own,
          enabled: !saving,
          error: _error ?? fieldErrors['reason'] ?? fieldErrors['message'],
          onChosen: (value) => setState(() {
            _chosen = value;
            _error = null;
          }),
        ),
        ...formErrorBox,
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: _cancelling ? 'Cancel order' : 'Mark not available',
          loadingLabel: 'Saving…',
          variant: _cancelling
              ? AppButtonVariant.destructive
              : AppButtonVariant.primary,
          loading: saving,
          expand: true,
          onPressed: () => _submit(ready),
        ),
        if (_cancelling) ...[
          const SizedBox(height: AppSpacing.s8),
          AppButton(
            label: 'Keep the order',
            variant: AppButtonVariant.tertiary,
            expand: true,
            onPressed: saving ? null : () => Navigator.of(context).pop(false),
          ),
        ],
      ],
    );
  }
}

/// Reads a typed whole quantity from 1 to [max]; null when it isn't one.
int? parseQuantity(String text, {int max = _maxQuantity}) {
  final value = int.tryParse(text.trim());
  return value == null || value < 1 || value > max ? null : value;
}

final _digitsOnly = [FilteringTextInputFormatter.digitsOnly];

/// Suggests another available pack size of the shop for [item].
Future<bool> showSubstituteSheet(
  BuildContext context, {
  required OrderKey orderKey,
  required OrderItem item,
}) async =>
    await showAppBottomSheet<bool>(
      context: context,
      title: 'Suggest a substitute',
      builder: (context) => _SubstituteForm(orderKey: orderKey, item: item),
    ) ??
    false;

class _SubstituteForm extends ConsumerStatefulWidget {
  const _SubstituteForm({required this.orderKey, required this.item});

  final OrderKey orderKey;
  final OrderItem item;

  @override
  ConsumerState<_SubstituteForm> createState() => _SubstituteFormState();
}

class _SubstituteFormState extends ConsumerState<_SubstituteForm>
    with _SheetSaving {
  final _search = TextEditingController();
  late final _quantity = TextEditingController(text: '${widget.item.quantity}');
  final _shade = TextEditingController();
  final _message = TextEditingController();

  List<PackOption>? _results;
  bool _searching = false;
  String? _searchNote;
  String? _packId;
  Map<String, String> _errors = const {};

  /// The line already carries a message for the customer.
  bool get _messageOptional => widget.item.shopNote != null;

  @override
  void dispose() {
    _search.dispose();
    _quantity.dispose();
    _shade.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String query) async {
    if (query.length < 2) {
      setState(() {
        _results = null;
        _packId = null;
        _searchNote = query.isEmpty ? null : OrderMessages.searchTooShort;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchNote = null;
    });
    List<PackOption>? found;
    String? note;
    try {
      found = await ref
          .read(shopOrdersRepositoryProvider)
          .searchPacks(widget.orderKey.shopId, query);
      if (found.isEmpty) note = OrderMessages.noPacksFound;
    } on Object catch (error) {
      note = orderErrorMessage(error);
    }
    if (!mounted) return;
    setState(() {
      _searching = false;
      _results = found;
      _searchNote = note;
      _packId = null;
    });
  }

  Future<void> _submit() async {
    final quantity = parseQuantity(_quantity.text);
    final message = _message.text.trim();
    final errors = <String, String>{
      if (_packId == null) 'shopProductPackId': OrderMessages.choosePack,
      if (quantity == null) 'quantity': OrderMessages.quantityInvalid,
      if (message.isEmpty && !_messageOptional)
        'message': OrderMessages.chooseMessage
      else if (message.isNotEmpty && message.length < _noteMin)
        'message': OrderMessages.messageTooShort,
    };
    setState(() => _errors = errors);
    if (errors.isNotEmpty) return;
    final shade = _shade.text.trim();
    final offer = SubstituteOffer(
      packId: _packId!,
      quantity: quantity!,
      shadeCode: shade.isEmpty ? null : shade,
      message: message.isEmpty ? null : message,
    );
    await save(
      widget.orderKey,
      (repository, shopId, orderId) =>
          repository.offerSubstitute(shopId, orderId, widget.item.id, offer),
    );
  }

  String? _error(String field) => _errors[field] ?? fieldErrors[field];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final results = _results;
    final packError = _error('shopProductPackId');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Instead of ${widget.item.productName} · ${widget.item.packLabel}. '
          'It is added at today\'s price once the customer accepts.',
          style: textTheme.bodyLarge,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppSearchField(
          label: 'Search your products',
          hint: 'Product or brand name',
          controller: _search,
          onSubmitted: _runSearch,
        ),
        const SizedBox(height: AppSpacing.s8),
        if (_searching)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.s12),
            child: Center(child: AppSpinner()),
          )
        else if (results != null && results.isNotEmpty)
          AppRadioGroup<String>(
            label: 'Pack size',
            isRequired: true,
            value: _packId,
            options: [
              for (final pack in results)
                AppOption(
                  pack.packId,
                  '${pack.productName} · ${pack.packLabel} · '
                  '${formatRupees(pack.pricePaise)}',
                ),
            ],
            onChanged: (id) => setState(() => _packId = id),
            error: packError,
          )
        else if (_searchNote ?? packError case final note?)
          AppInlineMessage(
            tone: packError != null && _searchNote == null
                ? AppTone.error
                : AppTone.info,
            message: note,
          ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Quantity',
          isRequired: true,
          controller: _quantity,
          enabled: !saving,
          keyboardType: TextInputType.number,
          inputFormatters: _digitsOnly,
          maxLength: 3,
          error: _error('quantity'),
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Shade code (optional)',
          controller: _shade,
          enabled: !saving,
          maxLength: _shadeCodeMax,
          error: _error('shadeCode'),
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: _messageOptional
              ? 'Message (optional)'
              : 'Message for the customer',
          isRequired: !_messageOptional,
          controller: _message,
          enabled: !saving,
          maxLength: _noteMax,
          error: _error('message'),
        ),
        ...formErrorBox,
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Suggest substitute',
          loadingLabel: 'Saving…',
          loading: saving,
          expand: true,
          onPressed: _submit,
        ),
      ],
    );
  }
}

/// Records how the customer paid (owner only, once).
Future<bool> showPaymentSheet(
  BuildContext context, {
  required OrderKey orderKey,
  required int totalPaise,
}) async =>
    await showAppBottomSheet<bool>(
      context: context,
      title: 'Record payment of ${formatRupees(totalPaise)}',
      builder: (context) => _PaymentForm(orderKey: orderKey),
    ) ??
    false;

class _PaymentForm extends ConsumerStatefulWidget {
  const _PaymentForm({required this.orderKey});

  final OrderKey orderKey;

  @override
  ConsumerState<_PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends ConsumerState<_PaymentForm> with _SheetSaving {
  PaymentMethod? _method;
  String? _error;

  Future<void> _submit() async {
    final method = _method;
    setState(
      () => _error = method == null ? OrderMessages.choosePayment : null,
    );
    if (method == null) return;
    await save(
      widget.orderKey,
      (repository, shopId, orderId) =>
          repository.recordPayment(shopId, orderId, method),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppRadioGroup<PaymentMethod>(
          label: 'Paid by',
          isRequired: true,
          value: _method,
          options: [
            for (final method in PaymentMethod.values)
              AppOption(method, paymentMethodLabel(method)),
          ],
          onChanged: saving
              ? (_) {}
              : (method) => setState(() {
                  _method = method;
                  _error = null;
                }),
          error: _error ?? fieldErrors['method'],
        ),
        const SizedBox(height: AppSpacing.s8),
        Text(
          "A recorded payment can't be changed here.",
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: AppColors.textSecondary),
        ),
        ...formErrorBox,
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Record payment',
          loadingLabel: 'Saving…',
          loading: saving,
          expand: true,
          onPressed: _submit,
        ),
      ],
    );
  }
}

/// Records returned units of [item] (owner only, completed orders).
Future<bool> showReturnSheet(
  BuildContext context, {
  required OrderKey orderKey,
  required OrderItem item,
}) async =>
    await showAppBottomSheet<bool>(
      context: context,
      title: 'Return of ${item.productName}',
      builder: (context) => _ReturnForm(orderKey: orderKey, item: item),
    ) ??
    false;

class _ReturnForm extends ConsumerStatefulWidget {
  const _ReturnForm({required this.orderKey, required this.item});

  final OrderKey orderKey;
  final OrderItem item;

  @override
  ConsumerState<_ReturnForm> createState() => _ReturnFormState();
}

class _ReturnFormState extends ConsumerState<_ReturnForm> with _SheetSaving {
  final _quantity = TextEditingController(text: '1');
  final _reason = TextEditingController();
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _quantity.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final max = widget.item.returnableQuantity;
    final quantity = parseQuantity(_quantity.text, max: max);
    final reason = _reason.text.trim();
    final errors = <String, String>{
      if (quantity == null)
        'quantity': OrderMessages.returnQuantityInvalid(max),
      if (reason.isEmpty) 'reason': OrderMessages.reasonRequired,
    };
    setState(() => _errors = errors);
    if (errors.isNotEmpty) return;
    await save(
      widget.orderKey,
      (repository, shopId, orderId) => repository.returnItem(
        shopId,
        orderId,
        widget.item.id,
        quantity: quantity!,
        reason: reason,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${item.packLabel} · '
          '${quantityTimesPrice(item.quantity, item.unitPricePaise)}. '
          'The order total goes down by the returned units.',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: AppSpacing.s16),
        AppTextField(
          label: 'Units returned',
          isRequired: true,
          controller: _quantity,
          enabled: !saving,
          keyboardType: TextInputType.number,
          inputFormatters: _digitsOnly,
          maxLength: 3,
          helper: 'Up to ${item.returnableQuantity}.',
          error: _errors['quantity'] ?? fieldErrors['quantity'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Reason',
          isRequired: true,
          controller: _reason,
          enabled: !saving,
          maxLength: _noteMax,
          error: _errors['reason'] ?? fieldErrors['reason'],
        ),
        ...formErrorBox,
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Record return',
          loadingLabel: 'Saving…',
          loading: saving,
          expand: true,
          onPressed: _submit,
        ),
      ],
    );
  }
}
