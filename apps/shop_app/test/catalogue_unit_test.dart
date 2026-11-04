import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/catalogue/catalogue_models.dart';
import 'package:shop_app/src/catalogue/product_photo_picker.dart';
import 'package:shop_app/src/catalogue/shop_catalogue_repository.dart';
import 'package:shop_app/src/features/catalogue/catalogue_messages.dart';
import 'package:shop_app/src/features/catalogue/pack_sheets.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';

Map<String, Object?> _productJson({
  String source = 'catalogue',
  Object? brand = const {'id': 'b1', 'name': 'Demo Paints'},
}) => {
  'id': 'p1',
  'source': source,
  'catalogueProductId': source == 'catalogue' ? 'c1' : null,
  'name': 'Silk Emulsion',
  'brand': brand,
  'category': {'id': 'k1', 'name': 'Interior emulsion'},
  'description': null,
  'supportsShades': true,
  'status': 'ACTIVE',
  'catalogueActive': true,
  'image': {
    'url': 'https://s/x-1600.webp',
    'thumbUrl': 'https://s/x-480.webp',
    'updatedAt': '2026-11-04T10:00:00.000Z',
  },
  'imageSource': 'catalogue',
  'packs': [
    {
      'id': 'k-1',
      'cataloguePackId': 'cp-1',
      'quantity': 1,
      'unit': 'LITRE',
      'label': '1 L',
      'mrpPaise': 50000,
      'pricePaise': 45000,
      'available': false,
    },
  ],
  'unlistedCataloguePacks': [
    {'id': 'cp-4', 'quantity': 4, 'unit': 'LITRE', 'label': '4 L'},
  ],
  'createdAt': '2026-11-04T10:00:00.000Z',
  'updatedAt': '2026-11-04T10:00:00.000Z',
};

/// Records requests and answers with [respond].
class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.respond);

  final ResponseBody Function(RequestOptions options) respond;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return respond(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Object body, [int status = 200]) => ResponseBody.fromString(
  jsonEncode(body),
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

void main() {
  group('models', () {
    test('a brand catalogue product with its packs and photo', () {
      final product = ShopProduct.fromJson(_productJson());

      expect(product.source, ProductSource.catalogue);
      expect(product.brandName, 'Demo Paints');
      expect(product.categoryName, 'Interior emulsion');
      expect(product.archived, isFalse);
      expect(product.imageFromCatalogue, isTrue);
      expect(product.image?.thumbUrl, 'https://s/x-480.webp');
      final pack = product.packs.single;
      expect(pack.unit, PackUnit.litre);
      expect(pack.mrpPaise, 50000);
      expect(pack.pricePaise, 45000);
      expect(pack.available, isFalse);
      expect(product.unlistedCataloguePacks.single.label, '4 L');
    });

    test('an own product without a brand', () {
      final product = ShopProduct.fromJson(
        _productJson(source: 'own', brand: null),
      );

      expect(product.source, ProductSource.own);
      expect(product.brandName, isNull);
      expect(product.catalogueProductId, isNull);
    });
  });

  group('apiExceptionFrom', () {
    test('keeps the code, detail and field messages of a problem', () {
      final error = apiExceptionFrom(
        DioException(
          requestOptions: RequestOptions(),
          response: Response(
            requestOptions: RequestOptions(),
            statusCode: 400,
            data: {
              'code': 'validation_failed',
              'detail': 'Check the highlighted fields.',
              'errors': [
                {'path': 'packs.0.pricePaise', 'message': 'Too large.'},
                {'path': 'packs.0.pricePaise', 'message': 'Second.'},
              ],
            },
          ),
        ),
      );

      expect(error.status, 400);
      expect(error.code, 'validation_failed');
      expect(error.detail, 'Check the highlighted fields.');
      expect(error.fieldErrors, {'packs.0.pricePaise': 'Too large.'});
      expect(error.toString(), isNot(contains('highlighted')));
    });
  });

  group('request bodies', () {
    test('a pack change sends only what changed, and clears the MRP', () {
      expect(const PackChange(available: false).toJson(), {'available': false});
      expect(const PackChange(pricePaise: 100, mrpPaise: 200).toJson(), {
        'pricePaise': 100,
        'mrpPaise': 200,
      });
      expect(const PackChange(pricePaise: 100, clearMrp: true).toJson(), {
        'pricePaise': 100,
        'mrpPaise': null,
      });
    });

    test('new packs name a catalogue pack or a size', () {
      const price = PackPrice(pricePaise: 100, mrpPaise: null, available: true);
      expect(
        const NewPack.catalogue(cataloguePackId: 'cp-4', price: price).toJson(),
        {
          'cataloguePackId': 'cp-4',
          'pricePaise': 100,
          'mrpPaise': null,
          'available': true,
        },
      );
      expect(
        const NewPack.own(
          quantity: 0.5,
          unit: PackUnit.kilogram,
          price: price,
        ).toJson(),
        {
          'quantity': 0.5,
          'unit': 'KILOGRAM',
          'pricePaise': 100,
          'mrpPaise': null,
          'available': true,
        },
      );
    });
  });

  group('ApiShopCatalogueRepository', () {
    late _FakeAdapter adapter;
    late ApiShopCatalogueRepository repository;

    setUp(() {
      adapter = _FakeAdapter((options) => _json(_productJson()));
      final dio = Dio()..httpClientAdapter = adapter;
      repository = ApiShopCatalogueRepository(
        ApiClient(
          baseUrl: Uri.parse('http://api.test'),
          accessToken: () => 'token',
          dio: dio,
        ),
      );
    });

    test('lists the tab and search with the page size', () async {
      adapter = _FakeAdapter(
        (options) => _json({
          'items': [_productJson()],
          'nextCursor': 'next',
        }),
      );
      final dio = Dio()..httpClientAdapter = adapter;
      repository = ApiShopCatalogueRepository(
        ApiClient(
          baseUrl: Uri.parse('http://api.test'),
          accessToken: () => 'token',
          dio: dio,
        ),
      );

      final page = await repository.listProducts(
        'shop a',
        archived: true,
        query: 'silk',
      );

      final request = adapter.requests.single;
      expect(request.path, '/v1/shops/shop%20a/catalogue/products');
      expect(request.queryParameters, {
        'status': 'ARCHIVED',
        'limit': '25',
        'q': 'silk',
      });
      expect(request.headers['Authorization'], 'Bearer token');
      expect(page.nextCursor, 'next');
    });

    test('sends a pack change as PATCH with an explicit null MRP', () async {
      await repository.updatePack(
        's1',
        'p1',
        'k-1',
        const PackChange(pricePaise: 100, clearMrp: true),
      );

      final request = adapter.requests.single;
      expect(request.method, 'PATCH');
      expect(request.path, '/v1/shops/s1/catalogue/products/p1/packs/k-1');
      expect(request.data, {'pricePaise': 100, 'mrpPaise': null});
    });

    test('lists a catalogue product with its chosen packs', () async {
      await repository.addFromCatalogue('s1', 'c1', {
        'cp-1': const PackPrice(
          pricePaise: 42000,
          mrpPaise: 50000,
          available: false,
        ),
      });

      final request = adapter.requests.single;
      expect(request.method, 'POST');
      expect(request.path, '/v1/shops/s1/catalogue/products');
      expect(request.data, {
        'source': 'catalogue',
        'catalogueProductId': 'c1',
        'packs': [
          {
            'cataloguePackId': 'cp-1',
            'pricePaise': 42000,
            'mrpPaise': 50000,
            'available': false,
          },
        ],
      });
    });

    test('uploads the photo in the multipart field "image"', () async {
      await repository.replaceImage(
        's1',
        'p1',
        PickedPhoto(
          bytes: Uint8List.fromList([0xFF, 0xD8, 0xFF]),
          filename: 'product-photo.jpg',
          contentType: 'image/jpeg',
        ),
      );

      final request = adapter.requests.single;
      expect(request.method, 'PUT');
      expect(request.path, '/v1/shops/s1/catalogue/products/p1/image');
      final form = request.data as FormData;
      expect(form.files.single.key, 'image');
      expect(form.files.single.value.contentType.toString(), 'image/jpeg');
    });

    test('maps not found, other shop and forbidden answers', () async {
      Future<void> answer(int status, String code) async {
        adapter = _FakeAdapter((options) => _json({'code': code}, status));
        repository = ApiShopCatalogueRepository(
          ApiClient(
            baseUrl: Uri.parse('http://api.test'),
            accessToken: () => 'token',
            dio: Dio()..httpClientAdapter = adapter,
          ),
        );
      }

      await answer(404, 'shop_not_found');
      await expectLater(
        repository.fetchProduct('s1', 'p1'),
        throwsA(isA<ShopNotFound>()),
      );
      await answer(404, 'shop_product_not_found');
      await expectLater(
        repository.fetchProduct('s1', 'p1'),
        throwsA(isA<ShopProductNotFound>()),
      );
      await answer(403, 'shop_permission_denied');
      await expectLater(
        repository.setArchived('s1', 'p1', archived: true),
        throwsA(isA<CatalogueForbidden>()),
      );
      await answer(409, 'last_pack');
      await expectLater(
        repository.removePack('s1', 'p1', 'k-1'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'last_pack')),
      );
    });
  });

  group('input', () {
    test('the image type comes from the file signature', () {
      expect(
        imageContentType(Uint8List.fromList([0xFF, 0xD8, 0xFF, 1])),
        'image/jpeg',
      );
      expect(
        imageContentType(
          Uint8List.fromList([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        ),
        'image/png',
      );
      expect(
        imageContentType(
          Uint8List.fromList(utf8.encode('RIFF\x00\x00\x00\x00WEBP')),
        ),
        'image/webp',
      );
      expect(
        imageContentType(Uint8List.fromList(utf8.encode('....ftypheic'))),
        'application/octet-stream',
      );
    });

    test('prices are read in rupees with the MRP rule', () {
      final ok = readPackPrice('1,450.50', '1500');
      expect(ok.pricePaise, 145050);
      expect(ok.mrpPaise, 150000);
      expect(ok.priceError, isNull);

      expect(
        readPackPrice('1500', '1000').priceError,
        CatalogueMessages.priceAboveMrp,
      );
      expect(readPackPrice('1500', '').mrpPaise, isNull);
      expect(readPackPrice('', '').priceError, isNotNull);
      expect(readPackPrice('100', 'abc').mrpError, contains('MRP'));
    });

    test('pack quantities follow the API rules', () {
      expect(parsePackQuantity('4').value, 4);
      expect(parsePackQuantity('0.5').value, 0.5);
      expect(parsePackQuantity('').error, 'Enter the pack quantity.');
      expect(
        parsePackQuantity('0').error,
        'The pack quantity must be more than 0.',
      );
      expect(
        parsePackQuantity('1.2345').error,
        'Use at most 3 decimals for the pack quantity.',
      );
      expect(
        parsePackQuantity('2000000').error,
        'The pack quantity is too large.',
      );
    });
  });
}
