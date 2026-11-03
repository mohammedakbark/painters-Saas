import '../api/api_client.dart';
import 'shop_models.dart';

/// Thrown when the shop does not exist or the user is not a member. The API
/// answers 404 for both, so the app never learns whether a shop exists.
class ShopNotFound implements Exception {
  const ShopNotFound();
}

/// Reads the user's shops. Access is decided by the API from the membership.
abstract interface class ShopAccessRepository {
  Future<ShopUser> fetchMe();

  /// Throws [ShopNotFound] for shops the user cannot access.
  Future<MyShop> fetchShop(String shopId);
}

class ApiShopAccessRepository implements ShopAccessRepository {
  const ApiShopAccessRepository(this._api);

  final ApiClient _api;

  @override
  Future<ShopUser> fetchMe() async =>
      ShopUser.fromJson(await _api.getJson('/v1/me'));

  @override
  Future<MyShop> fetchShop(String shopId) async {
    try {
      return MyShop.fromJson(
        await _api.getJson('/v1/shops/${Uri.encodeComponent(shopId)}'),
      );
    } on ApiException catch (error) {
      if (error.status == 404) {
        throw const ShopNotFound();
      }
      rethrow;
    }
  }
}
