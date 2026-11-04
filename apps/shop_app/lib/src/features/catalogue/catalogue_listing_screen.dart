import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../catalogue/shop_catalogue_repository.dart';
import '../../providers.dart';
import '../shops/sign_out_button.dart';
import 'catalogue_messages.dart';
import 'pack_sheets.dart';

/// Choose the pack sizes of a brand catalogue product and set their prices
/// (SHP-005). Every pack size starts ticked, as on the web portal.
class CatalogueListingScreen extends ConsumerWidget {
  const CatalogueListingScreen({
    super.key,
    required this.shopId,
    required this.catalogueProductId,
  });

  final String shopId;
  final String catalogueProductId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(catalogueProductProvider(catalogueProductId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your prices'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: product.when(
          loading: () => const LoadingView(message: 'Loading the product…'),
          error: (error, _) => error is ShopProductNotFound
              ? MessageView(
                  icon: Icons.search_off,
                  title: CatalogueMessages.productNotFound,
                  message: 'This product is no longer in the brand catalogue.',
                  action: AppButton(
                    label: 'Back to the brand catalogue',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.go('/shops/$shopId/catalogue/add'),
                  ),
                )
              : ErrorView(
                  title: "We couldn't load the product",
                  onRetry: () => ref.invalidate(
                    catalogueProductProvider(catalogueProductId),
                  ),
                ),
          data: (product) => _ListingForm(shopId: shopId, product: product),
        ),
      ),
    );
  }
}

class _PackInput {
  _PackInput(this.pack);

  final CataloguePack pack;
  final price = TextEditingController();
  final mrp = TextEditingController();
  bool sell = true;
  bool available = true;
  String? priceError;
  String? mrpError;

  void dispose() {
    price.dispose();
    mrp.dispose();
  }
}

class _ListingForm extends ConsumerStatefulWidget {
  const _ListingForm({required this.shopId, required this.product});

  final String shopId;
  final CatalogueProduct product;

  @override
  ConsumerState<_ListingForm> createState() => _ListingFormState();
}

class _ListingFormState extends ConsumerState<_ListingForm> {
  late final List<_PackInput> _packs = [
    for (final pack in widget.product.packs) _PackInput(pack),
  ];
  bool _saving = false;
  String? _formError;
  bool _alreadyListed = false;

  @override
  void dispose() {
    for (final input in _packs) {
      input.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final prices = <String, PackPrice>{};
    final chosen = _packs.where((input) => input.sell).toList();
    for (final input in _packs) {
      input
        ..priceError = null
        ..mrpError = null;
      if (!input.sell) continue;
      final read = readPackPrice(input.price.text, input.mrp.text);
      input
        ..priceError = read.priceError
        ..mrpError = read.mrpError;
      if (read.pricePaise != null && read.mrpError == null) {
        prices[input.pack.id] = PackPrice(
          pricePaise: read.pricePaise!,
          mrpPaise: read.mrpPaise,
          available: input.available,
        );
      }
    }
    setState(() {
      _formError = chosen.isEmpty ? CatalogueMessages.choosePack : null;
      _alreadyListed = false;
    });
    if (chosen.isEmpty || prices.length != chosen.length) return;

    setState(() => _saving = true);
    try {
      final listed = await ref
          .read(shopCatalogueRepositoryProvider)
          .addFromCatalogue(widget.shopId, widget.product.id, prices);
      if (!mounted) return;
      catalogueChangedFromWidget(ref, widget.shopId);
      showAppSnackBar(context, CatalogueMessages.productAdded);
      context.go('/shops/${widget.shopId}/catalogue/products/${listed.id}');
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _alreadyListed =
            error is ApiException && error.code == 'product_already_listed';
        _formError = catalogueErrorMessage(error);
        if (error is ApiException) {
          // Field paths are `packs.<index>.<field>`, in the order sent.
          final sent = prices.keys.toList();
          for (final MapEntry(key: path, value: message)
              in error.fieldErrors.entries) {
            final parts = path.split('.');
            final index = parts.length == 3 ? int.tryParse(parts[1]) : null;
            if (index == null || index >= sent.length) continue;
            final input = _packs.firstWhere((p) => p.pack.id == sent[index]);
            if (parts[2] == 'mrpPaise') {
              input.mrpError = message;
            } else {
              input.priceError = message;
            }
          }
          if (error.fieldErrors.isNotEmpty) _formError = null;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Semantics(
          header: true,
          child: Text(product.name, style: textTheme.headlineSmall),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          '${product.brandName} · ${product.categoryName}',
          style: textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s16),
        Text(
          'Tick the pack sizes you sell and enter your price for each.',
          style: textTheme.bodyLarge,
        ),
        for (final input in _packs) ...[
          const SizedBox(height: AppSpacing.s16),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppCheckboxRow(
                  label: 'Sell ${input.pack.label}',
                  value: input.sell,
                  onChanged: _saving
                      ? null
                      : (value) => setState(() => input.sell = value),
                ),
                if (input.sell) ...[
                  const SizedBox(height: AppSpacing.s8),
                  PackPriceFields(
                    price: input.price,
                    mrp: input.mrp,
                    packLabel: input.pack.label,
                    priceError: input.priceError,
                    mrpError: input.mrpError,
                    enabled: !_saving,
                  ),
                  AppSwitchRow(
                    label: 'Available now',
                    semanticLabel: '${input.pack.label} available now',
                    value: input.available,
                    onChanged: _saving
                        ? null
                        : (value) => setState(() => input.available = value),
                  ),
                ],
              ],
            ),
          ),
        ],
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(
            tone: AppTone.error,
            message: _formError!,
            action: _alreadyListed
                ? Align(
                    alignment: Alignment.centerLeft,
                    child: AppButton(
                      label: 'Go to your products',
                      variant: AppButtonVariant.tertiary,
                      onPressed: () =>
                          context.go('/shops/${widget.shopId}/catalogue'),
                    ),
                  )
                : null,
          ),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Add to my products',
          loadingLabel: 'Adding…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
