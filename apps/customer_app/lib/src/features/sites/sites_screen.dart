import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:go_router/go_router.dart';

import '../../api/api_client.dart';
import '../../routing/paths.dart';
import '../../sites/sites.dart';

/// The Sites tab, painters only (CUS-005, D-049): the painter's active work
/// sites by name, Add site, and the archived sites from the menu. Orders and
/// spend per site come with checkout (CUS-006).
class SitesScreen extends ConsumerWidget {
  const SitesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sites = ref.watch(sitesProvider);
    return AppScaffold(
      title: 'Sites',
      subtitle: 'Your work sites',
      actions: [
        AppMenuButton(
          items: [
            AppMenuItem(
              label: 'Archived sites',
              icon: Icons.inventory_2_outlined,
              onSelected: () => context.push(archivedSitesPath),
            ),
          ],
        ),
      ],
      bottomBar: AppBottomActionBar(
        child: AppButton(
          key: const Key('add-site'),
          label: 'Add site',
          icon: Icons.add_location_alt_outlined,
          expand: true,
          onPressed: () => context.push(newSitePath),
        ),
      ),
      body: sites.when(
        loading: () => const LoadingView(message: 'Loading your sites…'),
        error: (error, _) => ErrorView(
          title: "We couldn't load your sites",
          message: error is ApiException ? error.detail : null,
          onRetry: () => ref.invalidate(sitesProvider),
        ),
        data: (list) => list.isEmpty
            ? const MessageView(
                icon: Icons.location_city_outlined,
                title: 'No sites yet',
                message:
                    'Add the places you work on, with their pin on the map. '
                    'You choose a site when you order.',
              )
            : RefreshIndicator(
                onRefresh: () => ref.refresh(sitesProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  itemCount: list.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: AppSpacing.s12),
                  itemBuilder: (context, index) => SiteCard(
                    site: list[index],
                    onTap: () => context.push(editSitePath(list[index].id)),
                  ),
                ),
              ),
      ),
    );
  }
}

/// One site: name, owner and address. Opens the site.
class SiteCard extends StatelessWidget {
  const SiteCard({super.key, required this.site, this.onTap, this.trailing});

  final CustomerSite site;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final owner = site.ownerName;
    final trailing = this.trailing;
    return AppCard(
      key: ValueKey('site-${site.id}'),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.location_on_outlined, color: AppColors.brandPrimary),
          const SizedBox(width: AppSpacing.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  site.name,
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (owner != null)
                  Text(
                    'Owner: $owner',
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                Text(
                  site.address,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          ?trailing,
          if (onTap != null && trailing == null)
            Icon(Icons.chevron_right, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}

/// Archived sites, with Restore (CUS-005).
class ArchivedSitesScreen extends ConsumerStatefulWidget {
  const ArchivedSitesScreen({super.key});

  @override
  ConsumerState<ArchivedSitesScreen> createState() =>
      _ArchivedSitesScreenState();
}

class _ArchivedSitesScreenState extends ConsumerState<ArchivedSitesScreen> {
  String? _restoring;

  Future<void> _restore(CustomerSite site) async {
    setState(() => _restoring = site.id);
    try {
      await ref.read(sitesProvider.notifier).restore(site.id);
      if (mounted) showAppSnackBar(context, '${site.name} is back in Sites.');
    } on ApiException catch (error) {
      if (mounted) {
        showAppSnackBar(
          context,
          error.detail ?? "We couldn't restore the site. Try again.",
          tone: AppTone.error,
        );
      }
    } finally {
      if (mounted) setState(() => _restoring = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sites = ref.watch(archivedSitesProvider);
    return AppScaffold(
      title: 'Archived sites',
      body: sites.when(
        loading: () => const LoadingView(message: 'Loading archived sites…'),
        error: (_, _) => ErrorView(
          title: "We couldn't load the archived sites",
          onRetry: () => ref.invalidate(archivedSitesProvider),
        ),
        data: (list) => list.isEmpty
            ? const MessageView(
                icon: Icons.inventory_2_outlined,
                title: 'No archived sites',
                message: 'Sites you archive show here and can be restored.',
              )
            : ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                itemCount: list.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: AppSpacing.s12),
                itemBuilder: (context, index) {
                  final site = list[index];
                  return SiteCard(
                    site: site,
                    trailing: AppButton(
                      key: ValueKey('restore-${site.id}'),
                      label: 'Restore',
                      loadingLabel: 'Restoring…',
                      loading: _restoring == site.id,
                      variant: AppButtonVariant.tertiary,
                      onPressed: _restoring == null
                          ? () => _restore(site)
                          : null,
                    ),
                  );
                },
              ),
      ),
    );
  }
}
