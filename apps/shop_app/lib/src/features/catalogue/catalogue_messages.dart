import '../../api/api_client.dart';
import '../../catalogue/catalogue_models.dart';
import '../../catalogue/shop_catalogue_repository.dart';
import '../../shops/shop_access_repository.dart';

/// User-facing text of the catalogue screens (also used by tests). The
/// wording follows the web portal's catalogue pages.
abstract final class CatalogueMessages {
  static const forbidden = 'Only the shop owner can change the catalogue.';
  static const offline =
      "We couldn't reach the server. Check your connection and try again.";
  static const failed = "That didn't work. Try again in a moment.";
  static const photoTooLarge = 'The photo is too large. Choose one under 5 MB.';
  static const photoStorageDown =
      "Photos can't be saved right now. Try again later.";
  static const listFailed = "We couldn't load your products";
  static const productNotFound = 'Product not found';
  static const productNotFoundMessage =
      "This product isn't in your catalogue, or it was removed.";
  static const noProducts = 'No products yet';
  static const noProductsOwner =
      'Add products from the brand catalogue, with your price for each pack '
      'size.';
  static const noProductsMember = 'The shop owner adds products.';
  static const noArchived = 'No archived products';
  static const noArchivedMessage =
      'Products you archive appear here, and you can restore them.';
  static String noMatch(String query) => 'No products match "$query"';
  static const noMatchMessage = 'Try a shorter search or another name.';
  static const loadMoreFailed = "We couldn't load more products.";
  static const removedFromCatalogue = 'Removed from the brand catalogue';
  static const removedFromCatalogueMessage =
      'The platform team removed this product, its brand or its category '
      'from the brand catalogue. You can keep selling it or archive it.';
  static const archivedNotice =
      "Customers don't see this product. Restore it to sell it again.";
  static const archiveTitle = 'Archive this product?';
  static const archiveMessage =
      "Customers won't see it. Its prices are kept, and you can restore it "
      'later.';
  static const archived = 'Product archived. Customers will not see it.';
  static const restored = 'Product restored.';
  static const noPhoto = 'No photo yet.';
  static const cataloguePhoto = 'Brand catalogue photo';
  static const photoSaved = 'Photo saved.';
  static const priceSaved = 'Price saved.';
  static const packAdded = 'Pack size added.';
  static String packRemoved(String label) => '$label removed.';
  static String availabilitySaved(String label, bool available) => available
      ? '$label is available again.'
      : "$label marked unavailable. Customers can't buy it.";
  static String removePackTitle(String label) => 'Stop selling $label?';
  static const removePackMessage =
      'The pack size is removed from this product. You can add it again '
      'later.';
  static const lastPack =
      'A product needs at least one pack size. Archive the product instead.';
  static const priceAboveMrp = 'The price cannot be more than the MRP.';
  static const noBrands = 'The brand catalogue is empty';
  static const noBrandsMessage =
      'The platform team has not added brands yet. You can add your own '
      'products on the web portal.';
  static String noBrandProducts(String brand) => 'No $brand products yet';
  static const noBrandProductsMessage =
      "Products you don't find here can be added as your own on the web "
      'portal.';
  static const productAdded = 'Product added.';
  static const choosePack = 'Choose at least one pack size.';
}

/// The sentence to show for a failed catalogue request.
String catalogueErrorMessage(Object error) {
  if (error is CatalogueForbidden) return CatalogueMessages.forbidden;
  if (error is ShopProductNotFound) {
    return CatalogueMessages.productNotFoundMessage;
  }
  if (error is ShopNotFound) {
    return "This shop doesn't exist, or your account doesn't have access to "
        'it.';
  }
  if (error is ApiException) {
    if (error.isUnavailable) return CatalogueMessages.offline;
    if (error.status == 413) return CatalogueMessages.photoTooLarge;
    if (error.status == 503) return CatalogueMessages.photoStorageDown;
    final detail = error.detail;
    if (detail != null && const {400, 404, 409}.contains(error.status)) {
      return detail;
    }
  }
  return CatalogueMessages.failed;
}

/// "4 L · ₹1,450" style price line text for a pack.
String packSummary(ShopPack pack, String Function(int paise) money) =>
    '${pack.label} · ${money(pack.pricePaise)}';

/// Reads a typed pack quantity, with the API's rules and messages.
({double? value, String? error}) parsePackQuantity(String text) {
  final cleaned = text.trim();
  final value = double.tryParse(cleaned);
  if (cleaned.isEmpty || value == null) {
    return (value: null, error: 'Enter the pack quantity.');
  }
  if (value <= 0) {
    return (value: null, error: 'The pack quantity must be more than 0.');
  }
  if (value > maxPackQuantity) {
    return (value: null, error: 'The pack quantity is too large.');
  }
  final decimals = cleaned.contains('.') ? cleaned.split('.').last.length : 0;
  if (decimals > 3) {
    return (
      value: null,
      error: 'Use at most 3 decimals for the pack quantity.',
    );
  }
  return (value: value, error: null);
}
