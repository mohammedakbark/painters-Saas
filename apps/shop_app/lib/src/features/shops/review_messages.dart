import '../../api/api_client.dart';
import '../../shops/shop_profile.dart';

/// Messages of Submit for review and Withdraw (SHP-013).
abstract final class ReviewMessages {
  static const submitted =
      'Shop submitted for review. We will let you know the decision.';
  static const withdrawn =
      'Submission withdrawn. You can change your shop again.';
  static const incomplete =
      'The checklist is not complete yet. Finish it, then submit again.';
  static const forbidden = "You don't have permission to submit the shop.";
  static const failed = "We couldn't do that. Try again.";
}

String reviewErrorMessage(Object error) => switch (error) {
  ShopProfileForbidden() => ReviewMessages.forbidden,
  ApiException(code: 'onboarding_incomplete') => ReviewMessages.incomplete,
  ApiException(:final detail?, status: 409) => detail,
  _ => ReviewMessages.failed,
};
