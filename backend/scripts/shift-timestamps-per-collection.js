// Per-collection time-shift: each seed collection's most-recent record lands on "now"
// so a "last 30 days" dashboard query catches the most recent entries.
//
// Usage:
//   docker exec -i respicare-mongodb-dev mongosh -u admin -p change_this_password \
//     --authenticationDatabase admin --quiet < backend/scripts/shift-timestamps-per-collection.js

const d = db.getSiblingDB('respicare_dev');
const now = new Date();

// Collections we DO want to shift (seed data). Runtime-populated ones stay put.
const seedCollections = [
  'symptomreports', 'alerts', 'aianalyses', 'appointments', 'medicalhistories',
  'wearabledatas', 'wearablemetrics', 'labresults', 'prescriptions', 'referrals',
  'users', 'mlexperiments', 'consentlogs'
];

// Anchor fields (the "when did this happen" for each collection)
const anchorField = {
  symptomreports:   'reportedAt',
  alerts:           'scheduledAt',
  aianalyses:       'timestamp',
  appointments:     'scheduledAt',
  medicalhistories: 'date',
  wearabledatas:    'timestamp',
  wearablemetrics:  'lastSync',
  labresults:       'date',
  prescriptions:    'createdAt',
  referrals:        'createdAt',
  users:            'lastLogin',
  mlexperiments:    'createdAt',
  consentlogs:      'timestamp',
};

function discoverDateFields(doc, prefix) {
  const out = [];
  for (const k in doc) {
    if (!doc.hasOwnProperty(k)) continue;
    const v = doc[k];
    if (v instanceof Date) {
      out.push(prefix + k);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && v.constructor === Object) {
      out.push(...discoverDateFields(v, prefix + k + '.'));
    }
  }
  return out;
}

seedCollections.forEach(c => {
  if (!d.getCollectionNames().includes(c)) return;
  const anchor = anchorField[c];

  // Compute this collection's max
  const q = {}; q[anchor] = { $exists: true, $type: 'date' };
  const s = {}; s[anchor] = -1;
  const r = d[c].find(q).sort(s).limit(1).toArray();
  if (!r.length) { print('  ' + c + ': no anchor field (' + anchor + '), skipped'); return; }

  const colMax = r[0][anchor];
  const shiftMs = now.getTime() - colMax.getTime();
  const shiftDays = shiftMs / 86400000;

  if (Math.abs(shiftDays) < 0.5) {
    print('  ' + c + ': already current (' + colMax.toISOString() + ')');
    return;
  }

  // Discover date fields
  const samples = d[c].find({}).limit(10).toArray();
  const dateFieldSet = new Set();
  samples.forEach(sd => discoverDateFields(sd, '').forEach(f => dateFieldSet.add(f)));
  const dateFields = [...dateFieldSet];
  if (!dateFields.length) { print('  ' + c + ': no date fields'); return; }

  let shifted = 0;
  const cursor = d[c].find({});
  while (cursor.hasNext()) {
    const doc = cursor.next();
    const update = {};
    dateFields.forEach(fpath => {
      const parts = fpath.split('.');
      let cur = doc;
      for (let i = 0; i < parts.length; i++) {
        if (cur == null) return;
        cur = cur[parts[i]];
      }
      if (cur instanceof Date) update[fpath] = new Date(cur.getTime() + shiftMs);
    });
    if (Object.keys(update).length) {
      d[c].updateOne({ _id: doc._id }, { $set: update });
      shifted++;
    }
  }

  print('  ' + c + ': +' + shiftDays.toFixed(1) + 'd → ' + shifted + ' docs (fields: ' + dateFields.join(', ') + ')');
});

print('\nDone.');
