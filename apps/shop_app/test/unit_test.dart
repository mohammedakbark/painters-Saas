import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shop_app/src/api/api_client.dart';
import 'package:shop_app/src/auth/auth_repository.dart';
import 'package:shop_app/src/auth/supabase_auth_repository.dart';
import 'package:shop_app/src/config/app_config.dart';
import 'package:shop_app/src/routing/router.dart';
import 'package:shop_app/src/shops/shop_models.dart';

void main() {
  group('authRedirect', () {
    test('signed-out users are sent to sign-in', () {
      expect(authRedirect(signedIn: false, location: '/shops'), '/sign-in');
      expect(authRedirect(signedIn: false, location: '/shops/x'), '/sign-in');
      expect(authRedirect(signedIn: false, location: '/sign-in'), isNull);
    });

    test('signed-in users never see sign-in', () {
      expect(authRedirect(signedIn: true, location: '/sign-in'), '/shops');
      expect(authRedirect(signedIn: true, location: '/shops/x'), isNull);
    });
  });

  group('AppConfig.parse', () {
    test('accepts http(s) URLs and a publishable key', () {
      final config = AppConfig.parse(
        supabaseUrl: 'http://10.0.2.2:54321',
        supabasePublishableKey: ' sb_publishable_x ',
        apiBaseUrl: 'http://10.0.2.2:3100',
      );
      expect(config.supabaseUrl.port, 54321);
      expect(config.supabasePublishableKey, 'sb_publishable_x');
    });

    test('names every missing or invalid value', () {
      expect(
        () => AppConfig.parse(
          supabaseUrl: '',
          supabasePublishableKey: '',
          apiBaseUrl: 'ftp://x',
        ),
        throwsA(
          isA<AppConfigError>().having((e) => e.problems, 'problems', [
            'SUPABASE_URL must be an http(s) URL.',
            'SUPABASE_PUBLISHABLE_KEY is required.',
            'API_BASE_URL must be an http(s) URL.',
          ]),
        ),
      );
    });
  });

  group('Supabase error mapping', () {
    test('request failures', () {
      expect(
        requestFailureFor(code: 'otp_disabled'),
        AuthFailureKind.notRegistered,
      );
      expect(
        requestFailureFor(code: 'over_sms_send_rate_limit'),
        AuthFailureKind.rateLimited,
      );
      expect(requestFailureFor(statusCode: '429'), AuthFailureKind.rateLimited);
      expect(
        requestFailureFor(code: 'sms_send_failed'),
        AuthFailureKind.sendFailed,
      );
      expect(requestFailureFor(), AuthFailureKind.unavailable);
    });

    test('verify failures', () {
      expect(
        verifyFailureFor(code: 'otp_expired', statusCode: '403'),
        AuthFailureKind.invalidCode,
      );
      expect(verifyFailureFor(statusCode: '429'), AuthFailureKind.rateLimited);
      expect(verifyFailureFor(code: 'x'), AuthFailureKind.unavailable);
    });
  });

  group('apiExceptionFrom', () {
    final request = RequestOptions(path: '/v1/me');

    test('reads the status and the problem code', () {
      final error = apiExceptionFrom(
        DioException(
          requestOptions: request,
          response: Response<Object?>(
            requestOptions: request,
            statusCode: 404,
            data: {'status': 404, 'code': 'shop_not_found'},
          ),
        ),
      );
      expect(error.status, 404);
      expect(error.code, 'shop_not_found');
      expect(error.isUnavailable, isFalse);
    });

    test('marks network failures as unavailable', () {
      final error = apiExceptionFrom(
        DioException.connectionError(
          requestOptions: request,
          reason: 'refused',
        ),
      );
      expect(error.isUnavailable, isTrue);
    });
  });

  test('ShopUser.fromJson reads the memberships from /v1/me', () {
    final user = ShopUser.fromJson({
      'id': 'u1',
      'email': null,
      'phone': '+919999900001',
      'displayName': 'Anil',
      'platformRole': null,
      'shopMemberships': [
        {
          'shopId': 's1',
          'shopName': 'Lakshmi Paints',
          'shopStatus': 'DRAFT',
          'role': 'MASTER',
        },
      ],
    });
    expect(user.phone, '+919999900001');
    expect(user.memberships.single.shopName, 'Lakshmi Paints');
    expect(
      shopRoleLabel(user.memberships.single.role),
      'Owner (master account)',
    );
    expect(shopStatusLabel('DRAFT'), 'Draft');
  });
}
