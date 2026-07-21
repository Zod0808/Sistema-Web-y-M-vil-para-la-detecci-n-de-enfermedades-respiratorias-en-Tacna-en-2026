// Time-shift all Date fields in respicare_dev so the most recent record lands "now".
// Usage:
//   docker exec -i respicare-mongodb-dev mongosh -u admin -p change_this_password \
//     --authenticationDatabase admin --quiet < backend/scripts/shift-timestamps.js
//
// Idempotent: running it a second time computes shift=0 (approximately) and skips writes.

const d = db.getSiblingDB('respicare_dev');
const now = new Date();

// ── 1. Find global max createdAt/timestamp across collections ────────────
const collections = d.getCollectionNames().sort();
let globalMax = new Date(0);
let maxCol = '';
let maxField = '';

const candidateFields = ['createdAt', 'timestamp', 'generatedAt', 'scheduledAt'];
// Collections that are auto-populated at runtime (skew the max calculation)
const excludeFromMax = new Set(['auditlogs', 'sessions', 'chatconversations', 'automaticreports', 'notifications']);

collections.forEach(c => {
  if (excludeFromMax.has(c)) return;
  candidateFields.forEach(f => {
    try {
      const q = {}; q[f] = { $exists: true, $type: 'date' };
      const s = {}; s[f] = -1;
      const r = d[c].find(q).sort(s).limit(1).toArray();
      if (r.length && r[0][f] instanceof Date && r[0][f] > globalMax) {
        globalMax = r[0][f];
        maxCol = c; maxField = f;
      }
    } catch (e) {}
  });
});

if (globalMax.getTime() === 0) {
  print('No dated documents found — nothing to do.');
  quit();
}

const shiftMs = now.getTime() - globalMax.getTime();
const shiftDays = shiftMs / 86400000;
print('Global max      : ' + globalMax.toISOString() + '  (' + maxCol + '.' + maxField + ')');
print('Target (now)    : ' + now.toISOString());
print('Shift           : ' + shiftDays.toFixed(2) + ' days');

if (Math.abs(shiftDays) < 1) {
  print('Shift < 1 day — nothing to do.');
  quit();
}

// ── 2. For each collection, discover Date fields (top-level + nested one level) ───
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

collections.forEach(c => {
  // Sample up to 5 docs to detect date fields (some may only appear in a subset)
  const samples = d[c].find({}).limit(5).toArray();
  const dateFieldSet = new Set();
  samples.forEach(s => discoverDateFields(s, '').forEach(f => dateFieldSet.add(f)));
  const dateFields = [...dateFieldSet];
  if (!dateFields.length) return;

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
      if (cur instanceof Date) {
        update[fpath] = new Date(cur.getTime() + shiftMs);
      }
    });
    if (Object.keys(update).length) {
      d[c].updateOne({ _id: doc._id }, { $set: update });
      shifted++;
    }
  }
  print('  ' + c + ': shifted ' + shifted + ' docs (fields: ' + dateFields.join(', ') + ')');
});

print('\nDone.');
