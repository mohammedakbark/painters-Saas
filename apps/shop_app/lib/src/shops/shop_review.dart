/// The shop's review status (`GET /v1/shops/{id}/review`, PLT-002). The Shop
/// App only shows it; submitting and withdrawing happen on the web portal.
class ShopReviewDecision {
  const ShopReviewDecision({
    required this.decision,
    required this.reasons,
    required this.note,
    required this.decidedAt,
  });

  factory ShopReviewDecision.fromJson(Map<String, Object?> json) =>
      ShopReviewDecision(
        decision: json['decision']! as String,
        reasons: [
          for (final r in json['reasons']! as List<Object?>) r! as String,
        ],
        note: json['note'] as String?,
        decidedAt: DateTime.parse(json['decidedAt']! as String),
      );

  /// APPROVED or CHANGES_REQUESTED.
  final String decision;
  final List<String> reasons;
  final String? note;
  final DateTime decidedAt;
}

class ShopReviewState {
  const ShopReviewState({
    required this.status,
    required this.missing,
    required this.submittedAt,
    required this.lastDecision,
  });

  factory ShopReviewState.fromJson(Map<String, Object?> json) {
    final open = json['open'];
    final last = json['lastDecision'];
    return ShopReviewState(
      status: json['status']! as String,
      missing: [
        for (final m in json['missing']! as List<Object?>) m! as String,
      ],
      submittedAt: open is Map<String, Object?>
          ? DateTime.parse(open['submittedAt']! as String)
          : null,
      lastDecision: last is Map<String, Object?>
          ? ShopReviewDecision.fromJson(last)
          : null,
    );
  }

  final String status;

  /// Checklist items still to do.
  final List<String> missing;

  /// When the open submission was sent, if one is waiting.
  final DateTime? submittedAt;
  final ShopReviewDecision? lastDecision;
}

/// The reasons a platform admin can give (D-032), in the web portal's words.
String reviewReasonLabel(String reason) => switch (reason) {
  'PHOTO_MISSING_OR_UNCLEAR' => 'The shop photo is missing or unclear',
  'LOCATION_MISSING_OR_WRONG' => 'The map location is missing or wrong',
  'ADDRESS_INCOMPLETE' => 'The address is incomplete',
  'SUPPORT_PHONE_INVALID' => 'The support mobile number does not work',
  'PRODUCTS_INSUFFICIENT' => 'Not enough products',
  'PRODUCT_DETAILS_INCORRECT' => 'Some product details or prices are wrong',
  'OTHER' => 'Other (see the note)',
  _ => reason,
};

String checklistItemName(String key) => switch (key) {
  'address' => 'shop address',
  'location' => 'map location',
  'support_phone' => 'support mobile',
  'photo' => 'shop photo',
  'products' => '10 products',
  _ => key,
};

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// "4 Nov 2026" in Indian Standard Time (the initial market, D-020).
String formatIstDate(DateTime instant) {
  final ist = instant.toUtc().add(const Duration(hours: 5, minutes: 30));
  return '${ist.day} ${_months[ist.month - 1]} ${ist.year}';
}
