import 'dart:typed_data';

import 'package:image_picker/image_picker.dart';

/// A photo chosen on the phone, ready to upload.
class PickedPhoto {
  const PickedPhoto({
    required this.bytes,
    required this.filename,
    required this.contentType,
  });

  final Uint8List bytes;
  final String filename;

  /// From the file's first bytes; the API checks the real format again.
  final String contentType;
}

/// Where the photo comes from.
enum PhotoSource { camera, gallery }

/// Takes or chooses a product photo. Swapped for a fake in tests, like
/// `LocationService`.
abstract interface class ProductPhotoPicker {
  /// Null when the user cancels.
  Future<PickedPhoto?> pick(PhotoSource source);
}

/// Longest side the app uploads. The API keeps at most 1600 px, so this
/// leaves room for its own resizing while keeping uploads small.
const double _maxSide = 2400;

/// JPEG quality when the picker re-encodes the photo. Re-encoding also turns
/// iPhone HEIC photos into JPEG, which the API accepts.
const int _jpegQuality = 85;

/// The image type from the file signature, or a generic type the API rejects
/// with its own clear message.
String imageContentType(Uint8List bytes) {
  if (bytes.length >= 3 &&
      bytes[0] == 0xFF &&
      bytes[1] == 0xD8 &&
      bytes[2] == 0xFF) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 &&
      bytes[0] == 0x89 &&
      bytes[1] == 0x50 &&
      bytes[2] == 0x4E &&
      bytes[3] == 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 12 &&
      String.fromCharCodes(bytes.sublist(0, 4)) == 'RIFF' &&
      String.fromCharCodes(bytes.sublist(8, 12)) == 'WEBP') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

/// The system camera and photo picker (`image_picker`).
class ImagePickerProductPhotoPicker implements ProductPhotoPicker {
  ImagePickerProductPhotoPicker([ImagePicker? picker])
    : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<PickedPhoto?> pick(PhotoSource source) async {
    final file = await _picker.pickImage(
      source: source == PhotoSource.camera
          ? ImageSource.camera
          : ImageSource.gallery,
      maxWidth: _maxSide,
      maxHeight: _maxSide,
      imageQuality: _jpegQuality,
      requestFullMetadata: false,
    );
    if (file == null) {
      return null;
    }
    final bytes = await file.readAsBytes();
    final contentType = imageContentType(bytes);
    final extension = switch (contentType) {
      'image/jpeg' => 'jpg',
      'image/png' => 'png',
      'image/webp' => 'webp',
      _ => 'bin',
    };
    return PickedPhoto(
      bytes: bytes,
      filename: 'product-photo.$extension',
      contentType: contentType,
    );
  }
}
