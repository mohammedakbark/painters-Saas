import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/features/orders/order_messages.dart';
import 'package:shop_app/src/features/orders/order_sheets.dart';
import 'package:shop_app/src/orders/order_labels.dart';
import 'package:shop_app/src/orders/order_models.dart';
import 'package:shop_app/src/orders/order_providers.dart';
import 'package:shop_app/src/orders/shop_orders_repository.dart';
import 'package:shop_app/src/shops/shop_access_repository.dart';

import 'support/order_fakes.dart';

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

const _customer = {
  'id': 'c1',
  'name': 'Anil Kumar',
  'phone': '+919876543210',
  'hasApp': true,
};

Map<String, Object?> _detailJson() => {
  'id': 'o1',
  'number': 1027,
  'status': 'PACKING',
  'fulfilment': 'DELIVERY',
  'customer': _customer,
  'siteLabel': 'Villa 4',
  'source': 'APP',
  'delivery': {
    'address': '14 Beach Road',
    'latitude': 9.97,
    'longitude': 76.28,
    'distanceKm': 3.4,
  },
  'items': [
    {
      'id': 'i1',
      'position': 1,
      'shopProductPackId': 'k1',
      'productName': 'Silk Emulsion',
      'brandName': 'Demo Paints',
      'packLabel': '4 L',
      'shadeCode': 'L104',
      'shadeName': null,
      'unitPricePaise': 145000,
      'quantity': 3,
      'returnedQuantity': 1,
      'countedPaise': 290000,
      'status': 'OK',
      'shopNote': null,
      'substituteForId': null,
    },
  ],
  'totals': {
    'itemsPaise': 290000,
    'deliveryChargePaise': 5000,
    'totalPaise': 295000,
  },
  'payment': {'status': 'UNPAID', 'method': null, 'paidAt': null},
  'cancelled': null,
  'placedAt': '2026-11-10T05:12:00.000Z',
  'readyAt': null,
  'completedAt': null,
  'nextSteps': ['OUT_FOR_DELIVERY', 'CANCELLED'],
  'canEditItems': true,
  'canRecordPayment': false,
  'canReturnItems': false,
  'events': [
    {
      'id': 'e1',
      'type': 'placed',
      'actor': 'CUSTOMER',
      'data': <String, Object?>{},
      'createdAt': '2026-11-10T05:12:00.000Z',
    },
  ],
};

Map<String, Object?> _listJson() => {
  'items': [
    {
      'id': 'o1',
      'number': 1027,
      'placedAt': '2026-11-10T05:12:00.000Z',
      'status': 'NEW',
      'fulfilment': 'PICKUP',
      'customer': _customer,
      'siteLabel': null,
      'source': 'SHOP',
      'itemCount': 2,
      'notAvailableCount': 1,
      'totalPaise': 90000,
      'paymentStatus': 'PAID',
    },
  ],
  'total': 31,
  'page': 1,
  'pageSize': 25,
  'counts': {
    'all': 40,
    'open': 31,
    'ready': 4,
    'NEW': 20,
    'PACKING': 7,
    'READY_FOR_PICKUP': 3,
    'OUT_FOR_DELIVERY': 1,
    'COMPLETED': 8,
    'CANCELLED': 1,
  },
};

OrderEvent _event(
  String type, {
  Map<String, Object?> data = const {},
  bool byCustomer = false,
}) => OrderEvent(
  id: 'e',
  type: type,
  byCustomer: byCustomer,
  data: data,
  createdAt: DateTime.utc(2026, 11, 10),
);

void main() {
  group('models', () {
    test('an order with delivery, items and what the shop may do', () {
      final order = OrderDetail.fromJson(_detailJson());

      expect(order.number, 1027);
      expect(order.status, OrderStatus.packing);
      expect(order.fulfilment, Fulfilment.delivery);
      expect(order.recordedByShop, isFalse);
      expect(order.delivery?.distanceKm, 3.4);
      expect(order.items.single.returnableQuantity, 2);
      expect(order.totalPaise, 295000);
      expect(order.paid, isFalse);
      expect(order.nextStep, OrderStatus.outForDelivery);
      expect(order.canCancel, isTrue);
      expect(order.cancelledByCustomer, isNull);
      expect(order.events.single.byCustomer, isTrue);
    });

    test('a cancelled, paid order', () {
      final order = OrderDetail.fromJson({
        ..._detailJson(),
        'status': 'CANCELLED',
        'delivery': null,
        'nextSteps': <String>[],
        'payment': {
          'status': 'PAID',
          'method': 'BANK_TRANSFER',
          'paidAt': '2026-11-10T07:00:00.000Z',
        },
        'cancelled': {
          'by': 'CUSTOMER',
          'reason': 'Ordered twice',
          'at': '2026-11-10T06:00:00.000Z',
        },
      });

      expect(order.nextStep, isNull);
      expect(order.canCancel, isFalse);
      expect(order.paymentMethod, PaymentMethod.bankTransfer);
      expect(order.cancelledByCustomer, isTrue);
      expect(order.cancelReason, 'Ordered twice');
    });

    test('a list page with a count for every tab', () {
      final page = OrderListPage.fromJson(_listJson());

      final row = page.items.single;
      expect(row.recordedByShop, isTrue);
      expect(row.paid, isTrue);
      expect(row.notAvailableCount, 1);
      expect(page.total, 31);
      expect(page.counts, {
        OrderTab.open: 31,
        OrderTab.newOrders: 20,
        OrderTab.packing: 7,
        OrderTab.ready: 4,
        OrderTab.completed: 8,
        OrderTab.cancelled: 1,
        OrderTab.all: 40,
      });
    });

    test('order figures', () {
      final summary = OrderSummary.fromJson({
        'new': 3,
        'packing': 2,
        'ready': 1,
        'unpaid': {'count': 4, 'totalPaise': 120000},
        'today': {'placed': 5, 'completed': 2, 'salesPaise': 80000},
      });

      expect(summary.newOrders, 3);
      expect(summary.unpaidPaise, 120000);
      expect(summary.todaySalesPaise, 80000);
    });

    test('only available packs of products still in the catalogue', () {
      final packs = packOptionsFromRows({
        'items': [
          {
            'name': 'Silk Emulsion',
            'brandName': 'Demo Paints',
            'catalogueActive': true,
            'packs': [
              {
                'id': 'k1',
                'label': '1 L',
                'pricePaise': 45000,
                'available': true,
              },
              {'id': 'k4', 'label': '4 L', 'pricePaise': 1, 'available': false},
            ],
          },
          {
            'name': 'Removed',
            'brandName': null,
            'catalogueActive': false,
            'packs': [
              {'id': 'k9', 'label': '1 L', 'pricePaise': 1, 'available': true},
            ],
          },
        ],
      });

      expect(packs.single.packId, 'k1');
      expect(packs.single.pricePaise, 45000);
    });

    test('an unknown tab in a link opens the open orders', () {
      expect(OrderTab.fromApi('NEW'), OrderTab.newOrders);
      expect(OrderTab.fromApi('nonsense'), OrderTab.open);
      expect(OrderTab.fromApi(null), OrderTab.open);
    });
  });

  group('labels', () {
    test('every status has its own words, and opposite ones differ', () {
      expect(orderStatusLabel(OrderStatus.newOrder), 'New');
      expect(orderStatusTone(OrderStatus.newOrder), AppTone.info);
      expect(orderStatusTone(OrderStatus.packing), AppTone.warning);
      expect(orderStatusTone(OrderStatus.readyForPickup), AppTone.success);
      expect(orderStatusTone(OrderStatus.completed), AppTone.neutral);
      expect(orderStatusTone(OrderStatus.cancelled), AppTone.error);
    });

    test('the next step follows pickup or delivery', () {
      expect(
        nextStepFor(OrderStatus.newOrder, Fulfilment.pickup),
        OrderStatus.packing,
      );
      expect(
        nextStepFor(OrderStatus.packing, Fulfilment.pickup),
        OrderStatus.readyForPickup,
      );
      expect(
        nextStepFor(OrderStatus.packing, Fulfilment.delivery),
        OrderStatus.outForDelivery,
      );
      expect(
        nextStepFor(OrderStatus.outForDelivery, Fulfilment.delivery),
        OrderStatus.completed,
      );
      expect(nextStepFor(OrderStatus.completed, Fulfilment.pickup), isNull);
      expect(nextStepFor(OrderStatus.cancelled, Fulfilment.pickup), isNull);
      expect(stepActionLabel(OrderStatus.packing), 'Start packing');
    });

    test('times are Indian time, with today and yesterday in words', () {
      // 12 Nov 2026, 10:00 am IST.
      final now = DateTime.utc(2026, 11, 12, 4, 30);

      expect(
        formatOrderTime(DateTime.utc(2026, 11, 12, 5, 12), now: now),
        'Today, 10:42 am',
      );
      // 11 Nov, 6:05 pm IST.
      expect(
        formatOrderTime(DateTime.utc(2026, 11, 11, 12, 35), now: now),
        'Yesterday, 6:05 pm',
      );
      // 11 Nov 2026, 11:50 pm UTC is already 12 Nov in India.
      expect(
        formatOrderTime(DateTime.utc(2026, 11, 11, 18, 50), now: now),
        'Today, 12:20 am',
      );
      expect(
        formatOrderTime(DateTime.utc(2026, 11, 3, 3, 40), now: now),
        '3 Nov 2026, 9:10 am',
      );
      expect(formatIstTime(DateTime.utc(2026, 11, 3, 6, 30)), '12:00 pm');
    });

    test('timeline entries read as sentences', () {
      expect(
        eventSentence(_event('placed', byCustomer: true)),
        'Order placed by the customer.',
      );
      expect(
        eventSentence(_event('recorded', data: {'handedOver': true})),
        'Recorded by the shop and handed over.',
      );
      expect(
        eventSentence(_event('status_changed', data: {'to': 'PACKING'})),
        'Moved to packing.',
      );
      expect(
        eventSentence(
          _event('status_changed', data: {'to': 'CANCELLED'}, byCustomer: true),
        ),
        'Cancelled by the customer.',
      );
      expect(
        eventSentence(_event('paid', data: {'method': 'UPI'})),
        'Paid by UPI.',
      );
      expect(
        eventSentence(
          _event('item_returned', data: {'quantity': 2, 'reason': 'Damaged'}),
        ),
        '2 units returned. Reason: Damaged',
      );
      expect(eventSentence(_event('something_new')), 'Order updated.');
    });

    test('small helpers', () {
      expect(formatPhone('+919876543210'), '+91 98765 43210');
      expect(formatPhone('+4412345'), '+4412345');
      expect(itemCountLabel(1), '1 item');
      expect(itemCountLabel(3), '3 items');
      expect(quantityTimesPrice(2, 45000), '2 × ₹450');
      expect(OrderMessages.newOrders(1), '1 new order');
      expect(OrderMessages.newOrders(2), '2 new orders');
      expect(itemStatusBadge(OrderItemStatus.ok), isNull);
      expect(
        itemStatusBadge(OrderItemStatus.notAvailable)?.label,
        'Not available',
      );
    });

    test('quantities are whole numbers within the limit', () {
      expect(parseQuantity(' 12 '), 12);
      expect(parseQuantity('0'), isNull);
      expect(parseQuantity('1000'), isNull);
      expect(parseQuantity('2', max: 1), isNull);
      expect(parseQuantity('1.5'), isNull);
      expect(parseQuantity(''), isNull);
    });
  });

  group('new orders check', () {
    FakeOrder at(String id, int minute) =>
        FakeOrder(id, 1000, placedAt: DateTime.utc(2026, 11, 10, 5, minute));

    test('counts only orders placed after the newest one shown', () {
      final before = [at('a', 10).toRow(), at('b', 5).toRow()];
      final after = [at('d', 30).toRow(), at('c', 20).toRow(), ...before];

      expect(newOrdersIn(before, after), 2);
      expect(newOrdersIn(before, before), 0);
      // An older order that moved into the tab is not "new".
      expect(newOrdersIn(before, [...before, at('old', 1).toRow()]), 0);
      expect(newOrdersIn(const [], after), 4);
    });
  });

  group('API repository', () {
    late _FakeAdapter adapter;
    late ApiShopOrdersRepository repository;

    void answerWith(ResponseBody Function(RequestOptions options) respond) {
      adapter = _FakeAdapter(respond);
      repository = ApiShopOrdersRepository(
        ApiClient(
          baseUrl: Uri.parse('http://api.test'),
          accessToken: () => 'token',
          dio: Dio()..httpClientAdapter = adapter,
        ),
      );
    }

    setUp(() => answerWith((options) => _json(_detailJson())));

    test('lists a tab with search and filters', () async {
      answerWith((options) => _json(_listJson()));

      final page = await repository.list('s1', (
        tab: OrderTab.ready,
        query: 'anil',
        fulfilment: Fulfilment.delivery,
        paid: false,
      ), page: 2);

      final request = adapter.requests.single;
      expect(request.method, 'GET');
      expect(request.path, '/v1/shops/s1/orders');
      expect(request.queryParameters, {
        'status': 'ready',
        'page': '2',
        'pageSize': '25',
        'q': 'anil',
        'fulfilment': 'DELIVERY',
        'payment': 'UNPAID',
      });
      expect(request.headers['Authorization'], 'Bearer token');
      expect(page.items, hasLength(1));
    });

    test('leaves out filters that are not set', () async {
      answerWith((options) => _json(_listJson()));

      await repository.list('s1', (
        tab: OrderTab.open,
        query: '',
        fulfilment: null,
        paid: null,
      ));

      expect(adapter.requests.single.queryParameters, {
        'status': 'open',
        'page': '1',
        'pageSize': '25',
      });
    });

    test('sends each action to its route', () async {
      await repository.changeStatus('s1', 'o1', OrderStatus.packing);
      await repository.changeStatus(
        's1',
        'o1',
        OrderStatus.cancelled,
        reason: 'Out of stock',
      );
      await repository.markNotAvailable('s1', 'o1', 'i1', 'Out of stock');
      await repository.offerSubstitute(
        's1',
        'o1',
        'i1',
        const SubstituteOffer(packId: 'k2', quantity: 2, shadeCode: 'L1'),
      );
      await repository.recordPayment('s1', 'o1', PaymentMethod.bankTransfer);
      await repository.returnItem(
        's1',
        'o1',
        'i1',
        quantity: 1,
        reason: 'Damaged',
      );

      expect(
        [for (final r in adapter.requests) '${r.method} ${r.path}'],
        [
          'POST /v1/shops/s1/orders/o1/status',
          'POST /v1/shops/s1/orders/o1/status',
          'POST /v1/shops/s1/orders/o1/items/i1/not-available',
          'POST /v1/shops/s1/orders/o1/items/i1/substitute',
          'POST /v1/shops/s1/orders/o1/payment',
          'POST /v1/shops/s1/orders/o1/items/i1/return',
        ],
      );
      expect(
        [for (final r in adapter.requests) r.data],
        [
          {'to': 'PACKING'},
          {'to': 'CANCELLED', 'reason': 'Out of stock'},
          {'message': 'Out of stock'},
          {'shopProductPackId': 'k2', 'quantity': 2, 'shadeCode': 'L1'},
          {'method': 'BANK_TRANSFER'},
          {'quantity': 1, 'reason': 'Damaged'},
        ],
      );
    });

    test('reads ready messages and searches available packs', () async {
      answerWith(
        (options) => options.path.endsWith('/settings')
            ? _json({
                'orderMessages': ['Out of stock today'],
              })
            : _json({'items': <Object?>[]}),
      );

      expect(await repository.orderMessages('s1'), ['Out of stock today']);
      expect(await repository.searchPacks('s1', 'silk'), isEmpty);

      final search = adapter.requests.last;
      expect(search.path, '/v1/shops/s1/catalogue/product-rows');
      expect(search.queryParameters['q'], 'silk');
      expect(search.queryParameters['status'], 'ACTIVE');
    });

    test('maps other shop, not found, forbidden and conflict', () async {
      void answer(int status, String code) => answerWith(
        (options) => _json({'code': code, 'detail': 'Explained.'}, status),
      );

      answer(404, 'shop_not_found');
      await expectLater(
        repository.fetch('s2', 'o1'),
        throwsA(isA<ShopNotFound>()),
      );
      answer(404, 'order_not_found');
      await expectLater(
        repository.fetch('s1', 'o9'),
        throwsA(isA<OrderNotFound>()),
      );
      answer(404, 'order_item_not_found');
      await expectLater(
        repository.markNotAvailable('s1', 'o1', 'i9', 'No stock'),
        throwsA(isA<OrderNotFound>()),
      );
      answer(403, 'shop_permission_denied');
      await expectLater(
        repository.recordPayment('s1', 'o1', PaymentMethod.cash),
        throwsA(isA<OrdersForbidden>()),
      );
      answer(409, 'order_status_invalid');
      await expectLater(
        repository.changeStatus('s1', 'o1', OrderStatus.packing),
        throwsA(
          isA<ApiException>().having(
            (e) => orderErrorMessage(e),
            'message',
            'Explained.',
          ),
        ),
      );
    });
  });

  test('error sentences', () {
    expect(orderErrorMessage(const OrdersForbidden()), OrderMessages.forbidden);
    expect(orderErrorMessage(const ApiException()), OrderMessages.offline);
    expect(
      orderErrorMessage(const ApiException(status: 500, detail: 'Internal')),
      OrderMessages.failed,
    );
  });
}
