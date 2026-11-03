/// Build-time configuration, passed with
/// `--dart-define-from-file=config/local.json` (see `config/local.example.json`).
///
/// Only non-secret values belong here: the Supabase URL, the Supabase
/// **publishable** key and the API base URL. Never put a secret key in the app.
class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabasePublishableKey,
    required this.apiBaseUrl,
  });

  final Uri supabaseUrl;
  final String supabasePublishableKey;
  final Uri apiBaseUrl;

  /// Reads and validates the compile-time values. Throws [AppConfigError]
  /// naming the missing or invalid keys.
  static AppConfig fromEnvironment() => parse(
    supabaseUrl: const String.fromEnvironment('SUPABASE_URL'),
    supabasePublishableKey: const String.fromEnvironment(
      'SUPABASE_PUBLISHABLE_KEY',
    ),
    apiBaseUrl: const String.fromEnvironment('API_BASE_URL'),
  );

  static AppConfig parse({
    required String supabaseUrl,
    required String supabasePublishableKey,
    required String apiBaseUrl,
  }) {
    final problems = <String>[];
    final supabase = _httpUri(supabaseUrl);
    if (supabase == null) {
      problems.add('SUPABASE_URL must be an http(s) URL.');
    }
    if (supabasePublishableKey.trim().isEmpty) {
      problems.add('SUPABASE_PUBLISHABLE_KEY is required.');
    }
    final api = _httpUri(apiBaseUrl);
    if (api == null) {
      problems.add('API_BASE_URL must be an http(s) URL.');
    }
    if (problems.isNotEmpty) {
      throw AppConfigError(problems);
    }
    return AppConfig(
      supabaseUrl: supabase!,
      supabasePublishableKey: supabasePublishableKey.trim(),
      apiBaseUrl: api!,
    );
  }

  static Uri? _httpUri(String value) {
    final uri = Uri.tryParse(value.trim());
    final valid =
        uri != null &&
        (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.host.isNotEmpty;
    return valid ? uri : null;
  }
}

class AppConfigError extends Error {
  AppConfigError(this.problems);

  final List<String> problems;

  @override
  String toString() =>
      'Invalid Shop App configuration (see config/local.example.json): '
      '${problems.join(' ')}';
}
