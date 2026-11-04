import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../catalogue/product_photo_picker.dart';
import '../../catalogue/shop_catalogue_repository.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../shops/sign_out_button.dart';
import 'catalogue_messages.dart';
import 'catalogue_parts.dart';
import 'pack_sheets.dart';

/// One product (SHP-005): photo, details and pack sizes. The owner turns
/// availability on or off, changes prices, adds or removes pack sizes,
/// archives or restores the product and replaces its photo.
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
    final key = (shopId: shopId, productId: productId);
    final product = ref.watch(productProvider(key));
    final isOwner = ref.watch(shopProvider(shopId)).value?.myRole == 'MASTER';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product'),
        actions: const [SignOutButton()],
      ),
      body: SafeArea(
        child: product.when(
          loading: () => const LoadingView(message: 'Loading the product…'),
          error: (error, _) => switch (error) {
            ShopNotFound() => const CatalogueShopNotFound(),
            ShopProductNotFound() => CatalogueProductNotFound(shopId: shopId),
            _ => ErrorView(
              title: "We couldn't load the product",
              onRetry: () => ref.invalidate(productProvider(key)),
            ),
          },
          data: (product) => _ProductDetails(
            productKey: key,
            product: product,
            isOwner: isOwner,
          ),
        ),
      ),
    );
  }
}

class _ProductDetails extends ConsumerStatefulWidget {
  const _ProductDetails({
    required this.productKey,
    required this.product,
    required this.isOwner,
  });

  final ProductKey productKey;
  final ShopProduct product;
  final bool isOwner;

  @override
  ConsumerState<_ProductDetails> createState() => _ProductDetailsState();
}

class _ProductDetailsState extends ConsumerState<_ProductDetails> {
  /// Packs whose availability is being saved; their switches wait for the API.
  final Set<String> _savingPacks = {};
  bool _archiving = false;
  PhotoSource? _uploadingFrom;

  ProductController get _controller =>
      ref.read(productProvider(widget.productKey).notifier);

  void _tell(String message, {AppTone tone = AppTone.success}) {
    if (mounted) showAppSnackBar(context, message, tone: tone);
  }

  Future<void> _setAvailable(ShopPack pack, bool available) async {
    setState(() => _savingPacks.add(pack.id));
    try {
      await _controller.apply(
        (repository, shopId, productId) => repository.updatePack(
          shopId,
          productId,
          pack.id,
          PackChange(available: available),
        ),
      );
      _tell(CatalogueMessages.availabilitySaved(pack.label, available));
    } on Object catch (error) {
      _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _savingPacks.remove(pack.id));
    }
  }

  Future<void> _changePrice(ShopPack pack) async {
    final saved = await showPriceSheet(
      context,
      productKey: widget.productKey,
      pack: pack,
    );
    if (saved) _tell(CatalogueMessages.priceSaved);
  }

  Future<void> _removePack(ShopPack pack) async {
    final confirmed = await showAppConfirmDialog(
      context: context,
      title: CatalogueMessages.removePackTitle(pack.label),
      message: CatalogueMessages.removePackMessage,
      confirmLabel: 'Remove',
      destructive: true,
    );
    if (!confirmed) return;
    setState(() => _savingPacks.add(pack.id));
    try {
      await _controller.apply(
        (repository, shopId, productId) =>
            repository.removePack(shopId, productId, pack.id),
      );
      _tell(CatalogueMessages.packRemoved(pack.label));
    } on Object catch (error) {
      _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _savingPacks.remove(pack.id));
    }
  }

  Future<void> _addPack() async {
    final added = await showAddPackSheet(
      context,
      productKey: widget.productKey,
      product: widget.product,
    );
    if (added) _tell(CatalogueMessages.packAdded);
  }

  Future<void> _setArchived(bool archived) async {
    if (archived) {
      final confirmed = await showAppConfirmDialog(
        context: context,
        title: CatalogueMessages.archiveTitle,
        message: CatalogueMessages.archiveMessage,
        confirmLabel: 'Archive',
        destructive: true,
      );
      if (!confirmed) return;
    }
    setState(() => _archiving = true);
    try {
      await _controller.apply(
        (repository, shopId, productId) =>
            repository.setArchived(shopId, productId, archived: archived),
      );
      _tell(archived ? CatalogueMessages.archived : CatalogueMessages.restored);
    } on Object catch (error) {
      _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _archiving = false);
    }
  }

  Future<void> _replacePhoto(PhotoSource source) async {
    final PickedPhoto? photo;
    try {
      photo = await ref.read(productPhotoPickerProvider).pick(source);
    } on Object {
      _tell(
        source == PhotoSource.camera
            ? "The camera couldn't be opened."
            : "The photos couldn't be opened.",
        tone: AppTone.error,
      );
      return;
    }
    if (photo == null || !mounted) return;
    setState(() => _uploadingFrom = source);
    try {
      await _controller.apply(
        (repository, shopId, productId) =>
            repository.replaceImage(shopId, productId, photo!),
      );
      _tell(CatalogueMessages.photoSaved);
    } on Object catch (error) {
      _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _uploadingFrom = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final textTheme = Theme.of(context).textTheme;
    final isOwner = widget.isOwner;
    final canAddPack =
        product.packs.length < maxPacksPerProduct &&
        (product.source == ProductSource.own ||
            product.unlistedCataloguePacks.isNotEmpty);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      children: [
        Semantics(
          header: true,
          child: Text(product.name, style: textTheme.headlineSmall),
        ),
        const SizedBox(height: AppSpacing.s4),
        Text(
          productByline(product),
          style: textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
        if (product.archived) ...[
          const SizedBox(height: AppSpacing.s16),
          const AppInlineMessage(
            tone: AppTone.neutral,
            title: 'Archived',
            message: CatalogueMessages.archivedNotice,
          ),
        ],
        if (!product.catalogueActive) ...[
          const SizedBox(height: AppSpacing.s16),
          const AppInlineMessage(
            tone: AppTone.warning,
            title: CatalogueMessages.removedFromCatalogue,
            message: CatalogueMessages.removedFromCatalogueMessage,
          ),
        ],
        const SizedBox(height: AppSpacing.s16),
        _PhotoCard(
          product: product,
          isOwner: isOwner,
          uploadingFrom: _uploadingFrom,
          onPick: _replacePhoto,
        ),
        if (product.description != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppSection(title: 'Description', lines: [product.description!]),
        ],
        const SizedBox(height: AppSpacing.s16),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text('Pack sizes', style: textTheme.titleMedium),
              ),
              for (final pack in product.packs) ...[
                const SizedBox(height: AppSpacing.s12),
                const Divider(),
                _PackRow(
                  pack: pack,
                  isOwner: isOwner,
                  saving: _savingPacks.contains(pack.id),
                  isLast: product.packs.length == 1,
                  onAvailable: (value) => _setAvailable(pack, value),
                  onChangePrice: () => _changePrice(pack),
                  onRemove: () => _removePack(pack),
                ),
              ],
              if (isOwner && canAddPack) ...[
                const SizedBox(height: AppSpacing.s12),
                AppButton(
                  label: 'Add a pack size',
                  icon: Icons.add,
                  variant: AppButtonVariant.secondary,
                  onPressed: _addPack,
                ),
              ],
            ],
          ),
        ),
        if (isOwner) ...[
          const SizedBox(height: AppSpacing.s24),
          if (product.archived)
            AppButton(
              label: 'Restore product',
              loadingLabel: 'Restoring…',
              loading: _archiving,
              expand: true,
              onPressed: () => _setArchived(false),
            )
          else
            AppButton(
              label: 'Archive product',
              loadingLabel: 'Archiving…',
              variant: AppButtonVariant.secondary,
              icon: Icons.archive_outlined,
              loading: _archiving,
              expand: true,
              onPressed: () => _setArchived(true),
            ),
        ],
      ],
    );
  }
}

class _PackRow extends StatelessWidget {
  const _PackRow({
    required this.pack,
    required this.isOwner,
    required this.saving,
    required this.isLast,
    required this.onAvailable,
    required this.onChangePrice,
    required this.onRemove,
  });

  final ShopPack pack;
  final bool isOwner;
  final bool saving;

  /// A product keeps at least one pack size, so the last can't be removed.
  final bool isLast;
  final ValueChanged<bool> onAvailable;
  final VoidCallback onChangePrice;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpacing.s8),
        PackPriceLine(pack: pack),
        if (isOwner) ...[
          AppSwitchRow(
            label: 'Available',
            semanticLabel: '${pack.label} available',
            subtitle: saving
                ? 'Saving…'
                : pack.available
                ? 'Customers can buy this pack size.'
                : "Customers can't buy it now.",
            value: pack.available,
            onChanged: saving ? null : onAvailable,
          ),
          Wrap(
            spacing: AppSpacing.s8,
            children: [
              AppButton(
                label: 'Change price',
                variant: AppButtonVariant.tertiary,
                onPressed: saving ? null : onChangePrice,
              ),
              AppButton(
                label: 'Remove',
                variant: AppButtonVariant.tertiary,
                onPressed: saving || isLast ? null : onRemove,
              ),
            ],
          ),
          if (isLast)
            Text(
              CatalogueMessages.lastPack,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AppColors.textSecondary),
            ),
        ],
      ],
    );
  }
}

class _PhotoCard extends StatelessWidget {
  const _PhotoCard({
    required this.product,
    required this.isOwner,
    required this.uploadingFrom,
    required this.onPick,
  });

  final ShopProduct product;
  final bool isOwner;
  final PhotoSource? uploadingFrom;
  final ValueChanged<PhotoSource> onPick;

  @override
  Widget build(BuildContext context) {
    final image = product.image;
    final textTheme = Theme.of(context).textTheme;
    final busy = uploadingFrom != null;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: image == null
                ? const ProductPhotoPlaceholder()
                : AppNetworkImage(
                    url: image.url,
                    semanticLabel: 'Photo of ${product.name}',
                    errorMessage: "The photo couldn't be loaded.",
                  ),
          ),
          if (isOwner || (image != null && product.imageFromCatalogue))
            Padding(
              padding: const EdgeInsets.all(AppSpacing.s16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (image != null && product.imageFromCatalogue)
                    Text(
                      CatalogueMessages.cataloguePhoto,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  if (isOwner) ...[
                    if (image != null && product.imageFromCatalogue)
                      const SizedBox(height: AppSpacing.s12),
                    Wrap(
                      spacing: AppSpacing.s12,
                      runSpacing: AppSpacing.s8,
                      children: [
                        AppButton(
                          label: 'Take photo',
                          loadingLabel: 'Uploading…',
                          icon: Icons.photo_camera_outlined,
                          variant: AppButtonVariant.secondary,
                          loading: uploadingFrom == PhotoSource.camera,
                          onPressed: busy
                              ? null
                              : () => onPick(PhotoSource.camera),
                        ),
                        AppButton(
                          label: 'Choose from gallery',
                          loadingLabel: 'Uploading…',
                          icon: Icons.photo_library_outlined,
                          variant: AppButtonVariant.secondary,
                          loading: uploadingFrom == PhotoSource.gallery,
                          onPressed: busy
                              ? null
                              : () => onPick(PhotoSource.gallery),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}
