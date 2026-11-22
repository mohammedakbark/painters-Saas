import 'package:customer_app/src/location/location_service.dart';
import 'package:customer_app/src/profile/customer_profile.dart';
import 'package:customer_app/src/sites/sites.dart';
import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fakes.dart';

Finder _tab(String label) =>
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label));

const _villa = CustomerSite(
  id: 'v',
  name: 'Green Villa',
  ownerName: 'Joseph Mathew',
  address: 'Green Villa, Kakkanad, Kochi',
  latitude: 10.01,
  longitude: 76.35,
  archived: false,
);

Future<void> _painter(
  WidgetTester tester, {
  FakeSitesRepository? sites,
  FakeLocationService? location,
}) async {
  await pumpApp(
    tester,
    auth: FakeAuthRepository(signedIn: true),
    profiles: FakeCustomerProfileRepository(
      profileOf('Arun', CustomerType.painter),
    ),
    sites: sites,
    location: location,
  );
  await tester.tap(_tab('Sites'));
  await tester.pumpAndSettle();
}

/// Opens [name]'s page, then Edit site from its menu (CUS-007).
Future<void> _edit(WidgetTester tester, String name) async {
  await tapVisible(tester, find.text(name));
  await tapVisible(tester, find.byTooltip('More options'));
  await tapVisible(tester, find.text('Edit site'));
}

Future<void> _type(WidgetTester tester, String key, String text) async {
  await tester.ensureVisible(find.byKey(Key(key)));
  await tester.enterText(
    find.descendant(
      of: find.byKey(Key(key)),
      matching: find.byType(EditableText),
    ),
    text,
  );
}

void main() {
  testWidgets('a painter with no sites is told how to start', (tester) async {
    await _painter(tester);
    expect(find.text('No sites yet'), findsOneWidget);
    expect(find.byKey(const Key('add-site')), findsOneWidget);
  });

  testWidgets('adds a site with its pin from My location', (tester) async {
    final sites = FakeSitesRepository();
    final location = FakeLocationService(
      const LocationFound(latitude: 9.97, longitude: 76.28),
    );
    await _painter(tester, sites: sites, location: location);

    await tapVisible(tester, find.byKey(const Key('add-site')));
    await tapVisible(tester, find.byKey(const Key('save-site')));
    expect(find.text('Enter the site name.'), findsOneWidget);
    expect(find.text('Choose the site on the map.'), findsOneWidget);

    await _type(tester, 'site-name', 'Rahman Villa');
    await _type(tester, 'site-address', 'Rahman Villa, Edappally');
    await tapVisible(tester, find.byKey(const Key('choose-pin')));
    await tapVisible(tester, find.byKey(const Key('my-location')));
    expect(location.lastPrecise, isTrue);
    await tapVisible(tester, find.byKey(const Key('use-pin')));
    await tapVisible(tester, find.byKey(const Key('save-site')));

    expect(sites.sites.single.name, 'Rahman Villa');
    expect(sites.sites.single.latitude, 9.97);
    expect(find.text('Rahman Villa added.'), findsOneWidget);
    expect(find.text('Rahman Villa'), findsOneWidget);
  });

  testWidgets("shows the server's field message next to the field", (
    tester,
  ) async {
    final sites = FakeSitesRepository([_villa])
      ..rejectNextSave = {'name': 'You already have a site with this name.'};
    await _painter(tester, sites: sites);

    await _edit(tester, 'Green Villa');
    await tapVisible(tester, find.byKey(const Key('save-site')));
    expect(
      find.text('You already have a site with this name.'),
      findsOneWidget,
    );
  });

  testWidgets('archives a site and restores it from Archived sites', (
    tester,
  ) async {
    final sites = FakeSitesRepository([_villa]);
    await _painter(tester, sites: sites);

    await _edit(tester, 'Green Villa');
    await tapVisible(tester, find.byTooltip('More options'));
    await tapVisible(tester, find.text('Archive site'));
    await tapVisible(tester, find.text('Archive'));
    expect(sites.sites.single.archived, isTrue);
    // Back on the site's page, which keeps its history.
    expect(find.text('Archived site'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('No sites yet'), findsOneWidget);

    await tapVisible(tester, find.byTooltip('More options'));
    await tapVisible(tester, find.text('Archived sites'));
    await tapVisible(tester, find.byKey(const Key('restore-v')));
    expect(sites.sites.single.archived, isFalse);
  });

  testWidgets('a normal customer has no Sites tab', (tester) async {
    await pumpApp(
      tester,
      auth: FakeAuthRepository(signedIn: true),
      profiles: FakeCustomerProfileRepository(
        profileOf('Meera', CustomerType.customer),
      ),
    );
    expect(_tab('Sites'), findsNothing);
  });
}
