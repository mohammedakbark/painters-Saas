// The shop's own customers (ORD-004 API), as far as the Shop App needs them
// to record an order. Mirrors `CustomerListPage` and `CustomerDetail` in
// apps/api/src/customers/customers.schemas.ts.

/// What the shop marked the person as (D-055).
enum CustomerKind {
  painter('PAINTER', 'Painter'),
  customer('CUSTOMER', 'Customer');

  const CustomerKind(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static CustomerKind fromApi(Object? value) =>
      value == 'PAINTER' ? CustomerKind.painter : CustomerKind.customer;
}

/// A customer in the shop's records. Private to the shop (D-054).
class ShopCustomer {
  const ShopCustomer({
    required this.id,
    required this.name,
    required this.phone,
    required this.kind,
    required this.hasApp,
  });

  factory ShopCustomer.fromJson(Map<String, Object?> json) => ShopCustomer(
    id: json['id']! as String,
    name: json['name']! as String,
    phone: json['phone']! as String,
    kind: CustomerKind.fromApi(json['kind']),
    hasApp: json['hasApp']! as bool,
  );

  final String id;
  final String name;

  /// E.164.
  final String phone;
  final CustomerKind kind;

  /// Linked to an app account; such painters keep their own sites.
  final bool hasApp;
}

/// A work site of a painter the shop recorded.
class CustomerSite {
  const CustomerSite({
    required this.id,
    required this.name,
    required this.address,
  });

  factory CustomerSite.fromJson(Map<String, Object?> json) => CustomerSite(
    id: json['id']! as String,
    name: json['name']! as String,
    address: json['address']! as String,
  );

  final String id;
  final String name;
  final String address;
}

/// A customer with the sites an order can go to.
class CustomerDetail {
  const CustomerDetail({required this.customer, required this.sites});

  factory CustomerDetail.fromJson(Map<String, Object?> json) => CustomerDetail(
    customer: ShopCustomer.fromJson(json),
    sites: [
      for (final site in json['sites']! as List<Object?>)
        if (site case final Map<String, Object?> site
            when site['archived'] != true)
          CustomerSite.fromJson(site),
    ],
  );

  final ShopCustomer customer;

  /// Active sites only.
  final List<CustomerSite> sites;

  /// Sites are only for painters the shop recorded (D-055).
  bool get canHaveSites =>
      customer.kind == CustomerKind.painter && !customer.hasApp;
}
