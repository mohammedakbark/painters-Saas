import 'dart:typed_data';

import 'package:dio/dio.dart';

/// A non-2xx API response, from the RFC 9457 problem body (ADR 0006). Only
/// the problem's code, detail and field messages are kept; request and
/// response bodies are never logged or kept.
class ApiException implements Exception {
  const ApiException({
    this.status,
    this.code,
    this.detail,
    this.fieldErrors = const {},
  });

  /// Null when the API could not be reached at all.
  final int? status;
  final String? code;

  /// The API's user-facing explanation, for example why a pack can't be
  /// removed.
  final String? detail;

  /// Field path (for example `pricePaise` or `packs.0.mrpPaise`) → message.
  final Map<String, String> fieldErrors;

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

  /// GETs [path] (with optional [query] values) and returns the decoded JSON
  /// object. Throws [ApiException].
  Future<Map<String, Object?>> getJson(
    String path, {
    Map<String, String>? query,
  }) => _send(() => _dio.get<Object?>(path, queryParameters: query));

  /// PUTs a JSON [body] to [path] and returns the decoded JSON object.
  /// Throws [ApiException].
  Future<Map<String, Object?>> putJson(
    String path,
    Map<String, Object?> body,
  ) => _send(() => _dio.put<Object?>(path, data: body));

  /// POSTs a JSON [body]. Throws [ApiException].
  Future<Map<String, Object?>> postJson(
    String path,
    Map<String, Object?> body,
  ) => _send(() => _dio.post<Object?>(path, data: body));

  /// PATCHes [path] with a JSON [body]. Throws [ApiException].
  Future<Map<String, Object?>> patchJson(
    String path,
    Map<String, Object?> body,
  ) => _send(() => _dio.patch<Object?>(path, data: body));

  /// DELETEs [path] and returns the JSON object the API sends back.
  /// Throws [ApiException].
  Future<Map<String, Object?>> deleteJson(String path) =>
      _send(() => _dio.delete<Object?>(path));

  /// PUTs one file as `multipart/form-data` in the form field [field].
  /// Throws [ApiException].
  Future<Map<String, Object?>> putMultipart(
    String path, {
    required String field,
    required Uint8List bytes,
    required String filename,
    required String contentType,
  }) => _send(
    () => _dio.put<Object?>(
      path,
      data: FormData.fromMap({
        field: MultipartFile.fromBytes(
          bytes,
          filename: filename,
          contentType: DioMediaType.parse(contentType),
        ),
      }),
      // Uploads can take longer than JSON requests on mobile networks.
      options: Options(sendTimeout: const Duration(seconds: 60)),
    ),
  );

  Future<Map<String, Object?>> _send(
    Future<Response<Object?>> Function() request,
  ) async {
    try {
      final response = await request();
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

/// Converts a Dio failure into an [ApiException], reading the problem `code`,
/// `detail` and field `errors`.
ApiException apiExceptionFrom(DioException error) {
  final response = error.response;
  if (response == null) {
    return const ApiException();
  }
  final body = response.data;
  if (body is! Map) {
    return ApiException(status: response.statusCode);
  }
  final code = body['code'];
  final detail = body['detail'];
  final fieldErrors = <String, String>{};
  final errors = body['errors'];
  if (errors is List) {
    for (final entry in errors) {
      if (entry is Map && entry['message'] is String) {
        final path = entry['path'];
        fieldErrors.putIfAbsent(
          path is String ? path : '',
          () => entry['message'] as String,
        );
      }
    }
  }
  return ApiException(
    status: response.statusCode,
    code: code is String ? code : null,
    detail: detail is String ? detail : null,
    fieldErrors: fieldErrors,
  );
}
