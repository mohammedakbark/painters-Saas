import 'package:dio/dio.dart';

/// A non-2xx API response. [code] is the RFC 9457 problem `code` (ADR 0006).
class ApiException implements Exception {
  const ApiException({this.status, this.code});

  /// Null when the API could not be reached at all.
  final int? status;
  final String? code;

  bool get isUnavailable => status == null;

  @override
  String toString() => 'ApiException(status: $status, code: $code)';
}

/// Calls the NestJS API with the signed-in user's bearer token.
class ApiClient {
  ApiClient({
    required Uri baseUrl,
    required String? Function() accessToken,
    Dio? dio,
  }) : _dio = dio ?? Dio() {
    _dio.options
      ..baseUrl = baseUrl.toString()
      ..connectTimeout = const Duration(seconds: 10)
      ..receiveTimeout = const Duration(seconds: 15)
      ..responseType = ResponseType.json
      ..headers['Accept'] = 'application/json';
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = accessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;

  /// GETs [path] and returns the decoded JSON object. Throws [ApiException].
  Future<Map<String, Object?>> getJson(String path) async {
    try {
      final response = await _dio.get<Object?>(path);
      final data = response.data;
      if (data is Map<String, Object?>) {
        return data;
      }
      throw ApiException(status: response.statusCode);
    } on DioException catch (error) {
      throw apiExceptionFrom(error);
    }
  }
}

/// Converts a Dio failure into an [ApiException], reading the problem `code`.
ApiException apiExceptionFrom(DioException error) {
  final response = error.response;
  if (response == null) {
    return const ApiException();
  }
  final body = response.data;
  final code = body is Map && body['code'] is String
      ? body['code'] as String
      : null;
  return ApiException(status: response.statusCode, code: code);
}
