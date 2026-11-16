/// Indian states and union territories with the API's two-letter codes
/// (apps/api/src/shops/indian-states.ts). A test checks this copy against
/// the codes in packages/api_contracts/openapi.json.
const indianStates = <({String code, String name})>[
  (code: 'AN', name: 'Andaman and Nicobar Islands'),
  (code: 'AP', name: 'Andhra Pradesh'),
  (code: 'AR', name: 'Arunachal Pradesh'),
  (code: 'AS', name: 'Assam'),
  (code: 'BR', name: 'Bihar'),
  (code: 'CH', name: 'Chandigarh'),
  (code: 'CG', name: 'Chhattisgarh'),
  (code: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu'),
  (code: 'DL', name: 'Delhi'),
  (code: 'GA', name: 'Goa'),
  (code: 'GJ', name: 'Gujarat'),
  (code: 'HR', name: 'Haryana'),
  (code: 'HP', name: 'Himachal Pradesh'),
  (code: 'JK', name: 'Jammu and Kashmir'),
  (code: 'JH', name: 'Jharkhand'),
  (code: 'KA', name: 'Karnataka'),
  (code: 'KL', name: 'Kerala'),
  (code: 'LA', name: 'Ladakh'),
  (code: 'LD', name: 'Lakshadweep'),
  (code: 'MP', name: 'Madhya Pradesh'),
  (code: 'MH', name: 'Maharashtra'),
  (code: 'MN', name: 'Manipur'),
  (code: 'ML', name: 'Meghalaya'),
  (code: 'MZ', name: 'Mizoram'),
  (code: 'NL', name: 'Nagaland'),
  (code: 'OD', name: 'Odisha'),
  (code: 'PY', name: 'Puducherry'),
  (code: 'PB', name: 'Punjab'),
  (code: 'RJ', name: 'Rajasthan'),
  (code: 'SK', name: 'Sikkim'),
  (code: 'TN', name: 'Tamil Nadu'),
  (code: 'TG', name: 'Telangana'),
  (code: 'TR', name: 'Tripura'),
  (code: 'UP', name: 'Uttar Pradesh'),
  (code: 'UK', name: 'Uttarakhand'),
  (code: 'WB', name: 'West Bengal'),
];

/// Most shops are in Kerala at first (initial market).
const defaultStateCode = 'KL';
