import 'package:flutter_shared/flutter_shared.dart';

/// Who owes whom, with its own tone each (BIL-001). Owing and the shop owing
/// never look alike (CLAUDE.md §6); same words as the web portal.
({String label, AppTone tone}) balanceState(int balancePaise) {
  if (balancePaise > 0) return (label: 'Owes you', tone: AppTone.warning);
  if (balancePaise < 0) return (label: 'You owe', tone: AppTone.info);
  return (label: 'Settled', tone: AppTone.success);
}

/// "+₹1,000" adds to the bill, "−₹500" takes from it.
String signedRupees(int paise) =>
    '${paise < 0 ? '−' : '+'}${formatRupees(paise.abs())}';

abstract final class BillMessages {
  static const billFailed = "We couldn't load the bill.";
  static const listFailed = "We couldn't load the bills.";
  static const noEntries = 'Completed orders and payments show here.';
  static const shopOwes =
      'A return left you owing the customer. Record a refund, or it pays '
      'their next orders.';
  static const sitesNote = 'Payments go against the one balance, not a site.';
  static const noBills =
      'A customer’s bill starts when you complete their '
      'first order.';
  static const noMatch = 'Try another search or balance.';
}
