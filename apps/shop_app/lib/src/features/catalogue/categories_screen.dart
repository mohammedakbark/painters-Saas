import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';

import '../../api/api_client.dart';
import '../../catalogue/categories_repository.dart';
import '../../providers.dart';
import '../../shops/shop_access_repository.dart';
import '../../shops/shop_permissions.dart';
import 'catalogue_messages.dart';
import 'catalogue_parts.dart';

/// Messages of the Categories screen (SHP-014), as on the web (CAT-007).
abstract final class CategoryMessages {
  static const loadFailed = "We couldn't load the categories.";
  static const added = 'Category added';
  static const saved = 'Category saved';
  static const archived = 'Category archived';
  static const restored = 'Category restored';
  static const nameLength = 'The category name needs 2 to 60 characters.';
  static const limit = 'You can have at most 50 categories of your own.';
  static const noOwn =
      'No categories of your own yet. Add one for products the platform '
      "categories don't cover.";
}

/// The shop's categories: the platform's and its own (D-048).
final categoriesProvider = FutureProvider.autoDispose
    .family<List<ShopCategory>, String>(
      (ref, shopId) => ref.watch(categoriesRepositoryProvider).list(shopId),
      retry: noRetry,
    );

enum _CategoryTab { all, own, platform }

/// Categories (CAT-007) in the Shop App: everyone with `catalogue.view` sees
/// them; `catalogue.manage` adds, renames, archives and restores own ones.
class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key, required this.shopId});

  final String shopId;

  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  _CategoryTab _tab = _CategoryTab.all;

  Future<void> _edit([ShopCategory? category]) async {
    final saved = await showAppBottomSheet<String>(
      context: context,
      title: category == null ? 'Add category' : 'Edit category',
      builder: (context) =>
          CategoryForm(shopId: widget.shopId, editing: category),
    );
    if (saved == null || !mounted) return;
    ref.invalidate(categoriesProvider(widget.shopId));
    showAppSnackBar(context, saved, tone: AppTone.success);
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider(widget.shopId));
    final canManage =
        ref
            .watch(shopProvider(widget.shopId))
            .value
            ?.can(ShopPermission.catalogueManage) ??
        false;
    final ownCount =
        categories.value?.where((category) => category.own).length ?? 0;
    return AppScaffold(
      title: 'Categories',
      body: categories.when(
        loading: () => const LoadingView(message: 'Loading the categories…'),
        error: (error, _) => error is ShopNotFound
            ? const CatalogueShopNotFound()
            : ErrorView(
                title: CategoryMessages.loadFailed,
                onRetry: () =>
                    ref.invalidate(categoriesProvider(widget.shopId)),
              ),
        data: (all) {
          final shown = [
            for (final category in all)
              if (switch (_tab) {
                _CategoryTab.all => true,
                _CategoryTab.own => category.own,
                _CategoryTab.platform => !category.own,
              })
                category,
          ];
          return RefreshIndicator(
            onRefresh: () => ref
                .refresh(categoriesProvider(widget.shopId).future)
                .then((_) {}),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.s12),
              children: [
                AppChoiceChips<_CategoryTab>(
                  label: 'Categories',
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenPadding,
                  ),
                  value: _tab,
                  options: [
                    AppChipOption(_CategoryTab.all, 'All', count: all.length),
                    AppChipOption(_CategoryTab.own, 'Yours', count: ownCount),
                    AppChipOption(
                      _CategoryTab.platform,
                      'Platform',
                      count: all.length - ownCount,
                    ),
                  ],
                  onChanged: (tab) => setState(() => _tab = tab),
                ),
                const SizedBox(height: AppSpacing.s12),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenPadding,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (shown.isEmpty)
                        const AppInlineMessage(message: CategoryMessages.noOwn),
                      for (final category in shown) ...[
                        _CategoryCard(
                          category: category,
                          onEdit: canManage && category.own
                              ? () => _edit(category)
                              : null,
                        ),
                        const SizedBox(height: AppSpacing.s8),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
      bottomBar: canManage && categories.hasValue
          ? AppBottomActionBar(
              child: ownCount < CategoryLimits.maxOwn
                  ? AppButton(
                      label: 'Add category',
                      icon: Icons.add,
                      expand: true,
                      onPressed: _edit,
                    )
                  : const AppInlineMessage(message: CategoryMessages.limit),
            )
          : null,
    );
  }
}

String _productCount(int count) => switch (count) {
  0 => 'No products',
  1 => '1 product',
  _ => '$count products',
};

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category, required this.onEdit});

  final ShopCategory category;

  /// Own categories, for people with `catalogue.manage`.
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return AppCard(
      onTap: onEdit,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(category.name, style: textTheme.titleMedium),
                const SizedBox(height: AppSpacing.s4),
                Text(
                  _productCount(category.productCount),
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s8),
          Wrap(
            spacing: AppSpacing.s8,
            runSpacing: AppSpacing.s4,
            children: [
              AppBadge(
                label: category.own ? 'Yours' : 'Platform',
                tone: category.own ? AppTone.info : AppTone.neutral,
              ),
              if (!category.active)
                const AppBadge(label: 'Archived', tone: AppTone.warning),
            ],
          ),
          if (onEdit != null)
            const Padding(
              padding: EdgeInsets.only(left: AppSpacing.s4),
              child: Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ),
        ],
      ),
    );
  }
}

/// Adds a category ([editing] null) or renames, archives and restores one of
/// the shop's own. Pops with the success message.
class CategoryForm extends ConsumerStatefulWidget {
  const CategoryForm({super.key, required this.shopId, this.editing});

  final String shopId;
  final ShopCategory? editing;

  @override
  ConsumerState<CategoryForm> createState() => _CategoryFormState();
}

enum _Busy { save, archive }

class _CategoryFormState extends ConsumerState<CategoryForm> {
  late final _name = TextEditingController(text: widget.editing?.name);
  _Busy? _busy;
  String? _error;
  String? _formError;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _run(_Busy busy, Future<String> Function() action) async {
    setState(() {
      _busy = busy;
      _error = null;
      _formError = null;
    });
    try {
      final message = await action();
      if (mounted) Navigator.of(context).pop(message);
    } on Object catch (error) {
      if (!mounted) return;
      final field = error is ApiException ? error.fieldErrors['name'] : null;
      setState(() {
        _busy = null;
        _error = field;
        _formError = field == null ? catalogueErrorMessage(error) : null;
      });
    }
  }

  void _save() {
    final name = _name.text.trim();
    if (name.length < CategoryLimits.minName ||
        name.length > CategoryLimits.maxName) {
      setState(() => _error = CategoryMessages.nameLength);
      return;
    }
    final editing = widget.editing;
    if (editing != null && editing.name == name) {
      Navigator.of(context).pop();
      return;
    }
    final repository = ref.read(categoriesRepositoryProvider);
    _run(_Busy.save, () async {
      if (editing == null) {
        await repository.create(widget.shopId, name);
        return CategoryMessages.added;
      }
      await repository.update(widget.shopId, editing.id, name: name);
      return CategoryMessages.saved;
    });
  }

  void _setActive(ShopCategory category, {required bool active}) {
    _run(_Busy.archive, () async {
      await ref
          .read(categoriesRepositoryProvider)
          .update(widget.shopId, category.id, active: active);
      return active ? CategoryMessages.restored : CategoryMessages.archived;
    });
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.editing;
    final busy = _busy != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (editing == null) ...[
          Text(
            'Only your shop sees and uses its own categories.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.s16),
        ],
        AppTextField(
          label: 'Category name',
          isRequired: true,
          controller: _name,
          enabled: !busy,
          maxLength: CategoryLimits.maxName,
          error: _error,
        ),
        if (_formError != null) ...[
          const SizedBox(height: AppSpacing.s16),
          AppInlineMessage(tone: AppTone.error, message: _formError!),
        ],
        const SizedBox(height: AppSpacing.s24),
        AppButton(
          label: editing == null ? 'Add category' : 'Save name',
          loadingLabel: 'Saving…',
          loading: _busy == _Busy.save,
          expand: true,
          onPressed: busy ? null : _save,
        ),
        if (editing != null) ...[
          const SizedBox(height: AppSpacing.s8),
          AppButton(
            label: editing.active ? 'Archive category' : 'Restore category',
            loadingLabel: editing.active ? 'Archiving…' : 'Restoring…',
            variant: AppButtonVariant.secondary,
            loading: _busy == _Busy.archive,
            expand: true,
            onPressed: busy
                ? null
                : () => _setActive(editing, active: !editing.active),
          ),
          const SizedBox(height: AppSpacing.s12),
          Text(
            editing.active
                ? 'An archived category is hidden when adding products. '
                      'Products keep it.'
                : 'Restore it to use it for new products again.',
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}
