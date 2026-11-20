import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../customers/customer_models.dart';
import '../../orders/order_draft.dart';
import '../../orders/order_labels.dart';
import '../../orders/order_models.dart';
import '../../orders/order_providers.dart';
import '../../providers.dart';
import '../../shops/shop_permissions.dart';
import '../customers/customer_sheets.dart';
import 'order_messages.dart';

/// Records an order for a customer who phoned or is at the counter
/// (SHP-009, on the ORD-004 API): customer, items at today's price, pickup
/// or delivery, then "Save as new order" or "Handed over now". Customers and
/// orders recorded here are private to the shop (D-054).
class NewOrderScreen extends ConsumerStatefulWidget {
  const NewOrderScreen({super.key, required this.shopId, this.customerId});

  final String shopId;

  /// Starts with this customer chosen (from the customer's page).
  final String? customerId;

  @override
  ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState();
}

/// One line being edited: the pack and its typed quantity and shade code.
class _Line {
  _Line(this.pack) : quantity = TextEditingController(text: '1');

  final PackOption pack;
  final TextEditingController quantity;
  final TextEditingController shade = TextEditingController();

  DraftLine get draft => DraftLine(
    pack: pack,
    quantity: int.tryParse(quantity.text.trim()),
    shadeCode: shade.text,
  );

  void dispose() {
    quantity.dispose();
    shade.dispose();
  }
}

/// Which save button is busy.
enum _Saving { asNew, handedOver }

class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  final _customerSearch = TextEditingController();
  final _packSearch = TextEditingController();
  final _address = TextEditingController();

  CustomerDetail? _customer;
  String? _siteId;
  List<ShopCustomer>? _customerResults;
  bool _searchingCustomers = false;
  late String? _openingCustomerId = widget.customerId;
  String? _customerNote;

  final List<_Line> _lines = [];
  List<PackOption>? _packResults;
  bool _searchingPacks = false;
  String? _packNote;

  Fulfilment _fulfilment = Fulfilment.pickup;
  PaymentMethod? _payment;
  _Saving? _saving;
  Map<String, String> _errors = const {};
  String? _formError;

  @override
  void initState() {
    super.initState();
    final customerId = widget.customerId;
    if (customerId != null) _openCustomer(customerId, starting: true);
  }

  Future<void> _openCustomer(String customerId, {bool starting = false}) async {
    if (!starting) setState(() => _openingCustomerId = customerId);
    try {
      final detail = await ref
          .read(shopCustomersRepositoryProvider)
          .fetch(widget.shopId, customerId);
      if (mounted) _select(detail);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _customerNote = orderErrorMessage(error));
    } finally {
      if (mounted) setState(() => _openingCustomerId = null);
    }
  }

  @override
  void dispose() {
    _customerSearch.dispose();
    _packSearch.dispose();
    _address.dispose();
    for (final line in _lines) {
      line.dispose();
    }
    super.dispose();
  }

  CustomerSite? get _site {
    for (final site in _customer?.sites ?? const <CustomerSite>[]) {
      if (site.id == _siteId) return site;
    }
    return null;
  }

  Future<void> _searchCustomers(String query) async {
    if (query.length < 2) {
      setState(() {
        _customerResults = null;
        _customerNote = query.isEmpty ? null : OrderMessages.searchTooShort;
      });
      return;
    }
    setState(() {
      _searchingCustomers = true;
      _customerNote = null;
    });
    List<ShopCustomer>? found;
    String? note;
    try {
      found = await ref
          .read(shopCustomersRepositoryProvider)
          .search(widget.shopId, query);
      if (found.isEmpty) note = OrderMessages.noCustomerMatch;
    } on Object catch (error) {
      note = orderErrorMessage(error);
    }
    if (!mounted) return;
    setState(() {
      _searchingCustomers = false;
      _customerResults = found;
      _customerNote = note;
    });
  }

  /// Reads the customer with their sites, then selects them.
  Future<void> _chooseCustomer(ShopCustomer customer) =>
      _openCustomer(customer.id);

  void _select(CustomerDetail? customer) {
    setState(() {
      _customer = customer;
      _siteId = null;
      _customerResults = null;
      _customerNote = null;
      _customerSearch.clear();
      _errors = {..._errors}..remove('customer');
    });
  }

  Future<void> _addCustomer() async {
    final created = await showAddCustomerSheet(context, widget.shopId);
    if (created != null && mounted) _select(created);
  }

  Future<void> _searchPacks(String query) async {
    if (query.length < 2) {
      setState(() {
        _packResults = null;
        _packNote = query.isEmpty ? null : OrderMessages.searchTooShort;
      });
      return;
    }
    setState(() {
      _searchingPacks = true;
      _packNote = null;
    });
    List<PackOption>? found;
    String? note;
    try {
      found = await ref
          .read(shopOrdersRepositoryProvider)
          .searchPacks(widget.shopId, query);
      if (found.isEmpty) note = OrderMessages.noPacksFound;
    } on Object catch (error) {
      note = orderErrorMessage(error);
    }
    if (!mounted) return;
    setState(() {
      _searchingPacks = false;
      _packResults = found;
      _packNote = note;
    });
  }

  /// Adds the pack, or one more of it when it is already on the order.
  void _addPack(PackOption pack) {
    setState(() {
      final existing = _lines
          .where((line) => line.pack.packId == pack.packId)
          .firstOrNull;
      if (existing == null) {
        _lines.add(_Line(pack));
      } else {
        final quantity = int.tryParse(existing.quantity.text.trim()) ?? 0;
        existing.quantity.text = '${quantity + 1}';
      }
      _packResults = null;
      _packSearch.clear();
      _errors = {..._errors}..remove('items');
    });
  }

  void _removeLine(_Line line) {
    setState(() => _lines.remove(line));
    line.dispose();
  }

  Future<void> _save({required bool handedOver}) async {
    final customer = _customer;
    final lines = [for (final line in _lines) line.draft];
    final errors = checkDraft(
      customerId: customer?.customer.id,
      lines: lines,
      fulfilment: _fulfilment,
      address: _address.text,
      siteAddress: _site?.address,
    );
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty || customer == null) return;

    final address = _address.text.trim();
    final request = RecordOrderRequest(
      customerId: customer.customer.id,
      siteId: _siteId,
      lines: lines,
      fulfilment: _fulfilment,
      deliveryAddress: address.isEmpty ? null : address,
      handedOver: handedOver,
      paymentMethod: _payment,
    );
    setState(() => _saving = handedOver ? _Saving.handedOver : _Saving.asNew);
    try {
      final order = await ref
          .read(shopOrdersRepositoryProvider)
          .record(widget.shopId, request);
      if (!mounted) return;
      ordersChangedFromWidget(ref, widget.shopId);
      // The flow moves on to the saved order.
      context.go('/shops/${widget.shopId}/orders/${order.id}');
      showAppSnackBar(context, OrderMessages.orderSaved);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = error is ApiException
          ? error.fieldErrors
          : const <String, String>{};
      setState(() {
        _saving = null;
        _errors = {
          if (fields['customerId'] != null) 'customer': fields['customerId']!,
          if (fields['siteId'] != null) 'customer': fields['siteId']!,
          if (fields['deliveryAddress'] != null)
            'address': fields['deliveryAddress']!,
          if (fields['fulfilment'] != null) 'fulfilment': fields['fulfilment']!,
          if (fields['paymentMethod'] != null)
            'payment': fields['paymentMethod']!,
        };
        // Item problems (a pack that just became unavailable) and anything
        // else are explained above the save buttons.
        _formError = _errors.isEmpty ? orderErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final canTakePayment =
        ref
            .watch(shopProvider(widget.shopId))
            .value
            ?.can(ShopPermission.ordersPayments) ??
        false;
    final delivery = ref.watch(deliverySettingsProvider(widget.shopId)).value;
    final textTheme = Theme.of(context).textTheme;
    final secondary = textTheme.bodyMedium?.copyWith(
      color: AppColors.textSecondary,
    );
    final busy = _saving != null;
    final itemsPaise = draftTotal(_lines.map((line) => line.draft));
    final chargePaise = _fulfilment == Fulfilment.delivery && delivery != null
        ? delivery.chargeFor(itemsPaise)
        : 0;

    return AppScaffold(
      title: 'New order',
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        children: [
          Text(
            'For customers who order by phone or at the counter.',
            style: textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.s16),
          AppSection(
            title: '1. Customer',
            child: _customerStep(textTheme, secondary),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: '2. Items',
            child: _itemsStep(textTheme, secondary, itemsPaise),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: '3. Pickup or delivery',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppRadioGroup<Fulfilment>(
                  label: 'How the customer gets it',
                  value: _fulfilment,
                  options: const [
                    AppOption(Fulfilment.pickup, 'Pickup at the shop'),
                    AppOption(Fulfilment.delivery, 'Delivery'),
                  ],
                  onChanged: busy
                      ? (_) {}
                      : (value) =>
                            setState(() => _fulfilment = value ?? _fulfilment),
                  error: _errors['fulfilment'],
                ),
                if (_fulfilment == Fulfilment.delivery) ...[
                  if (delivery != null && !delivery.enabled) ...[
                    const AppInlineMessage(
                      tone: AppTone.warning,
                      message: OrderMessages.deliveryOff,
                    ),
                    const SizedBox(height: AppSpacing.s12),
                  ],
                  AppTextField(
                    label: 'Delivery address',
                    isRequired: _site == null,
                    controller: _address,
                    enabled: !busy,
                    maxLines: 3,
                    maxLength: 300,
                    keyboardType: TextInputType.streetAddress,
                    helper: _site == null
                        ? null
                        : 'Leave empty to deliver to ${_site!.name}: '
                              '${_site!.address}',
                    error: _errors['address'],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s12),
          AppSection(
            title: '4. Save',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _TotalRow(label: 'Items', paise: itemsPaise),
                if (_fulfilment == Fulfilment.delivery)
                  _TotalRow(
                    label: 'Delivery',
                    paise: chargePaise,
                    zeroLabel: 'Free',
                  ),
                _TotalRow(
                  label: 'Total',
                  paise: itemsPaise + chargePaise,
                  strong: true,
                ),
                if (canTakePayment) ...[
                  const SizedBox(height: AppSpacing.s16),
                  AppDropdown<PaymentMethod?>(
                    label: 'Paid by',
                    helper: 'Only when the order is handed over now.',
                    value: _payment,
                    options: [
                      const AppOption(null, 'Not paid yet'),
                      for (final method in PaymentMethod.values)
                        AppOption(method, paymentMethodLabel(method)),
                    ],
                    onChanged: busy
                        ? null
                        : (method) => setState(() => _payment = method),
                    error: _errors['payment'],
                  ),
                ],
                if (_formError != null) ...[
                  const SizedBox(height: AppSpacing.s16),
                  AppInlineMessage(
                    tone: AppTone.error,
                    title: OrderMessages.notSaved,
                    message: _formError!,
                  ),
                ] else if (_errors.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s16),
                  AppInlineMessage(
                    tone: AppTone.error,
                    title: OrderMessages.notSaved,
                    message: _errors.values.join(' '),
                  ),
                ],
                const SizedBox(height: AppSpacing.s16),
                AppButton(
                  label: 'Save as new order',
                  loadingLabel: 'Saving…',
                  loading: _saving == _Saving.asNew,
                  expand: true,
                  onPressed: busy ? null : () => _save(handedOver: false),
                ),
                const SizedBox(height: AppSpacing.s8),
                AppButton(
                  label: 'Handed over now',
                  loadingLabel: 'Saving…',
                  variant: AppButtonVariant.secondary,
                  loading: _saving == _Saving.handedOver,
                  expand: true,
                  onPressed: busy ? null : () => _save(handedOver: true),
                ),
                const SizedBox(height: AppSpacing.s12),
                Text(OrderMessages.saveNote, style: secondary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _customerStep(TextTheme textTheme, TextStyle? secondary) {
    final customer = _customer;
    final error = _errors['customer'];
    // Opened from the customer's page: their sites are being read.
    if (customer == null &&
        _openingCustomerId == widget.customerId &&
        widget.customerId != null) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.s12),
        child: Center(child: AppSpinner()),
      );
    }
    if (customer == null) {
      final results = _customerResults;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppSearchField(
            label: 'Find the customer',
            hint: 'Name or mobile number',
            controller: _customerSearch,
            onSubmitted: _searchCustomers,
          ),
          const SizedBox(height: AppSpacing.s8),
          if (_searchingCustomers)
            const Padding(
              padding: EdgeInsets.all(AppSpacing.s12),
              child: Center(child: AppSpinner()),
            )
          else if (results != null)
            for (final found in results) ...[
              _ResultCard(
                title: found.name,
                detail: '${formatPhone(found.phone)} · ${found.kind.label}',
                busy: _openingCustomerId == found.id,
                onTap: () => _chooseCustomer(found),
              ),
              const SizedBox(height: AppSpacing.s8),
            ],
          if (_customerNote != null) ...[
            AppInlineMessage(message: _customerNote!),
            const SizedBox(height: AppSpacing.s8),
          ],
          if (error != null) ...[
            AppInlineMessage(tone: AppTone.error, message: error),
            const SizedBox(height: AppSpacing.s8),
          ],
          AppButton(
            label: 'Add customer',
            icon: Icons.person_add_alt_1_outlined,
            variant: AppButtonVariant.secondary,
            onPressed: _addCustomer,
          ),
        ],
      );
    }
    final person = customer.customer;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: AppSpacing.s8,
          runSpacing: AppSpacing.s4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              person.name,
              style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
            AppBadge(
              label: person.kind.label,
              tone: person.kind == CustomerKind.painter
                  ? AppTone.info
                  : AppTone.neutral,
            ),
          ],
        ),
        Text(formatPhone(person.phone), style: secondary),
        Align(
          alignment: Alignment.centerLeft,
          child: AppButton(
            label: 'Change customer',
            variant: AppButtonVariant.tertiary,
            onPressed: _saving == null ? () => _select(null) : null,
          ),
        ),
        if (customer.canHaveSites)
          if (customer.sites.isEmpty)
            Text(OrderMessages.sitesOnWeb, style: secondary)
          else
            AppDropdown<String?>(
              label: 'Site (optional)',
              value: _siteId,
              options: [
                const AppOption(null, 'No site'),
                for (final site in customer.sites)
                  AppOption(site.id, site.name),
              ],
              onChanged: _saving == null
                  ? (id) => setState(() => _siteId = id)
                  : null,
            ),
        if (error != null) ...[
          const SizedBox(height: AppSpacing.s8),
          AppInlineMessage(tone: AppTone.error, message: error),
        ],
      ],
    );
  }

  Widget _itemsStep(TextTheme textTheme, TextStyle? secondary, int itemsPaise) {
    final results = _packResults;
    final error = _errors['items'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppSearchField(
          label: 'Add a product',
          hint: 'Product or brand name',
          controller: _packSearch,
          onSubmitted: _searchPacks,
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          "Only available pack sizes are listed, at today's price.",
          style: secondary,
        ),
        const SizedBox(height: AppSpacing.s8),
        if (_searchingPacks)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.s12),
            child: Center(child: AppSpinner()),
          )
        else if (results != null)
          for (final pack in results) ...[
            _ResultCard(
              title: '${pack.productName} · ${pack.packLabel}',
              detail: [
                ?pack.brandName,
                formatRupees(pack.pricePaise),
              ].join(' · '),
              onTap: () => _addPack(pack),
            ),
            const SizedBox(height: AppSpacing.s8),
          ],
        if (_packNote != null) ...[
          AppInlineMessage(message: _packNote!),
          const SizedBox(height: AppSpacing.s8),
        ],
        if (_lines.isEmpty)
          Text('No items yet.', style: secondary)
        else
          for (final line in _lines) ...[
            _LineEditor(
              key: ValueKey(line.pack.packId),
              line: line,
              enabled: _saving == null,
              onChanged: () => setState(() {}),
              onRemove: () => _removeLine(line),
            ),
            const SizedBox(height: AppSpacing.s12),
          ],
        if (error != null) ...[
          const SizedBox(height: AppSpacing.s8),
          AppInlineMessage(tone: AppTone.error, message: error),
        ],
        const SizedBox(height: AppSpacing.s8),
        _TotalRow(label: 'Items total', paise: itemsPaise, strong: true),
      ],
    );
  }
}

/// Money in tabular figures, so amounts line up.
const _tabular = [FontFeature.tabularFigures()];

/// A search result that is chosen with one tap.
class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.title,
    required this.detail,
    required this.onTap,
    this.busy = false,
  });

  final String title;
  final String detail;
  final VoidCallback onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return AppCard(
      tone: AppCardTone.subtle,
      padding: const EdgeInsets.all(AppSpacing.s12),
      onTap: busy ? null : onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  detail,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s8),
          if (busy)
            const AppSpinner()
          else
            Icon(Icons.add_circle_outline, color: AppColors.brandPrimary),
        ],
      ),
    );
  }
}

class _LineEditor extends StatelessWidget {
  const _LineEditor({
    super.key,
    required this.line,
    required this.enabled,
    required this.onChanged,
    required this.onRemove,
  });

  final _Line line;
  final bool enabled;
  final VoidCallback onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final pack = line.pack;
    final name = '${pack.productName} · ${pack.packLabel}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                name,
                style: textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.s8),
            Text(
              formatRupees(line.draft.amountPaise),
              style: textTheme.bodyLarge?.copyWith(fontFeatures: _tabular),
            ),
          ],
        ),
        Text(
          [
            ?pack.brandName,
            '${formatRupees(pack.pricePaise)} each',
          ].join(' · '),
          style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: AppTextField(
                label: 'Quantity of $name',
                controller: line.quantity,
                enabled: enabled,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: 3,
                onChanged: (_) => onChanged(),
              ),
            ),
            const SizedBox(width: AppSpacing.s8),
            Expanded(
              flex: 3,
              child: AppTextField(
                label: 'Shade code',
                controller: line.shade,
                enabled: enabled,
                maxLength: 40,
              ),
            ),
          ],
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: AppButton(
            label: 'Remove',
            variant: AppButtonVariant.tertiary,
            onPressed: enabled ? onRemove : null,
          ),
        ),
      ],
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({
    required this.label,
    required this.paise,
    this.zeroLabel,
    this.strong = false,
  });

  final String label;
  final int paise;
  final String? zeroLabel;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyLarge?.copyWith(
      fontWeight: strong ? FontWeight.w600 : null,
      fontFeatures: _tabular,
    );
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.s4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(
            paise == 0 && zeroLabel != null ? zeroLabel! : formatRupees(paise),
            style: style,
          ),
        ],
      ),
    );
  }
}
