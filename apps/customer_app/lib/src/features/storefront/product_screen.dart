import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../cart/cart_models.dart';
import '../../cart/cart_providers.dart';
import '../../routing/paths.dart';
import '../../shops/shop_providers.dart';
import '../../storefront/storefront_models.dart';
import '../../storefront/storefront_providers.dart';
import '../cart/cart_button.dart';
import '../cart/shade_picker.dart';

/// One product of a shop (CUS-003): picture, brand, name, category, the
/// pack sizes with this shop's price and availability, and the description.
/// Choose a size, a shade where needed and a quantity, then Add to cart
/// (CUS-004).
class ProductScreen extends ConsumerWidget {
  const ProductScreen({
    super.key,
    required this.shopId,
    required this.productId,
  });

  final String shopId;
  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (shopId, productId);
    return switch (ref.watch(storefrontProductProvider(key))) {
      AsyncData(:final value) => _ProductDetails(
        shopId: shopId,
        product: value,
      ),
      AsyncError(:final error) => AppScaffold(
        title: 'Product',
        body: error is ApiException && error.status == 404
            ? const MessageView(
                icon: Icons.format_paint_outlined,
                title: 'This product is not available',
                message: 'The shop may have removed it.',
              )
            : ErrorView(
                title: "We couldn't load this product",
                onRetry: () => ref.invalidate(storefrontProductProvider(key)),
              ),
      ),
      _ => const AppScaffold(title: 'Product', body: LoadingView()),
    };
  }
}

class _ProductDetails extends ConsumerStatefulWidget {
  const _ProductDetails({required this.shopId, required this.product});

  final String shopId;
  final StorefrontProduct product;

  @override
  ConsumerState<_ProductDetails> createState() => _ProductDetailsState();
}

class _ProductDetailsState extends ConsumerState<_ProductDetails> {
  /// The first available pack, or the first pack.
  late String _packId = (widget.product.packs.firstWhere(
    (pack) => pack.available,
    orElse: () => widget.product.packs.first,
  )).id;
  int _quantity = 1;
  CartShade? _shade;
  String? _shadeError;
  bool _adding = false;

  Future<void> _chooseShade() async {
    final shade = await showShadePicker(
      context,
      shopId: widget.shopId,
      productId: widget.product.id,
    );
    if (shade != null && mounted) {
      setState(() {
        _shade = shade;
        _shadeError = null;
      });
    }
  }

  Future<void> _add(StorefrontPack pack) async {
    if (widget.product.supportsShades && _shade == null) {
      setState(() => _shadeError = 'Choose a shade first.');
      return;
    }
    final shopName =
        ref.read(shopProvider(widget.shopId)).value?.name ??
        (await ref.read(shopProvider(widget.shopId).future)).name;
    if (!mounted) return;
    setState(() => _adding = true);
    final cart = ref.read(cartProvider.notifier);
    Future<void> add({bool startNewCart = false}) => cart.add(
      shopId: widget.shopId,
      shopName: shopName,
      product: widget.product,
      pack: pack,
      quantity: _quantity,
      shade: _shade,
      startNewCart: startNewCart,
    );
    try {
      try {
        await add();
      } on CartShopConflict catch (conflict) {
        if (!mounted) return;
        // Not busy while the person answers.
        setState(() => _adding = false);
        final startNew = await _confirmNewCart(conflict.cartShopName, shopName);
        if (startNew != true || !mounted) return;
        setState(() => _adding = true);
        await add(startNewCart: true);
      }
      if (!mounted) return;
      showAppSnackBar(
        context,
        'Added to cart.',
        actionLabel: 'View cart',
        onAction: () => context.push(cartPath),
      );
      setState(() => _quantity = 1);
    } on CartFull {
      if (!mounted) return;
      showAppSnackBar(
        context,
        'Your cart is full (${Cart.maxLines} lines). Order these first.',
        tone: AppTone.warning,
      );
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<bool?> _confirmNewCart(String cartShop, String thisShop) =>
      showAppDialog<bool>(
        context: context,
        title: 'Start a new cart?',
        content: Text(
          'Your cart has items from $cartShop. A cart holds one shop at a '
          'time. Start a new cart for $thisShop? The items from $cartShop '
          'will be removed.',
        ),
        actions: [
          AppButton(
            key: const Key('keep-cart'),
            label: 'Keep my cart',
            variant: AppButtonVariant.tertiary,
            onPressed: () => Navigator.of(context).pop(false),
          ),
          AppButton(
            key: const Key('start-new-cart'),
            label: 'Start new cart',
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      );

  @override
  Widget build(BuildContext context) {
    final pack = widget.product.packs.firstWhere((p) => p.id == _packId);
    return AppScaffold(
      title: widget.product.name,
      actions: const [CartButton()],
      body: _body(context),
      bottomBar: AppBottomActionBar(
        child: Row(
          children: [
            AppQuantityStepper(
              value: _quantity,
              max: Cart.maxQuantity,
              onChanged: pack.available && !_adding
                  ? (value) => setState(() => _quantity = value)
                  : null,
            ),
            const SizedBox(width: AppSpacing.s12),
            Expanded(
              child: AppButton(
                key: const Key('add-to-cart'),
                label: pack.available ? 'Add to cart' : 'Not available',
                loadingLabel: 'Adding…',
                icon: Icons.add_shopping_cart,
                loading: _adding,
                expand: true,
                onPressed: pack.available ? () => _add(pack) : null,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(BuildContext context) {
    final product = widget.product;
    final shade = _shade;
    final shadeError = _shadeError;
    final textTheme = Theme.of(context).textTheme;
    final pack = product.packs.firstWhere((p) => p.id == _packId);
    final image = product.imageUrl;
    final brand = product.brand;
    final description = product.description;
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        AspectRatio(
          aspectRatio: 4 / 3,
          child: image == null
              ? AppCard(
                  tone: AppCardTone.subtle,
                  padding: EdgeInsets.zero,
                  child: Center(
                    child: Icon(
                      Icons.format_paint_outlined,
                      size: AppSpacing.s64,
                      color: AppColors.brandPrimary,
                    ),
                  ),
                )
              : AppNetworkImage(
                  url: image,
                  semanticLabel: product.name,
                  fit: BoxFit.contain,
                  rounded: true,
                ),
        ),
        const SizedBox(height: AppSpacing.s16),
        if (brand != null)
          Text(
            brand,
            style: textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        Semantics(
          header: true,
          child: Text(
            product.name,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          product.categoryName,
          style: textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.s16),
        if (product.packs.length > 1) ...[
          AppChoiceChips<String>(
            key: const Key('pack-sizes'),
            label: 'Pack size',
            value: _packId,
            options: [
              for (final p in product.packs) AppChipOption(p.id, p.label),
            ],
            onChanged: (id) => setState(() => _packId = id),
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Semantics(
                label: '${pack.label}, ${formatRupees(pack.pricePaise)}',
                excludeSemantics: true,
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: formatRupees(pack.pricePaise),
                        style: textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(
                        text: '  ${pack.label}',
                        style: textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            AppBadge(
              label: pack.available ? 'Available' : 'Not available',
              tone: pack.available ? AppTone.success : AppTone.warning,
            ),
          ],
        ),
        if (product.supportsShades) ...[
          const SizedBox(height: AppSpacing.s16),
          AppCard(
            key: const Key('choose-shade'),
            onTap: _chooseShade,
            padding: const EdgeInsets.all(AppSpacing.s12),
            child: Row(
              children: [
                AppColorSwatch(hex: shade?.previewHex),
                const SizedBox(width: AppSpacing.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      appRequiredLabel('Shade'),
                      Text(
                        shade == null ? 'Choose a shade' : shade.label,
                        style: textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: shade == null ? AppColors.brandPrimary : null,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: AppColors.textSecondary),
              ],
            ),
          ),
          if (shadeError != null) ...[
            const SizedBox(height: AppSpacing.s8),
            AppInlineMessage(message: shadeError, tone: AppTone.error),
          ],
        ],
        if (description != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppSection(title: 'About this product', lines: [description]),
        ],
        if (product.packs.length > 1) ...[
          const SizedBox(height: AppSpacing.s16),
          AppSection(
            title: 'All pack sizes',
            lines: [
              for (final p in product.packs)
                '${p.label}: ${formatRupees(p.pricePaise)}'
                    '${p.available ? '' : ' (not available)'}',
            ],
          ),
        ],
      ],
    );
  }
}
