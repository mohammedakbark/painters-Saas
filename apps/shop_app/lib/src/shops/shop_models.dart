import 'package:flutter_shared/flutter_shared.dart';

/// A shop the signed-in user belongs to (from `GET /v1/me`).
class ShopMembership {
  const ShopMembership({
    required this.shopId,
    required this.shopName,
    required this.shopStatus,
    required this.role,
  });

  factory ShopMembership.fromJson(Map<String, Object?> json) => ShopMembership(
    shopId: json['shopId']! as String,
    shopName: json['shopName']! as String,
    shopStatus: json['shopStatus']! as String,
    role: json['role']! as String,
  );

  final String shopId;
  final String shopName;
  final String shopStatus;
  final String role;
}

/// The signed-in user and their shops.
class ShopUser {
  const ShopUser({required this.phone, required this.memberships});

  factory ShopUser.fromJson(Map<String, Object?> json) => ShopUser(
    phone: json['phone'] as String?,
    memberships: (json['shopMemberships']! as List<Object?>)
        .map((item) => ShopMembership.fromJson(item! as Map<String, Object?>))
        .toList(growable: false),
  );

  final String? phone;
  final List<ShopMembership> memberships;
}

/// A shop as seen by one of its members (from `GET /v1/shops/{id}`).
class MyShop {
  const MyShop({
    required this.id,
    required this.name,
    required this.status,
    required this.myRole,
  });

  factory MyShop.fromJson(Map<String, Object?> json) => MyShop(
    id: json['id']! as String,
    name: json['name']! as String,
    status: json['status']! as String,
    myRole: json['myRole']! as String,
  );

  final String id;
  final String name;
  final String status;
  final String myRole;
}

/// User-facing labels; unknown values are shown as sent.
String shopStatusLabel(String status) => switch (status) {
  'DRAFT' => 'Draft',
  'PENDING_REVIEW' => 'In review',
  'CHANGES_REQUESTED' => 'Changes requested',
  'ACTIVE' => 'Live',
  _ => status,
};

/// Badge tone for a status, as on the web portal (`lib/shops/labels.ts`).
AppTone shopStatusTone(String status) => switch (status) {
  'PENDING_REVIEW' => AppTone.info,
  'CHANGES_REQUESTED' => AppTone.warning,
  'ACTIVE' => AppTone.success,
  _ => AppTone.neutral,
};

String shopStatusDescription(String status) => switch (status) {
  'DRAFT' => 'Not visible to customers or painters yet.',
  'PENDING_REVIEW' =>
    'Waiting for the platform team. Not visible to customers or painters yet.',
  'CHANGES_REQUESTED' => 'The platform team asked for changes. Not visible to customers or painters yet.',
  'ACTIVE' => 'Approved and visible to customers and painters.',
  _ => '',
};

String shopRoleLabel(String role) => switch (role) {
  'MASTER' => 'Owner (master account)',
  _ => role,
};
