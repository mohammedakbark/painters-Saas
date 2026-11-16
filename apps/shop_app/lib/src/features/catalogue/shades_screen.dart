import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../catalogue/catalogue_models.dart';
import '../../catalogue/catalogue_providers.dart';
import '../../catalogue/shades_repository.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_permissions.dart';
import 'catalogue_messages.dart';
import 'catalogue_parts.dart';

/// Messages of the Shades screen (SHP-014), as on the web (WEB-006).
abstract final class ShadeMessages {
  static const loadFailed = "We couldn't load the shades.";
  static const loadMoreFailed = "We couldn't load more shades.";
  static const noFavourites = 'No favourites yet';
  static const noFavouritesMessage =
      'Mark the brand shades you use most, so they are quick to find.';
  static const noBrandShades = 'No shades for this brand yet.';
  static const noOwn = 'No shades of your own yet';
  static const noOwnMessage =
      'Add the shades you mix or sell that are not in a brand list.';
  static const noMatch = 'No shades match';
  static const noBrands = 'No brands in the catalogue yet.';
  static const favouriteAdded = 'Added to favourites';
  static const favouriteRemoved = 'Removed from favourites';
  static const added = 'Shade added';
  static const removed = 'Shade removed';
  static const colourNote =
      'Screen colours are only a guide. Check the shade card before mixing.';
  static const codeInvalid =
      'Use up to 20 letters, digits, spaces, dots, slashes or dashes.';
  static const nameRequired = 'Enter the shade name.';
  static const hexInvalid = 'Use a colour like #E8D5B7.';
}

enum ShadeTab { favourites, brand, own }

typedef ShadeListKey = ({
  String shopId,
  ShadeTab tab,
  String? brandId,
  String query,
});

/// The loaded part of one shade list.
class ShadeListState {
  const ShadeListState({
    required this.items,
    required this.total,
    required this.page,
    this.loadingMore = false,
    this.loadMoreFailed = false,
  });

  final List<ShadeItem> items;
  final int total;
  final int page;
  final bool loadingMore;
  final bool loadMoreFailed;

  bool get hasMore => items.length < total;

  ShadeListState copyWith({
    List<ShadeItem>? items,
    int? total,
    bool? loadingMore,
    bool? loadMoreFailed,
  }) => ShadeListState(
    items: items ?? this.items,
    total: total ?? this.total,
    page: page,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreFailed: loadMoreFailed ?? this.loadMoreFailed,
  );
}

/// The first page of a shade list, then more on request.
class ShadeListController extends AsyncNotifier<ShadeListState> {
  ShadeListController(this.key);

  final ShadeListKey key;

  Future<ShadePage> _fetch(int page) {
    final repository = ref.read(shadesRepositoryProvider);
    return switch (key.tab) {
      ShadeTab.favourites => repository.favourites(
        key.shopId,
        query: key.query,
        page: page,
      ),
      ShadeTab.brand => repository.brandShades(
        key.shopId,
        brandId: key.brandId!,
        query: key.query,
        page: page,
      ),
      ShadeTab.own => repository.ownShades(
        key.shopId,
        query: key.query,
        page: page,
      ),
    };
  }

  @override
  Future<ShadeListState> build() async {
    final first = await _fetch(1);
    return ShadeListState(items: first.items, total: first.total, page: 1);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(
      current.copyWith(loadingMore: true, loadMoreFailed: false),
    );
    try {
      final next = await _fetch(current.page + 1);
      if (!ref.mounted) return;
      final known = {for (final shade in current.items) shade.id};
      state = AsyncData(
        ShadeListState(
          items: [
            ...current.items,
            ...next.items.where((shade) => !known.contains(shade.id)),
          ],
          total: next.total,
          page: next.page,
        ),
      );
    } on Object {
      if (!ref.mounted) return;
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreFailed: true),
      );
    }
  }

  /// After a change: the row is replaced, or removed when [removed].
  void changed(ShadeItem shade, {bool removed = false}) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        items: [
          for (final each in current.items)
            if (each.id != shade.id) each else if (!removed) shade,
        ],
        total: removed ? current.total - 1 : current.total,
      ),
    );
  }
}

final shadeListProvider = AsyncNotifierProvider.autoDispose
    .family<ShadeListController, ShadeListState, ShadeListKey>(
      ShadeListController.new,
      retry: noRetry,
    );

/// Shades (WEB-006) in the Shop App: favourite brand shades, a brand's
/// shades and the shop's own. `catalogue.manage` marks favourites and adds
/// and removes own shades; everyone with `catalogue.view` sees them.
class ShadesScreen extends ConsumerStatefulWidget {
  const ShadesScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<ShadesScreen> createState() => _ShadesScreenState();
}

class _ShadesScreenState extends ConsumerState<ShadesScreen> {
  final _search = TextEditingController();
  ShadeTab _tab = ShadeTab.favourites;
  String _query = '';
  String? _brandId;

  /// Shades whose button waits for the API.
  final Set<String> _busy = {};

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  ShadeListKey get _key => (
    shopId: widget.shopId,
    tab: _tab,
    brandId: _tab == ShadeTab.brand ? _brandId : null,
    query: _query,
  );

  void _tell(String message, {AppTone tone = AppTone.success}) =>
      showAppSnackBar(context, message, tone: tone);

  Future<void> _toggleFavourite(ShadeItem shade) async {
    final key = _key;
    setState(() => _busy.add(shade.id));
    try {
      await ref
          .read(shadesRepositoryProvider)
          .setFavourite(widget.shopId, shade.id, favourite: !shade.favourite);
      if (!mounted) return;
      ref
          .read(shadeListProvider(key).notifier)
          .changed(
            shade.withFavourite(!shade.favourite),
            removed: key.tab == ShadeTab.favourites,
          );
      _tell(
        shade.favourite
            ? ShadeMessages.favouriteRemoved
            : ShadeMessages.favouriteAdded,
      );
    } on Object catch (error) {
      if (mounted) _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _busy.remove(shade.id));
    }
  }

  Future<void> _removeOwn(ShadeItem shade) async {
    final confirmed = await showAppConfirmDialog(
      context: context,
      title: 'Remove ${shade.code}?',
      message: 'The shade is removed from your shades. Orders keep it.',
      confirmLabel: 'Remove shade',
      destructive: true,
    );
    if (!confirmed || !mounted) return;
    final key = _key;
    setState(() => _busy.add(shade.id));
    try {
      await ref
          .read(shadesRepositoryProvider)
          .removeOwn(widget.shopId, shade.id);
      if (!mounted) return;
      ref.read(shadeListProvider(key).notifier).changed(shade, removed: true);
      _tell(ShadeMessages.removed);
    } on Object catch (error) {
      if (mounted) _tell(catalogueErrorMessage(error), tone: AppTone.error);
    } finally {
      if (mounted) setState(() => _busy.remove(shade.id));
    }
  }

  Future<void> _addOwn() async {
    final added = await showAppBottomSheet<ShadeItem>(
      context: context,
      title: 'Add shade',
      builder: (context) => OwnShadeForm(shopId: widget.shopId),
    );
    if (added == null || !mounted) return;
    ref.invalidate(shadeListProvider);
    _tell(ShadeMessages.added);
  }

  @override
  Widget build(BuildContext context) {
    final canManage =
        ref
            .watch(shopProvider(widget.shopId))
            .value
            ?.can(ShopPermission.catalogueManage) ??
        false;
    final brands = _tab == ShadeTab.brand
        ? ref.watch(catalogueBrandsProvider)
        : null;
    // The first brand is chosen until the person picks another.
    final brandList = brands?.value;
    if (_tab == ShadeTab.brand &&
        _brandId == null &&
        brandList != null &&
        brandList.isNotEmpty) {
      _brandId = brandList.first.id;
    }

    return AppScaffold(
      title: 'Shades',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.s12),
          AppChoiceChips<ShadeTab>(
            label: 'Shades',
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenPadding,
            ),
            value: _tab,
            options: const [
              AppChipOption(ShadeTab.favourites, 'Favourites'),
              AppChipOption(ShadeTab.brand, 'Brand shades'),
              AppChipOption(ShadeTab.own, 'My shades'),
            ],
            onChanged: (tab) => setState(() => _tab = tab),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.s12,
              AppSpacing.screenPadding,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_tab == ShadeTab.brand && brandList != null) ...[
                  if (brandList.isNotEmpty)
                    AppDropdown<String>(
                      label: 'Brand',
                      value: _brandId,
                      options: [
                        for (final brand in brandList)
                          AppOption(brand.id, brand.name),
                      ],
                      onChanged: (id) => setState(() => _brandId = id),
                    ),
                  const SizedBox(height: AppSpacing.s12),
                ],
                AppSearchField(
                  label: 'Search shades',
                  hint: 'Shade code or name',
                  controller: _search,
                  onSubmitted: (query) => setState(() => _query = query.trim()),
                ),
                const SizedBox(height: AppSpacing.s8),
                Text(
                  ShadeMessages.colourNote,
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: AppSpacing.s12),
              ],
            ),
          ),
          Expanded(child: _list(brands, brandList, canManage)),
        ],
      ),
      bottomBar: canManage && _tab == ShadeTab.own
          ? AppBottomActionBar(
              child: AppButton(
                label: 'Add shade',
                icon: Icons.add,
                expand: true,
                onPressed: _addOwn,
              ),
            )
          : null,
    );
  }

  Widget _list(
    AsyncValue<List<CatalogueBrand>>? brands,
    List<CatalogueBrand>? brandList,
    bool canManage,
  ) {
    if (_tab == ShadeTab.brand) {
      if (brands == null || brands.isLoading && brandList == null) {
        return const LoadingView(message: 'Loading the brands…');
      }
      if (brands.hasError && brandList == null) {
        return ErrorView(
          title: ShadeMessages.loadFailed,
          onRetry: () => ref.invalidate(catalogueBrandsProvider),
        );
      }
      if (brandList == null || brandList.isEmpty || _brandId == null) {
        return const MessageView(
          icon: Icons.palette_outlined,
          title: ShadeMessages.noBrands,
        );
      }
    }
    final key = _key;
    final shades = ref.watch(shadeListProvider(key));
    return shades.when(
      loading: () => const LoadingView(message: 'Loading the shades…'),
      error: (error, _) => error is ShopNotFound
          ? const CatalogueShopNotFound()
          : ErrorView(
              title: ShadeMessages.loadFailed,
              onRetry: () => ref.invalidate(shadeListProvider(key)),
            ),
      data: (list) {
        if (list.items.isEmpty) return _empty();
        return RefreshIndicator(
          onRefresh: () =>
              ref.refresh(shadeListProvider(key).future).then((_) {}),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              0,
              AppSpacing.screenPadding,
              AppSpacing.screenPadding,
            ),
            children: [
              for (final shade in list.items) ...[
                _ShadeRow(
                  key: ValueKey(shade.id),
                  shade: shade,
                  action: canManage ? _action(shade) : null,
                ),
                const SizedBox(height: AppSpacing.s8),
              ],
              if (list.loadMoreFailed)
                AppInlineMessage(
                  tone: AppTone.error,
                  message: ShadeMessages.loadMoreFailed,
                  action: Align(
                    alignment: Alignment.centerLeft,
                    child: AppButton(
                      label: 'Try again',
                      variant: AppButtonVariant.tertiary,
                      onPressed: () =>
                          ref.read(shadeListProvider(key).notifier).loadMore(),
                    ),
                  ),
                )
              else if (list.hasMore)
                AppButton(
                  label: 'Load more',
                  loadingLabel: 'Loading…',
                  variant: AppButtonVariant.secondary,
                  loading: list.loadingMore,
                  onPressed: () =>
                      ref.read(shadeListProvider(key).notifier).loadMore(),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _action(ShadeItem shade) {
    final busy = _busy.contains(shade.id);
    if (_tab == ShadeTab.own) {
      return AppButton(
        label: 'Remove',
        loadingLabel: 'Removing…',
        variant: AppButtonVariant.tertiary,
        loading: busy,
        onPressed: () => _removeOwn(shade),
      );
    }
    return AppButton(
      label: shade.favourite ? 'Remove favourite' : 'Add to favourites',
      loadingLabel: 'Saving…',
      variant: AppButtonVariant.tertiary,
      loading: busy,
      onPressed: () => _toggleFavourite(shade),
    );
  }

  Widget _empty() {
    if (_query.isNotEmpty) {
      return MessageView(
        icon: Icons.search_off,
        title: ShadeMessages.noMatch,
        action: AppButton(
          label: 'Clear search',
          variant: AppButtonVariant.secondary,
          onPressed: () => setState(() {
            _search.clear();
            _query = '';
          }),
        ),
      );
    }
    return switch (_tab) {
      ShadeTab.favourites => const MessageView(
        icon: Icons.star_outline,
        title: ShadeMessages.noFavourites,
        message: ShadeMessages.noFavouritesMessage,
      ),
      ShadeTab.brand => const MessageView(
        icon: Icons.palette_outlined,
        title: ShadeMessages.noBrandShades,
      ),
      ShadeTab.own => const MessageView(
        icon: Icons.palette_outlined,
        title: ShadeMessages.noOwn,
        message: ShadeMessages.noOwnMessage,
      ),
    };
  }
}

class _ShadeRow extends StatelessWidget {
  const _ShadeRow({super.key, required this.shade, required this.action});

  final ShadeItem shade;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final brand = shade.brandName;
    return AppCard(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.s12,
        AppSpacing.s12,
        AppSpacing.s8,
        AppSpacing.s12,
      ),
      child: Row(
        children: [
          AppColorSwatch(hex: shade.previewHex),
          const SizedBox(width: AppSpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpacing.s8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(shade.code, style: textTheme.titleMedium),
                    if (shade.favourite)
                      const AppBadge(label: 'Favourite', tone: AppTone.success),
                  ],
                ),
                Text(
                  [shade.name, ?brand].join(' · '),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (action case final action?)
                  Align(alignment: Alignment.centerRight, child: action),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Adds a shade of the shop's own: code, name, an optional screen colour and
/// an optional brand. Pops with the added shade.
class OwnShadeForm extends ConsumerStatefulWidget {
  const OwnShadeForm({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<OwnShadeForm> createState() => _OwnShadeFormState();
}

final _shadeCode = RegExp(r'^[A-Z0-9][A-Z0-9 ./-]{0,19}$');

class _OwnShadeFormState extends ConsumerState<OwnShadeForm> {
  final _code = TextEditingController();
  final _name = TextEditingController();
  final _hex = TextEditingController();
  String? _brandId;
  bool _saving = false;
  Map<String, String> _errors = const {};
  String? _formError;

  @override
  void initState() {
    super.initState();
    // The swatch follows the typed colour.
    _hex.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    _hex.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final code = _code.text.trim().toUpperCase().replaceAll(
      RegExp(r'\s+'),
      ' ',
    );
    final name = _name.text.trim();
    final hexText = _hex.text.trim();
    final hex = parseHexColour(hexText);
    final errors = <String, String>{
      if (!_shadeCode.hasMatch(code)) 'code': ShadeMessages.codeInvalid,
      if (name.isEmpty) 'name': ShadeMessages.nameRequired,
      if (hexText.isNotEmpty && hex == null)
        'previewHex': ShadeMessages.hexInvalid,
    };
    setState(() {
      _errors = errors;
      _formError = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _saving = true);
    try {
      final added = await ref.read(shadesRepositoryProvider).addOwn(
        widget.shopId,
        (
          code: code,
          name: name,
          previewHex: hexText.isEmpty
              ? null
              : (hexText.startsWith('#') ? hexText : '#$hexText'),
          brandId: _brandId,
        ),
      );
      if (mounted) Navigator.of(context).pop(added);
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
    final brands = ref.watch(catalogueBrandsProvider).value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(
          label: 'Shade code',
          hint: 'For example, SP 1204',
          isRequired: true,
          controller: _code,
          enabled: !_saving,
          maxLength: 20,
          textInputAction: TextInputAction.next,
          error: _errors['code'],
        ),
        const SizedBox(height: AppSpacing.s12),
        AppTextField(
          label: 'Shade name',
          isRequired: true,
          controller: _name,
          enabled: !_saving,
          maxLength: 80,
          textInputAction: TextInputAction.next,
          error: _errors['name'],
        ),
        const SizedBox(height: AppSpacing.s12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AppTextField(
                label: 'Screen colour',
                hint: '#E8D5B7',
                helper: 'Optional. Only a guide on screen.',
                controller: _hex,
                enabled: !_saving,
                maxLength: 7,
                error: _errors['previewHex'],
              ),
            ),
            const SizedBox(width: AppSpacing.s12),
            Padding(
              padding: const EdgeInsets.only(top: AppSpacing.s8),
              child: AppColorSwatch(hex: _hex.text),
            ),
          ],
        ),
        if (brands != null && brands.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.s12),
          AppDropdown<String?>(
            label: 'Brand',
            helper: 'Optional.',
            value: _brandId,
            options: [
              const AppOption(null, 'No brand'),
              for (final brand in brands) AppOption(brand.id, brand.name),
            ],
            onChanged: _saving ? null : (id) => setState(() => _brandId = id),
            error: _errors['brandId'],
          ),
        ],
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: 'Add shade',
          loadingLabel: 'Adding…',
          loading: _saving,
          expand: true,
          onPressed: _save,
        ),
      ],
    );
  }
}
