import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import 'app_brand.dart';

/// The product mark shown at the top of entry screens.
///
/// A text mark until a logo is chosen (DS-001). When the logo arrives, change
/// this widget only: every screen that shows the brand uses it.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, required this.appName});

  /// For example [AppBrand.shopAppName].
  final String appName;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Semantics(
      label: '${AppBrand.productName}, $appName',
      excludeSemantics: true,
      child: Text(
        appName,
        style: textTheme.titleLarge?.copyWith(color: AppColors.brandPrimary),
      ),
    );
  }
}
