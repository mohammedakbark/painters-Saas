import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/customers/customer_models.dart';
import 'package:shop_app/src/customers/shop_customers_repository.dart';
import 'package:shop_app/src/features/orders/order_messages.dart';
import 'package:shop_app/src/orders/order_draft.dart';
import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/orders/shop_orders_repository.dart';
import 'package:shop_app/src/shops/shop_models.dart';

import 'support/fakes.dart';

const _liveMembership = ShopMembership(
  shopId: 'shop-a',
  shopName: 'Lakshmi Paints',
  shopStatus: 'ACTIVE',
  role: 'MASTER',
);

const _liveShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'MASTER',
);

const _staffShop = MyShop(
  id: 'shop-a',
  name: 'Lakshmi Paints',
  status: 'ACTIVE',
  myRole: 'STAFF',
);

const _royal = PackOption(
  packId: 'k-9',
  productName: 'Royal Emulsion',
  brandName: 'Demo Paints',
  packLabel: '1 L',
  pricePaise: 52000,
);

const _sunil = CustomerDetail(
  customer: ShopCustomer(
    id: 'c-1',
    name: 'Sunil Painter',
    phone: '+919131940796',
    kind: CustomerKind.painter,
    hasApp: false,
  ),
  sites: [
    CustomerSite(
      id: 's-1',
      name: 'Green Villa',
      address: 'Green Villa, near the church, Edappally',
    ),
  ],
);

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

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is AppTextField && widget.label == label,
);

Finder _search(String label) => find.byWidgetPredicate(
  (widget) => widget is AppSearchField && widget.label == label,
);

Finder _button(String label) => find.widgetWithText(AppButton, label);

void main() {
  group('draft rules', () {
    DraftLine line(int? quantity) =>
        DraftLine(pack: _royal, quantity: quantity);

    test('the total counts only valid quantities', () {
      expect(draftTotal([line(2), line(1)]), 156000);
      expect(draftTotal([line(null), line(0), line(1000)]), 0);
    });

    test('names what is missing', () {
      expect(
        checkDraft(
          customerId: null,
          lines: const [],
          fulfilment: Fulfilment.delivery,
          address: ' ',
        ),
        {
          'customer': 'Choose the customer.',
          'items': 'Add at least one item.',
          'address': 'Enter the delivery address.',
        },
      );
      expect(
        checkDraft(
          customerId: 'c',
          lines: [line(0)],
          fulfilment: Fulfilment.pickup,
          address: '',
        ),
        {'items': 'Each quantity must be from 1 to 999.'},
      );
      expect(
        checkDraft(
          customerId: 'c',
          lines: [for (var i = 0; i < 51; i++) line(1)],
          fulfilment: Fulfilment.pickup,
          address: '',
        ),
        {'items': 'An order has at most 50 items.'},
      );
    });

    test('a delivery may use the site address, but not a too short one', () {
      Map<String, String> check(String address, String? site) => checkDraft(
        customerId: 'c',
        lines: [line(1)],
        fulfilment: Fulfilment.delivery,
        address: address,
        siteAddress: site,
      );

      expect(check('', 'Green Villa, Edappally'), isEmpty);
      expect(check('abc', 'Green Villa, Edappally'), contains('address'));
      expect(check('12 MG Road', null), isEmpty);
    });

    test('the delivery charge is flat, or free from the free amount', () {
      const settings = DeliverySettings(
        enabled: true,
        chargePaise: 5000,
        freeAbovePaise: 200000,
      );
      expect(settings.chargeFor(199999), 5000);
      expect(settings.chargeFor(200000), 0);
      expect(
        const DeliverySettings(
          enabled: true,
          chargePaise: null,
          freeAbovePaise: null,
        ).chargeFor(100),
        0,
      );
    });

    test('the request leaves out what does not apply', () {
      final lines = [
        const DraftLine(pack: _royal, quantity: 2, shadeCode: ' L104 '),
      ];
      expect(
        RecordOrderRequest(
          customerId: 'c',
          lines: lines,
          fulfilment: Fulfilment.pickup,
          handedOver: false,
          deliveryAddress: '12 MG Road',
          paymentMethod: PaymentMethod.cash,
        ).toJson(),
        {
          'customerId': 'c',
          'fulfilment': 'PICKUP',
          'items': [
            {'shopProductPackId': 'k-9', 'quantity': 2, 'shadeCode': 'L104'},
          ],
          'handedOver': false,
        },
      );
      expect(
        RecordOrderRequest(
          customerId: 'c',
          siteId: 's',
          lines: lines,
          fulfilment: Fulfilment.delivery,
          handedOver: true,
          deliveryAddress: '12 MG Road',
          paymentMethod: PaymentMethod.upi,
        ).toJson(),
        containsPair('paymentMethod', 'UPI'),
      );
    });

    test('a customer keeps only active sites', () {
      final detail = CustomerDetail.fromJson({
        'id': 'c-1',
        'name': 'Sunil',
        'phone': '+919131940796',
        'kind': 'PAINTER',
        'hasApp': false,
        'sites': [
          {'id': 's1', 'name': 'A', 'address': 'Somewhere', 'archived': false},
          {'id': 's2', 'name': 'B', 'address': 'Elsewhere', 'archived': true},
        ],
      });

      expect(detail.sites.single.id, 's1');
      expect(detail.canHaveSites, isTrue);
      expect(
        const CustomerDetail(
          customer: ShopCustomer(
            id: 'c',
            name: 'App painter',
            phone: '+919999900009',
            kind: CustomerKind.painter,
            hasApp: true,
          ),
          sites: [],
        ).canHaveSites,
        isFalse,
      );
    });
  });

  group('API repositories', () {
    late _FakeAdapter adapter;

    ApiClient client(ResponseBody Function(RequestOptions options) respond) {
      adapter = _FakeAdapter(respond);
      return ApiClient(
        baseUrl: Uri.parse('http://api.test'),
        accessToken: () => 'token',
        dio: Dio()..httpClientAdapter = adapter,
      );
    }

    test('searches, reads and records customers', () async {
      final customerJson = {
        'id': 'c-1',
        'name': 'Sunil',
        'phone': '+919131940796',
        'kind': 'PAINTER',
        'hasApp': false,
        'sites': <Object?>[],
      };
      final repository = ApiShopCustomersRepository(
        client(
          (options) => options.method == 'GET' && options.path.endsWith('s')
              ? _json({
                  'items': [customerJson],
                })
              : _json(customerJson),
        ),
      );

      final found = await repository.search('s1', 'sunil');
      await repository.fetch('s1', 'c-1');
      await repository.create(
        's1',
        name: 'Sunil',
        phone: '+919131940796',
        kind: CustomerKind.painter,
      );

      expect(found.single.kind, CustomerKind.painter);
      expect(
        [for (final r in adapter.requests) '${r.method} ${r.path}'],
        [
          'GET /v1/shops/s1/customers',
          'GET /v1/shops/s1/customers/c-1',
          'POST /v1/shops/s1/customers',
        ],
      );
      expect(adapter.requests.first.queryParameters, {
        'q': 'sunil',
        'page': '1',
        'pageSize': '10',
      });
      expect(adapter.requests.last.data, {
        'name': 'Sunil',
        'phone': '+919131940796',
        'kind': 'PAINTER',
      });
    });

    test("another shop's customer is not found", () async {
      final repository = ApiShopCustomersRepository(
        client((options) => _json({'code': 'customer_not_found'}, 404)),
      );

      await expectLater(
        repository.fetch('s1', 'c-9'),
        throwsA(isA<CustomerNotFound>()),
      );
    });

    test('reads delivery settings and posts a recorded order', () async {
      final repository = ApiShopOrdersRepository(
        client(
          (options) => options.path.endsWith('/settings')
              ? _json({
                  'delivery': {
                    'enabled': true,
                    'chargePaise': 4000,
                    'freeAbovePaise': null,
                    'radiusKm': 10,
                  },
                })
              : _json({'code': 'pack_unavailable'}, 409),
        ),
      );

      final settings = await repository.deliverySettings('s1');
      expect(settings.chargeFor(999999), 4000);

      await expectLater(
        repository.record(
          's1',
          const RecordOrderRequest(
            customerId: 'c',
            lines: [DraftLine(pack: _royal, quantity: 1)],
            fulfilment: Fulfilment.pickup,
            handedOver: true,
          ),
        ),
        throwsA(isA<ApiException>()),
      );
      final request = adapter.requests.last;
      expect('${request.method} ${request.path}', 'POST /v1/shops/s1/orders');
      expect(request.data, containsPair('handedOver', true));
    });
  });

  group('new order screen', () {
    late FakeShopOrdersRepository orders;
    late FakeShopCustomersRepository customers;

    setUp(() {
      orders = FakeShopOrdersRepository(
        orders: {'shop-a': []},
        packs: const [_royal],
      );
      customers = FakeShopCustomersRepository(customers: [_sunil]);
    });

    Future<void> openOrders(
      WidgetTester tester, {
      MyShop shop = _liveShop,
    }) async {
      tester.view.physicalSize = const Size(1080, 4500);
      tester.view.devicePixelRatio = 2.5;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        testApp(
          auth: FakeAuthRepository(signedIn: true),
          shops: FakeShopAccessRepository(
            memberships: [_liveMembership],
            shops: {'shop-a': shop},
          ),
          orders: orders,
          customers: customers,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lakshmi Paints'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('New orders, packing, payment and returns'));
      await tester.pumpAndSettle();
    }

    Future<void> openNewOrder(
      WidgetTester tester, {
      MyShop shop = _liveShop,
    }) async {
      await openOrders(tester, shop: shop);
      await tester.tap(_button('New order'));
      await tester.pumpAndSettle();
    }

    Future<void> searchFor(
      WidgetTester tester,
      String label,
      String text,
    ) async {
      await tester.enterText(_search(label), text);
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
    }

    Future<void> chooseSunil(WidgetTester tester) async {
      await searchFor(tester, 'Find the customer', 'sunil');
      await tester.tap(find.text('Sunil Painter'));
      await tester.pumpAndSettle();
    }

    Future<void> addRoyal(WidgetTester tester) async {
      await searchFor(tester, 'Add a product', 'royal');
      // The result card comes before a line of the same pack.
      await tester.tap(find.text('Royal Emulsion · 1 L').first);
      await tester.pumpAndSettle();
    }

    Future<void> tapButton(WidgetTester tester, String label) async {
      await tester.ensureVisible(_button(label));
      await tester.pumpAndSettle();
      await tester.tap(_button(label));
      await tester.pumpAndSettle();
    }

    testWidgets('only a Live shop has the New order button', (tester) async {
      orders.orders['shop-a'] = [];
      await openOrders(
        tester,
        shop: const MyShop(
          id: 'shop-a',
          name: 'Lakshmi Paints',
          status: 'DRAFT',
          myRole: 'MASTER',
        ),
      );

      expect(_button('New order'), findsNothing);
    });

    testWidgets('says what is missing before saving', (tester) async {
      await openNewOrder(tester);

      await tapButton(tester, 'Save as new order');

      expect(find.text('Choose the customer.'), findsOneWidget);
      expect(find.text('Add at least one item.'), findsOneWidget);
      expect(find.text(OrderMessages.notSaved), findsOneWidget);
      expect(orders.recorded, isEmpty);
    });

    testWidgets('records a delivery to a painter\'s site as a new order', (
      tester,
    ) async {
      await openNewOrder(tester);

      await chooseSunil(tester);
      expect(find.text('+91 91319 40796'), findsOneWidget);
      expect(find.text('Painter'), findsOneWidget);
      await tester.tap(find.text('No site'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Green Villa').last);
      await tester.pumpAndSettle();

      await addRoyal(tester);
      await tester.enterText(_field('Quantity of Royal Emulsion · 1 L'), '3');
      await tester.enterText(_field('Shade code'), 'L104');
      await tester.pumpAndSettle();
      expect(find.text('₹1,560'), findsNWidgets(4));

      await tester.tap(find.text('Delivery'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Leave empty to deliver to Green Villa'),
        findsOneWidget,
      );
      expect(find.text('₹50'), findsOneWidget);
      expect(find.text('₹1,610'), findsOneWidget);

      await tapButton(tester, 'Save as new order');

      expect(find.text(OrderMessages.orderSaved), findsOneWidget);
      expect(find.text('Order #2001'), findsNWidgets(2));
      expect(find.text(OrderMessages.recordedByShop), findsOneWidget);
      final request = orders.recorded.single;
      expect(request.customerId, 'c-1');
      expect(request.siteId, 's-1');
      expect(request.fulfilment, Fulfilment.delivery);
      expect(request.deliveryAddress, isNull);
      expect(request.handedOver, isFalse);
      expect(request.lines.single.toJson(), {
        'shopProductPackId': 'k-9',
        'quantity': 3,
        'shadeCode': 'L104',
      });
    });

    testWidgets('adds a customer and records a paid counter sale', (
      tester,
    ) async {
      await openNewOrder(tester);

      await tester.tap(_button('Add customer'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Name'), 'Meera');
      await tester.enterText(_field('Mobile number'), '12345');
      await tester.tap(_button('Add customer').last);
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.phoneInvalid), findsOneWidget);
      expect(find.text('Choose Painter or Customer.'), findsOneWidget);

      await tester.enterText(_field('Mobile number'), '98765 43210');
      await tester.tap(find.text('Customer'));
      await tester.pumpAndSettle();
      customers.nextError = const ApiException(
        status: 409,
        code: 'customer_phone_taken',
        fieldErrors: {
          'phone': 'This mobile number is already in your customers.',
        },
      );
      await tester.tap(_button('Add customer').last);
      await tester.pumpAndSettle();
      expect(
        find.text('This mobile number is already in your customers.'),
        findsOneWidget,
      );

      await tester.tap(_button('Add customer').last);
      await tester.pumpAndSettle();
      expect(find.text('Meera'), findsOneWidget);
      expect(find.text('+91 98765 43210'), findsOneWidget);
      expect(customers.customers.last.customer.phone, '+919876543210');

      await addRoyal(tester);
      await addRoyal(tester);
      expect(
        tester
            .widget<AppTextField>(_field('Quantity of Royal Emulsion · 1 L'))
            .controller!
            .text,
        '2',
        reason: 'adding the same pack again adds one more',
      );

      await tester.ensureVisible(find.text('Not paid yet'));
      await tester.tap(find.text('Not paid yet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('UPI').last);
      await tester.pumpAndSettle();
      await tapButton(tester, 'Handed over now');

      expect(find.text(OrderMessages.orderSaved), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
      final request = orders.recorded.single;
      expect(request.handedOver, isTrue);
      expect(request.paymentMethod, PaymentMethod.upi);
      expect(request.toJson(), isNot(contains('deliveryAddress')));
    });

    testWidgets('staff record orders but not payments', (tester) async {
      await openNewOrder(tester, shop: _staffShop);

      expect(find.text('Not paid yet'), findsNothing);
      await chooseSunil(tester);
      await addRoyal(tester);
      await tapButton(tester, 'Handed over now');

      expect(orders.recorded.single.paymentMethod, isNull);
      expect(find.text('Unpaid'), findsOneWidget);
    });

    testWidgets('removes a line and explains an API refusal', (tester) async {
      await openNewOrder(tester);
      await chooseSunil(tester);
      await addRoyal(tester);

      await tapButton(tester, 'Remove');
      expect(find.text('No items yet.'), findsOneWidget);

      await addRoyal(tester);
      orders.nextError = const ApiException(
        status: 409,
        code: 'pack_unavailable',
        detail: 'Royal Emulsion 1 L is not available any more.',
      );
      await tapButton(tester, 'Save as new order');

      expect(find.text(OrderMessages.notSaved), findsOneWidget);
      expect(
        find.text('Royal Emulsion 1 L is not available any more.'),
        findsOneWidget,
      );
      expect(_button('Save as new order'), findsOneWidget);
      expect(orders.recorded, isEmpty);
    });

    testWidgets('warns when delivery is off and needs an address', (
      tester,
    ) async {
      orders.delivery = const DeliverySettings(
        enabled: false,
        chargePaise: null,
        freeAbovePaise: null,
      );
      await openNewOrder(tester);
      await searchFor(tester, 'Find the customer', 'nobody');
      expect(find.text(OrderMessages.noCustomerMatch), findsOneWidget);

      await chooseSunil(tester);
      await addRoyal(tester);
      await tester.tap(find.text('Delivery'));
      await tester.pumpAndSettle();
      expect(find.text(OrderMessages.deliveryOff), findsOneWidget);

      await tapButton(tester, 'Save as new order');
      expect(find.text('Enter the delivery address.'), findsNWidgets(2));
      expect(orders.recorded, isEmpty);
    });
  });
}
