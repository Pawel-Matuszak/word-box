/**
 * Word Box: Apps Script backend.
 *
 * Bound to the "Słówka" spreadsheet. Deploy as a Web App:
 *   Execute as: Me, Who has access: Anyone
 *
 * GET  ?action=bootstrap            -> { words, levels, owners, progress }
 * POST { key, action, payload }     -> writes (body sent as text/plain to skip CORS preflight)
 *
 * Every response is { ok: true, data } or { ok: false, error }.
 */

var WORDS_SHEET = 'Main';
var LISTS_SHEET = 'Lists';
var PROGRESS_SHEET = 'Progress';
var WORD_FIELDS = ['word', 'translation', 'level', 'owner', 'notes', 'example_pl', 'example_en'];
var PROGRESS_HEADERS = ['word_id', 'user', 'box', 'due', 'correct', 'wrong', 'last_seen'];

/** Run once from the editor: sets a random write key and creates the Progress tab. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('WRITE_KEY');
  if (!key) {
    key = Utilities.getUuid().slice(0, 8);
    props.setProperty('WRITE_KEY', key);
  }
  progressSheet_();
  Logger.log('WRITE_KEY is: ' + key + ' (change it in Project Settings > Script properties)');
}

function doGet(e) {
  return respond_(function () {
    var action = (e && e.parameter && e.parameter.action) || 'bootstrap';
    if (action === 'bootstrap') return bootstrap_();
    throw new Error('Unknown action: ' + action);
  });
}

function doPost(e) {
  return respond_(function () {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkKey_(body.key);
    var handlers = {
      checkKey: function () { return true; },
      addWord: addWord_,
      updateWord: updateWord_,
      deleteWord: deleteWord_,
      recordReviews: recordReviews_,
    };
    var handler = handlers[body.action];
    if (!handler) throw new Error('Unknown action: ' + body.action);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return handler(body.payload || {});
    } finally {
      lock.releaseLock();
    }
  });
}

// ---------- reads ----------

function bootstrap_() {
  var lists = sheet_(LISTS_SHEET).getDataRange().getValues();
  return {
    words: readTable_(sheet_(WORDS_SHEET)).map(toWord_),
    levels: column_(lists, 0),
    owners: column_(lists, 1),
    progress: readTable_(progressSheet_()).map(toProgress_),
  };
}

function toWord_(r) {
  var w = { id: Number(r.id) };
  WORD_FIELDS.forEach(function (f) { w[f] = r[f] == null ? '' : String(r[f]); });
  return w;
}

function toProgress_(r) {
  return {
    word_id: Number(r.word_id),
    user: String(r.user),
    box: Number(r.box) || 0,
    due: Number(r.due) || 0,
    correct: Number(r.correct) || 0,
    wrong: Number(r.wrong) || 0,
    last_seen: Number(r.last_seen) || 0,
  };
}

// ---------- writes ----------

function addWord_(p) {
  requireText_(p, ['word', 'translation']);
  var sh = sheet_(WORDS_SHEET);
  var headers = headers_(sh);
  var nextId = readTable_(sh).reduce(function (m, r) { return Math.max(m, Number(r.id) || 0); }, 0) + 1;
  var word = { id: nextId };
  WORD_FIELDS.forEach(function (f) { word[f] = clean_(p[f]); });
  sh.appendRow(headers.map(function (h) { return h in word ? word[h] : ''; }));
  return word;
}

function updateWord_(p) {
  var sh = sheet_(WORDS_SHEET);
  var headers = headers_(sh);
  var rowIndex = findRow_(sh, 'id', p.id);
  if (rowIndex < 0) throw new Error('Word ' + p.id + ' not found');
  var range = sh.getRange(rowIndex, 1, 1, headers.length);
  var values = range.getValues()[0];
  WORD_FIELDS.forEach(function (f) {
    var col = headers.indexOf(f);
    if (f in p && col >= 0) values[col] = clean_(p[f]);
  });
  range.setValues([values]);
  var obj = {};
  headers.forEach(function (h, i) { obj[h] = values[i]; });
  return toWord_(obj);
}

function deleteWord_(p) {
  var sh = sheet_(WORDS_SHEET);
  var rowIndex = findRow_(sh, 'id', p.id);
  if (rowIndex < 0) throw new Error('Word ' + p.id + ' not found');
  sh.deleteRow(rowIndex);
  var ps = progressSheet_();
  var col = headers_(ps).indexOf('word_id');
  var data = ps.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][col]) === String(p.id)) ps.deleteRow(i + 1);
  }
  return { id: Number(p.id) };
}

/** Upserts absolute progress state per (word_id, user). Idempotent, so retries are safe. */
function recordReviews_(p) {
  var reviews = p.reviews || [];
  if (!reviews.length) return { saved: 0 };
  var sh = progressSheet_();
  var headers = headers_(sh);
  var idCol = headers.indexOf('word_id');
  var userCol = headers.indexOf('user');
  var data = sh.getDataRange().getValues();
  var index = {};
  for (var i = 1; i < data.length; i++) index[data[i][idCol] + '|' + data[i][userCol]] = i;
  var appends = [];
  var appendIndex = {};
  reviews.forEach(function (r) {
    var row = headers.map(function (h) { return r[h] == null ? '' : r[h]; });
    var k = r.word_id + '|' + r.user;
    if (k in index) data[index[k]] = row;
    else if (k in appendIndex) appends[appendIndex[k]] = row;
    else { appendIndex[k] = appends.length; appends.push(row); }
  });
  if (data.length > 1) sh.getRange(2, 1, data.length - 1, headers.length).setValues(data.slice(1));
  if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends);
  return { saved: reviews.length };
}

// ---------- helpers ----------

function respond_(fn) {
  var out;
  try {
    out = { ok: true, data: fn() };
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function checkKey_(key) {
  var expected = PropertiesService.getScriptProperties().getProperty('WRITE_KEY');
  if (!expected) throw new Error('WRITE_KEY is not set. Run setup() in the Apps Script editor.');
  if (key !== expected) throw new Error('Wrong key');
}

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function progressSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PROGRESS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PROGRESS_SHEET);
    sh.getRange(1, 1, 1, PROGRESS_HEADERS.length).setValues([PROGRESS_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

function readTable_(sh) {
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function (h) { return String(h).trim(); });
  return data.slice(1)
    .filter(function (row) { return row[0] !== '' && row[0] != null; })
    .map(function (row) {
      var o = {};
      headers.forEach(function (h, i) { if (h) o[h] = row[i]; });
      return o;
    });
}

function findRow_(sh, header, value) {
  var col = headers_(sh).indexOf(header);
  if (col < 0 || sh.getLastRow() < 2) return -1;
  var data = sh.getRange(1, col + 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(value)) return i + 1;
  }
  return -1;
}

function column_(rows, c) {
  return rows
    .map(function (r) { return r[c] == null ? '' : String(r[c]).trim(); })
    .filter(function (v) { return v !== ''; });
}

function clean_(v) {
  return v == null ? '' : String(v).trim();
}

function requireText_(p, fields) {
  fields.forEach(function (f) {
    if (!clean_(p[f])) throw new Error('Missing field: ' + f);
  });
}
