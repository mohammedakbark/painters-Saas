import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../catalogue/shop_catalogue_repository.dart';
import 'catalogue_messages.dart';

/// A typed price and optional MRP, read with the API's rules.
typedef PackPriceRead = ({
  int? pricePaise,
  int? mrpPaise,
  String? priceError,
  String? mrpError,
});

/// Reads the price fields: the price is required, the MRP optional, and the
/// price may not be above the MRP (CAT-002 §5, assumption to confirm).
PackPriceRead readPackPrice(String priceText, String mrpText) {
  final price = parseRupees(priceText);
  final mrp = mrpText.trim().isEmpty
      ? null
      : parseRupees(mrpText, label: 'MRP');
  final pricePaise = price is RupeesParsed ? price.paise : null;
  final mrpPaise = mrp is RupeesParsed ? mrp.paise : null;
  var priceError = price is RupeesInvalid ? price.message : null;
  final mrpError = mrp is RupeesInvalid ? mrp.message : null;
  if (pricePaise != null && mrpPaise != null && pricePaise > mrpPaise) {
    priceError = CatalogueMessages.priceAboveMrp;
  }
  return (
    pricePaise: priceError == null ? pricePaise : null,
    mrpPaise: mrpPaise,
    priceError: priceError,
    mrpError: mrpError,
  );
}

const _moneyKeyboard = TextInputType.numberWithOptions(decimal: true);

/// The price and MRP fields of one pack, in rupees.
class PackPriceFields extends StatelessWidget {
  const PackPriceFields({
    super.key,
    required this.price,
    required this.mrp,
    this.priceError,
    this.mrpError,
    this.enabled = true,
    this.packLabel,
  });

  final TextEditingController price;
  final TextEditingController mrp;
  final String? priceError;
  final String? mrpError;
  final bool enabled;

  /// Names the pack in the labels when several packs are on one screen.
  final String? packLabel;

  @override
  Widget build(BuildContext context) {
    final suffix = packLabel == null ? '' : ' for $packLabel';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Your price$suffix',
          controller: price,
          enabled: enabled,
          prefixText: '₹ ',
          keyboardType: _moneyKeyboard,
          textInputAction: TextInputAction.next,
          error: priceError,
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'MRP$suffix (optional)',
          controller: mrp,
          enabled: enabled,
          prefixText: '₹ ',
          keyboardType: _moneyKeyboard,
          helper: 'As printed on the pack. Your price cannot be higher.',
          error: mrpError,
        ),
      ],
    );
  }
}

/// Opens the price sheet for [pack]. Returns true when the price was saved.
Future<bool> showPriceSheet(
  BuildContext context, {
  required ProductKey productKey,
  required ShopPack pack,
}) async {
  final saved = await showAppBottomSheet<bool>(
    context: context,
    title: 'Price of ${pack.label}',
    builder: (context) => _PriceForm(productKey: productKey, pack: pack),
  );
  return saved ?? false;
}

class _PriceForm extends ConsumerStatefulWidget {
  const _PriceForm({required this.productKey, required this.pack});

  final ProductKey productKey;
  final ShopPack pack;

  @override
  ConsumerState<_PriceForm> createState() => _PriceFormState();
}

class _PriceFormState extends ConsumerState<_PriceForm> {
  late final _price = TextEditingController(
    text: paiseToInput(widget.pack.pricePaise),
  );
  late final _mrp = TextEditingController(
    text: paiseToInput(widget.pack.mrpPaise),
  );
  String? _priceError;
  String? _mrpError;
  String? _formError;
  bool _saving = false;

  @override
  void dispose() {
    _price.dispose();
    _mrp.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final read = readPackPrice(_price.text, _mrp.text);
    setState(() {
      _priceError = read.priceError;
      _mrpError = read.mrpError;
      _formError = null;
    });
    final pricePaise = read.pricePaise;
    if (pricePaise == null || read.mrpError != null) return;

    final change = PackChange(
      pricePaise: pricePaise,
      mrpPaise: read.mrpPaise,
      clearMrp: read.mrpPaise == null && widget.pack.mrpPaise != null,
    );
    setState(() => _saving = true);
    try {
      await ref
          .read(productProvider(widget.productKey).notifier)
          .apply(
            (repository, shopId, productId) => repository.updatePack(
              shopId,
              productId,
              widget.pack.id,
              change,
            ),
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = error is ApiException
          ? error.fieldErrors
          : const <String, String>{};
      setState(() {
        _saving = false;
        _priceError = fields['pricePaise'];
        _mrpError = fields['mrpPaise'];
        _formError = fields.isEmpty ? catalogueErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PackPriceFields(
          price: _price,
          mrp: _mrp,
          priceError: _priceError,
          mrpError: _mrpError,
          enabled: !_saving,
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Save price',
          loadingLabel: 'Saving…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}

/// Opens the sheet to add a pack size to [product]. Returns true when added.
Future<bool> showAddPackSheet(
  BuildContext context, {
  required ProductKey productKey,
  required ShopProduct product,
}) async {
  final added = await showAppBottomSheet<bool>(
    context: context,
    title: 'Add a pack size',
    builder: (context) =>
        _AddPackForm(productKey: productKey, product: product),
  );
  return added ?? false;
}

class _AddPackForm extends ConsumerStatefulWidget {
  const _AddPackForm({required this.productKey, required this.product});

  final ProductKey productKey;
  final ShopProduct product;

  @override
  ConsumerState<_AddPackForm> createState() => _AddPackFormState();
}

class _AddPackFormState extends ConsumerState<_AddPackForm> {
  final _quantity = TextEditingController();
  final _price = TextEditingController();
  final _mrp = TextEditingController();
  late String? _cataloguePackId =
      widget.product.unlistedCataloguePacks.firstOrNull?.id;
  PackUnit _unit = PackUnit.litre;
  bool _available = true;
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  bool get _fromCatalogue => widget.product.source == ProductSource.catalogue;

  @override
  void dispose() {
    _quantity.dispose();
    _price.dispose();
    _mrp.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final read = readPackPrice(_price.text, _mrp.text);
    final quantity = _fromCatalogue ? null : parsePackQuantity(_quantity.text);
    final errors = <String, String>{
      if (read.priceError != null) 'pricePaise': read.priceError!,
      if (read.mrpError != null) 'mrpPaise': read.mrpError!,
      if (quantity?.error != null) 'quantity': quantity!.error!,
      if (_fromCatalogue && _cataloguePackId == null)
        'cataloguePackId': 'Choose the pack size.',
    };
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    final price = PackPrice(
      pricePaise: read.pricePaise!,
      mrpPaise: read.mrpPaise,
      available: _available,
    );
    final pack = _fromCatalogue
        ? NewPack.catalogue(cataloguePackId: _cataloguePackId!, price: price)
        : NewPack.own(quantity: quantity!.value!, unit: _unit, price: price);
    setState(() => _saving = true);
    try {
      await ref
          .read(productProvider(widget.productKey).notifier)
          .apply(
            (repository, shopId, productId) =>
                repository.addPack(shopId, productId, pack),
          );
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (error) {
      if (!mounted) return;
      final fields = error is ApiException
          ? error.fieldErrors
          : const <String, String>{};
      setState(() {
        _saving = false;
        _errors = fields;
        _formError = fields.isEmpty ? catalogueErrorMessage(error) : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_fromCatalogue)
          AppRadioGroup<String>(
            label: 'Pack size',
            value: _cataloguePackId,
            options: [
              for (final pack in widget.product.unlistedCataloguePacks)
                AppOption(pack.id, pack.label),
            ],
            onChanged: (id) => setState(() => _cataloguePackId = id),
            error: _errors['cataloguePackId'],
          )
        else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppTextField(
                  label: 'Quantity',
                  controller: _quantity,
                  enabled: !_saving,
                  keyboardType: _moneyKeyboard,
                  textInputAction: TextInputAction.next,
                  error: _errors['quantity'],
                ),
              ),
              const SizedBox(width: AppSpacing.s12),
              Expanded(
                child: AppDropdown<PackUnit>(
                  label: 'Unit',
                  value: _unit,
                  options: [
                    for (final unit in PackUnit.values)
                      AppOption(unit, unit.label),
                  ],
                  onChanged: _saving
                      ? null
                      : (unit) => setState(() => _unit = unit ?? _unit),
                  error: _errors['unit'],
                ),
              ),
            ],
          ),
        const SizedBox(height: AppSpacing.s16),
        PackPriceFields(
          price: _price,
          mrp: _mrp,
          priceError: _errors['pricePaise'],
          mrpError: _errors['mrpPaise'],
          enabled: !_saving,
        ),
        const SizedBox(height: AppSpacing.s8),
        AppSwitchRow(
          label: 'Available now',
          subtitle: 'Customers can buy this pack size.',
          value: _available,
          onChanged: _saving
              ? null
              : (value) => setState(() => _available = value),
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Add pack size',
          loadingLabel: 'Adding…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
