// The shop's own customers (ORD-004 API) for New order (SHP-009) and the
// Customers tab (SHP-012). Mirrors `CustomerListPage` and `CustomerDetail` in
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

/// A row of the Customers tab.
class CustomerListItem {
  const CustomerListItem({
    required this.customer,
    required this.siteCount,
    required this.orderCount,
    required this.lastOrderAt,
  });

  factory CustomerListItem.fromJson(Map<String, Object?> json) =>
      CustomerListItem(
        customer: ShopCustomer.fromJson(json),
        siteCount: (json['siteCount']! as num).toInt(),
        orderCount: (json['orderCount']! as num).toInt(),
        lastOrderAt: switch (json['lastOrderAt']) {
          final String at => DateTime.parse(at),
          _ => null,
        },
      );

  final ShopCustomer customer;

  /// Active sites.
  final int siteCount;
  final int orderCount;
  final DateTime? lastOrderAt;
}

/// One page of the Customers tab.
class CustomerListPage {
  const CustomerListPage({
    required this.items,
    required this.total,
    required this.page,
  });

  factory CustomerListPage.fromJson(Map<String, Object?> json) =>
      CustomerListPage(
        items: [
          for (final item in json['items']! as List<Object?>)
            CustomerListItem.fromJson(item! as Map<String, Object?>),
        ],
        total: (json['total']! as num).toInt(),
        page: (json['page']! as num).toInt(),
      );

  final List<CustomerListItem> items;

  /// Customers matching the search and type.
  final int total;
  final int page;
}

/// A work site of a painter the shop recorded.
class CustomerSite {
  const CustomerSite({
    required this.id,
    required this.name,
    required this.address,
    this.ownerName,
    this.hasPin = false,
    this.archived = false,
  });

  factory CustomerSite.fromJson(Map<String, Object?> json) => CustomerSite(
    id: json['id']! as String,
    name: json['name']! as String,
    address: json['address']! as String,
    ownerName: json['ownerName'] as String?,
    hasPin: json['pin'] != null,
    archived: json['archived'] == true,
  );

  final String id;
  final String name;
  final String address;
  final String? ownerName;

  /// A map pin set on the web; the app keeps it as it is.
  final bool hasPin;
  final bool archived;
}

/// A customer with their sites.
class CustomerDetail {
  const CustomerDetail({
    required this.customer,
    required this.sites,
    this.archivedSites = const [],
    this.orderCount = 0,
  });

  factory CustomerDetail.fromJson(Map<String, Object?> json) {
    final all = [
      for (final site in json['sites']! as List<Object?>)
        CustomerSite.fromJson(site! as Map<String, Object?>),
    ];
    return CustomerDetail(
      customer: ShopCustomer.fromJson(json),
      sites: [
        for (final site in all)
          if (!site.archived) site,
      ],
      archivedSites: [
        for (final site in all)
          if (site.archived) site,
      ],
      orderCount: switch (json['orderCount']) {
        final num count => count.toInt(),
        _ => 0,
      },
    );
  }

  final ShopCustomer customer;

  /// Active sites only: the ones an order can go to.
  final List<CustomerSite> sites;
  final List<CustomerSite> archivedSites;
  final int orderCount;

  /// Sites are only for painters the shop recorded (D-055).
  bool get canHaveSites =>
      customer.kind == CustomerKind.painter && !customer.hasApp;
}
