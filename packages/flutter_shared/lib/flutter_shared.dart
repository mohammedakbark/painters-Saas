/// Design tokens, theme, the shared UI components (D-039), brand mark, state
/// views, the shop map and phone parsing, shared by the Customer App and Shop
/// App. Screens use these components instead of raw Material controls.
///
/// Only genuinely reusable Flutter code belongs here (see
/// `docs/TECHNICAL_ARCHITECTURE.md`). App-specific widgets stay in each app.
library;

export 'src/brand/app_brand.dart';
export 'src/brand/brand_mark.dart';
export 'src/components/app_button.dart';
export 'src/components/app_card.dart';
export 'src/components/app_chips.dart';
export 'src/components/app_choices.dart';
export 'src/components/app_feedback.dart';
export 'src/components/app_overlays.dart';
export 'src/components/app_spinner.dart';
export 'src/components/app_text_field.dart';
export 'src/components/app_tone.dart';
export 'src/maps/shop_location_map.dart';
export 'src/money/rupees.dart';
export 'src/phone/indian_mobile_number.dart';
export 'src/theme/app_theme.dart';
export 'src/tokens/app_colors.dart';
export 'src/tokens/app_component_tokens.dart';
export 'src/tokens/app_layout.dart';
export 'src/tokens/app_radius.dart';
export 'src/tokens/app_spacing.dart';
export 'src/tokens/app_typography.dart';
export 'src/widgets/state_views.dart';
