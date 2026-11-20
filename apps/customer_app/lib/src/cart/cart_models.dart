/// The shade chosen for a line (CUS-004): from the shade card or typed.
class CartShade {
  const CartShade({required this.code, this.name, this.previewHex});

  factory CartShade.fromJson(Map<String, Object?> json) => CartShade(
    code: json['code']! as String,
    name: json['name'] as String?,
    previewHex: json['previewHex'] as String?,
  );

  /// Upper case, as on the shade card.
  final String code;
  final String? name;

  /// Indicative screen colour; null for a typed code.
  final String? previewHex;

  Map<String, Object?> toJson() => {
    'code': code,
    'name': name,
    'previewHex': previewHex,
  };

  /// "BC-100 Sunflower" or "BC-100".
  String get label => name == null || name!.isEmpty ? code : '$code $name';
}

/// Why a line cannot be ordered as it is, after the last check.
enum CartLineIssue {
  /// The pack is not available today (D-029).
  notAvailable,

  /// The shop no longer sells it.
  noLongerSold,
}

/// One pack size (and shade) in the cart.
class CartLine {
  const CartLine({
    required this.packId,
    required this.productId,
    required this.productName,
    required this.brand,
    required this.packLabel,
    required this.pricePaise,
    required this.quantity,
    this.shade,
    this.issue,
  });

  factory CartLine.fromJson(Map<String, Object?> json) => CartLine(
    packId: json['packId']! as String,
    productId: json['productId']! as String,
    productName: json['productName']! as String,
    brand: json['brand'] as String?,
    packLabel: json['packLabel']! as String,
    pricePaise: json['pricePaise']! as int,
    quantity: json['quantity']! as int,
    shade: json['shade'] == null
        ? null
        : CartShade.fromJson(json['shade']! as Map<String, Object?>),
  );

  final String packId;
  final String productId;
  final String productName;
  final String? brand;
  final String packLabel;

  /// The shop's price when last seen; the server prices the order again.
  final int pricePaise;
  final int quantity;
  final CartShade? shade;

  /// Set by the cart check; not saved.
  final CartLineIssue? issue;

  /// A pack in two shades is two lines.
  String get key => '$packId|${shade?.code ?? ''}';

  int get totalPaise => pricePaise * quantity;

  CartLine copyWith({
    int? quantity,
    int? pricePaise,
    CartLineIssue? Function()? issue,
  }) => CartLine(
    packId: packId,
    productId: productId,
    productName: productName,
    brand: brand,
    packLabel: packLabel,
    pricePaise: pricePaise ?? this.pricePaise,
    quantity: quantity ?? this.quantity,
    shade: shade,
    issue: issue == null ? this.issue : issue(),
  );

  Map<String, Object?> toJson() => {
    'packId': packId,
    'productId': productId,
    'productName': productName,
    'brand': brand,
    'packLabel': packLabel,
    'pricePaise': pricePaise,
    'quantity': quantity,
    'shade': shade?.toJson(),
  };
}

/// One shop's cart (a cart never mixes shops).
class Cart {
  const Cart({
    required this.shopId,
    required this.shopName,
    required this.lines,
  });

  factory Cart.fromJson(Map<String, Object?> json) => Cart(
    shopId: json['shopId']! as String,
    shopName: json['shopName']! as String,
    lines: [
      for (final line in json['lines']! as List<Object?>)
        CartLine.fromJson(line! as Map<String, Object?>),
    ],
  );

  /// Same limits as an order (ORD-001).
  static const maxLines = 50;
  static const maxQuantity = 999;

  final String shopId;
  final String shopName;
  final List<CartLine> lines;

  /// Tins, kits and pieces in the cart.
  int get itemCount => lines.fold(0, (sum, line) => sum + line.quantity);

  /// Lines that can be ordered now.
  int get subtotalPaise => lines
      .where((line) => line.issue == null)
      .fold(0, (sum, line) => sum + line.totalPaise);

  bool get hasIssues => lines.any((line) => line.issue != null);

  Cart withLines(List<CartLine> lines) =>
      Cart(shopId: shopId, shopName: shopName, lines: lines);

  Map<String, Object?> toJson() => {
    'shopId': shopId,
    'shopName': shopName,
    'lines': [for (final line in lines) line.toJson()],
  };
}

/// Today's price and availability of a pack (CUS-004 cart check).
class CheckedPack {
  const CheckedPack({
    required this.packId,
    required this.pricePaise,
    required this.available,
  });

  factory CheckedPack.fromJson(Map<String, Object?> json) => CheckedPack(
    packId: json['packId']! as String,
    pricePaise: json['pricePaise']! as int,
    available: json['available'] == true,
  );

  final String packId;
  final int pricePaise;
  final bool available;
}

/// A shade to pick for a product (CUS-004).
class ShadeOption {
  const ShadeOption({
    required this.code,
    required this.name,
    required this.previewHex,
    required this.favourite,
  });

  factory ShadeOption.fromJson(Map<String, Object?> json) => ShadeOption(
    code: json['code']! as String,
    name: json['name']! as String,
    previewHex: json['previewHex'] as String?,
    favourite: json['favourite'] == true,
  );

  final String code;
  final String name;
  final String? previewHex;

  /// The shop marked it as a favourite.
  final bool favourite;

  CartShade toCartShade() =>
      CartShade(code: code, name: name, previewHex: previewHex);
}

class ShadeOptions {
  const ShadeOptions({required this.items, required this.more});

  factory ShadeOptions.fromJson(Map<String, Object?> json) => ShadeOptions(
    items: [
      for (final item in json['items']! as List<Object?>)
        ShadeOption.fromJson(item! as Map<String, Object?>),
    ],
    more: json['more'] == true,
  );

  final List<ShadeOption> items;

  /// More shades match; search to narrow.
  final bool more;
}
