import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';

import 'app.dart';

void main() {
  // The Customer App's own identity (D-057), picked before anything is built.
  AppPalette.use(AppPalette.customerApp);
  runApp(const CustomerApp());
}
