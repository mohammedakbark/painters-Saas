import 'package:shop_app/src/catalogue/catalogue_models.dart';
import 'package:shop_app/src/catalogue/product_photo_picker.dart';
import 'package:shop_app/src/catalogue/shop_catalogue_repository.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';

// Catalogue test data and fakes (SHP-005).

ShopPack testPack(
  String id,
  String label, {
  int pricePaise = 145000,
  int? mrpPaise,
  bool available = true,
}) => ShopPack(
  id: id,
  cataloguePackId: null,
  quantity: 1,
  unit: PackUnit.litre,
  label: label,
  mrpPaise: mrpPaise,
  pricePaise: pricePaise,
  available: available,
);

ShopProduct testProduct(
  String id,
  String name, {
  List<ShopPack>? packs,
  ProductSource source = ProductSource.catalogue,
  bool archived = false,
  bool catalogueActive = true,
  List<CataloguePack> unlisted = const [],
  ProductImage? image,
}) => ShopProduct(
  id: id,
  source: source,
  catalogueProductId: source == ProductSource.catalogue ? 'cat-$id' : null,
  name: name,
  brandName: 'Demo Paints',
  categoryName: 'Interior emulsion',
  description: null,
  archived: archived,
  catalogueActive: catalogueActive,
  image: image,
  imageFromCatalogue: false,
  packs: packs ?? [testPack('$id-1', '1 L')],
  unlistedCataloguePacks: unlisted,
);

CatalogueProduct testCatalogueProduct(
  String id,
  String name, {
  List<CataloguePack>? packs,
}) => CatalogueProduct(
  id: id,
  name: name,
  brandName: 'Demo Paints',
  categoryName: 'Interior emulsion',
  description: null,
  image: null,
  packs:
      packs ??
      const [
        CataloguePack(
          id: 'cp-1',
          quantity: 1,
          unit: PackUnit.litre,
          label: '1 L',
        ),
        CataloguePack(
          id: 'cp-4',
          quantity: 4,
          unit: PackUnit.litre,
          label: '4 L',
        ),
      ],
);

ShopProduct _copy(
  ShopProduct p, {
  List<ShopPack>? packs,
  bool? archived,
  ProductImage? image,
  List<CataloguePack>? unlisted,
}) => ShopProduct(
  id: p.id,
  source: p.source,
  catalogueProductId: p.catalogueProductId,
  name: p.name,
  brandName: p.brandName,
  categoryName: p.categoryName,
  description: p.description,
  archived: archived ?? p.archived,
  catalogueActive: p.catalogueActive,
  image: image ?? p.image,
  imageFromCatalogue: p.imageFromCatalogue && image == null,
  packs: packs ?? p.packs,
  unlistedCataloguePacks: unlisted ?? p.unlistedCataloguePacks,
);

/// An in-memory catalogue per shop. Records every change; [nextError], when
/// set, makes the next change fail with it (once).
class FakeShopCatalogueRepository implements ShopCatalogueRepository {
  FakeShopCatalogueRepository({
    Map<String, List<ShopProduct>>? products,
    this.brands = const [],
    Map<String, List<BrandProductItem>>? brandProducts,
    this.pageSize = 25,
  }) : products = products ?? {'shop-a': []},
       brandProducts = brandProducts ?? {};

  final Map<String, List<ShopProduct>> products;
  final List<CatalogueBrand> brands;
  final Map<String, List<BrandProductItem>> brandProducts;
  final int pageSize;

  Object? nextError;
  Object? listError;
  final List<(String, PackChange)> packChanges = [];
  final List<(String, NewPack)> addedPacks = [];
  final List<String> removedPacks = [];
  final List<(String, bool)> statusChanges = [];
  final List<(String, Map<String, PackPrice>)> listings = [];
  final List<(String, PickedPhoto)> photos = [];

  void _failIfAsked() {
    final error = nextError;
    if (error != null) {
      nextError = null;
      throw error;
    }
  }

  List<ShopProduct> _shop(String shopId) {
    final list = products[shopId];
    if (list == null) throw const ShopNotFound();
    return list;
  }

  ShopProduct _find(String shopId, String productId) => _shop(shopId)
      .firstWhere(
        (p) => p.id == productId,
        orElse: () => throw const ShopProductNotFound(),
      );

  ShopProduct _save(String shopId, ShopProduct product) {
    final list = _shop(shopId);
    final index = list.indexWhere((p) => p.id == product.id);
    if (index == -1) {
      list.insert(0, product);
    } else {
      list[index] = product;
    }
    return product;
  }

  @override
  Future<Paged<ShopProduct>> listProducts(
    String shopId, {
    required bool archived,
    String? query,
    String? cursor,
  }) async {
    final error = listError;
    if (error != null) {
      listError = null;
      throw error;
    }
    final q = query?.toLowerCase() ?? '';
    final matching = _shop(shopId)
        .where((p) => p.archived == archived)
        .where((p) => q.isEmpty || p.name.toLowerCase().contains(q))
        .toList();
    final start = cursor == null ? 0 : int.parse(cursor);
    final end = (start + pageSize).clamp(0, matching.length);
    return Paged(
      items: matching.sublist(start, end),
      nextCursor: end < matching.length ? '$end' : null,
    );
  }

  @override
  Future<ShopProduct> fetchProduct(String shopId, String productId) async =>
      _find(shopId, productId);

  @override
  Future<ShopProduct> setArchived(
    String shopId,
    String productId, {
    required bool archived,
  }) async {
    _failIfAsked();
    statusChanges.add((productId, archived));
    return _save(shopId, _copy(_find(shopId, productId), archived: archived));
  }

  @override
  Future<ShopProduct> updatePack(
    String shopId,
    String productId,
    String packId,
    PackChange change,
  ) async {
    _failIfAsked();
    packChanges.add((packId, change));
    final product = _find(shopId, productId);
    return _save(
      shopId,
      _copy(
        product,
        packs: [
          for (final p in product.packs)
            if (p.id != packId)
              p
            else
              ShopPack(
                id: p.id,
                cataloguePackId: p.cataloguePackId,
                quantity: p.quantity,
                unit: p.unit,
                label: p.label,
                mrpPaise: change.clearMrp
                    ? null
                    : change.mrpPaise ?? p.mrpPaise,
                pricePaise: change.pricePaise ?? p.pricePaise,
                available: change.available ?? p.available,
              ),
        ],
      ),
    );
  }

  @override
  Future<ShopProduct> addPack(
    String shopId,
    String productId,
    NewPack pack,
  ) async {
    _failIfAsked();
    addedPacks.add((productId, pack));
    final product = _find(shopId, productId);
    final fromCatalogue = product.unlistedCataloguePacks
        .where((p) => p.id == pack.cataloguePackId)
        .firstOrNull;
    final label =
        fromCatalogue?.label ?? '${pack.quantity} ${pack.unit?.label}';
    return _save(
      shopId,
      _copy(
        product,
        packs: [
          ...product.packs,
          testPack(
            'new-${product.packs.length}',
            label,
            pricePaise: pack.price.pricePaise,
            mrpPaise: pack.price.mrpPaise,
            available: pack.price.available,
          ),
        ],
        unlisted: [
          for (final p in product.unlistedCataloguePacks)
            if (p.id != pack.cataloguePackId) p,
        ],
      ),
    );
  }

  @override
  Future<ShopProduct> removePack(
    String shopId,
    String productId,
    String packId,
  ) async {
    _failIfAsked();
    removedPacks.add(packId);
    final product = _find(shopId, productId);
    return _save(
      shopId,
      _copy(
        product,
        packs: [
          for (final p in product.packs)
            if (p.id != packId) p,
        ],
      ),
    );
  }

  @override
  Future<List<CatalogueBrand>> listBrands() async => brands;

  @override
  Future<Paged<BrandProductItem>> browseBrand(
    String shopId,
    String brandId, {
    String? query,
    String? cursor,
  }) async {
    _shop(shopId);
    final q = query?.toLowerCase() ?? '';
    final items = (brandProducts[brandId] ?? const <BrandProductItem>[])
        .where((i) => q.isEmpty || i.product.name.toLowerCase().contains(q))
        .toList();
    return Paged(items: items, nextCursor: null);
  }

  @override
  Future<CatalogueProduct> fetchCatalogueProduct(
    String catalogueProductId,
  ) async {
    for (final items in brandProducts.values) {
      for (final item in items) {
        if (item.product.id == catalogueProductId) return item.product;
      }
    }
    throw const ShopProductNotFound();
  }

  @override
  Future<ShopProduct> addFromCatalogue(
    String shopId,
    String catalogueProductId,
    Map<String, PackPrice> pricesByCataloguePackId,
  ) async {
    _failIfAsked();
    listings.add((catalogueProductId, pricesByCataloguePackId));
    final product = await fetchCatalogueProduct(catalogueProductId);
    return _save(
      shopId,
      testProduct(
        'listed-$catalogueProductId',
        product.name,
        packs: [
          for (final pack in product.packs)
            if (pricesByCataloguePackId[pack.id] case final price?)
              testPack(
                'listed-${pack.id}',
                pack.label,
                pricePaise: price.pricePaise,
                mrpPaise: price.mrpPaise,
                available: price.available,
              ),
        ],
      ),
    );
  }

  @override
  Future<ShopProduct> replaceImage(
    String shopId,
    String productId,
    PickedPhoto photo,
  ) async {
    _failIfAsked();
    photos.add((productId, photo));
    return _save(
      shopId,
      _copy(
        _find(shopId, productId),
        image: const ProductImage(
          url: 'https://storage.test/shop.webp',
          thumbUrl: 'https://storage.test/shop-480.webp',
        ),
      ),
    );
  }
}

class FakeProductPhotoPicker implements ProductPhotoPicker {
  FakeProductPhotoPicker([this.photo]);

  /// Null: the user cancels.
  PickedPhoto? photo;
  final List<PhotoSource> requested = [];

  @override
  Future<PickedPhoto?> pick(PhotoSource source) async {
    requested.add(source);
    return photo;
  }
}
