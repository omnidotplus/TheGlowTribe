/* No Bushels registration endpoint.
   Appends one row per registration and emails the registrant a confirmation.
   Deployed as a web app; the site POSTs JSON as text/plain (see below).

   Setup, troubleshooting and the "Execute as" trap: REGISTRATION_SETUP.md */

var NOTIFY = 'theglowtribe@gmail.com';   // told about each signup; blank to disable
var SHEET  = 'TheGlowTribe_NoBushels';   // rename if your tab is called something else

/* ---- event facts, in one place so the email and any future change agree ---- */
var EVENT = {
  name:   'No Bushels',
  dateL:  'Saturday 21 November 2026',
  venue:  'Emmanuel Uduagha Hall',
  addr:   'Beside Otres, Ogunu Road, Warri, Delta State',
  doors:  '09:00',
  entry:  'Free entry',
  verse:  'Matthew 5:15'
};

/* ---- brand, from DESIGN.md ---- */
var C = {
  ember:  '#FF4B12',
  flare:  '#FFE04A',
  ink:    '#1A1411',
  paper:  '#FFF8F4',
  dark:   '#120D0B',
  dim:    '#6B6560',
  line:   '#E4DAD2'
};

function doPost(e) {
  try {
    /* The site sends text/plain on purpose: an Apps Script web app does not
       answer a CORS preflight, so an application/json POST would be blocked
       by the browser before it ever arrived. text/plain is a "simple request",
       which skips preflight. The body is still JSON, so parse it here. */
    var d = JSON.parse(e.postData.contents);

    var name  = String(d.name  || '').trim();
    var email = String(d.email || '').trim();
    if (!name || !email) return out({ ok: false, error: 'name and email required' });

    var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET)
             || SpreadsheetApp.getActive().getSheets()[0];

    /* Guard against a double tap or a retry creating two rows for one person.
       Checks the email column for an exact match before appending. */
    var existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().map(function (r) {
          return String(r[0]).trim().toLowerCase();
        })
      : [];
    if (existing.indexOf(email.toLowerCase()) !== -1)
      return out({ ok: true, duplicate: true });

    sheet.appendRow([
      new Date(),
      name,
      email,
      String(d.phone || '').trim(),
      String(d.discipline || '').trim(),
      String(d.page || '').trim()
    ]);

    /* The confirmation card on the site promises directions by email, so
       something has to actually send one. Free Gmail allows 100 a day, far
       above this event's scale. A failure here must not fail the
       registration, so it is caught separately: losing a row is worse than
       missing a confirmation. */
    try {
      var first = name.split(' ')[0];
      MailApp.sendEmail({
        to: email,
        subject: "You're in, No Bushels, 21 Nov 2026",
        name: 'The Glow Tribe',
        body: plainBody(first),        /* fallback for text-only clients */
        htmlBody: htmlBody(first)
      });
    } catch (mailErr) { /* row is saved; the email is best effort */ }

    if (NOTIFY) {
      try {
        MailApp.sendEmail(NOTIFY, 'New No Bushels registration',
          [name, email, d.phone || '(no phone)', d.discipline].join('\n'));
      } catch (notifyErr) {}
    }

    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/* ---- the plain-text version. Not optional: some clients render only this,
        and a message with no text part scores worse with spam filters. ---- */
function plainBody(first) {
  return [
    'Hi ' + first + ',',
    '',
    "You're registered for " + EVENT.name + '.',
    '',
    EVENT.dateL,
    EVENT.venue,
    EVENT.addr,
    'Doors ' + EVENT.doors + '. ' + EVENT.entry + '.',
    '',
    "Bring whatever you're working on, however unfinished.",
    '',
    'The Glow Tribe',
    EVENT.verse
  ].join('\n');
}

/* ---- the HTML version.
        Email is not the web: tables for layout, every style inline, no
        flexbox, no grid, no webfonts, no external CSS. Outlook ignores CSS
        background on table cells, so bgcolor is set as an attribute as well.
        600px is the width that survives every client without scaling. ---- */
function htmlBody(first) {
  var sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  var mono = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

  function row(label, value) {
    return ''
      + '<tr>'
      +   '<td style="padding:0 0 4px;font:600 10px/1.4 ' + mono + ';letter-spacing:.14em;'
      +       'text-transform:uppercase;color:' + C.dim + ';">' + label + '</td>'
      + '</tr>'
      + '<tr>'
      +   '<td style="padding:0 0 18px;font:600 16px/1.45 ' + sans + ';color:' + C.ink + ';">'
      +     value
      +   '</td>'
      + '</tr>';
  }

  return [
'<!doctype html><html><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>You\'re in</title></head>',
'<body style="margin:0;padding:0;background:' + C.paper + ';">',

/* preheader: the grey line clients show next to the subject. Hidden in the
   body itself, or it prints twice. */
'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">',
  'Saturday 21 November 2026, ' + EVENT.venue + ', Warri. Doors ' + EVENT.doors + '.',
'</div>',

'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"',
      ' bgcolor="' + C.paper + '" style="background:' + C.paper + ';">',
'<tr><td align="center" style="padding:28px 16px;">',

  '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"',
        ' style="width:600px;max-width:100%;">',

  /* --- masthead: the ember ground the site opens on --- */
  '<tr><td bgcolor="' + C.ember + '" style="background:' + C.ember + ';padding:30px 32px 26px;">',
    '<div style="font:600 10px/1 ' + mono + ';letter-spacing:.22em;text-transform:uppercase;',
         'color:' + C.ink + ';opacity:.72;">The Glow Tribe</div>',
    '<div style="font:800 40px/0.95 ' + sans + ';letter-spacing:-.025em;color:' + C.ink + ';',
         'padding-top:10px;">NO&nbsp;BUSHELS</div>',
    '<div style="font:600 11px/1.4 ' + mono + ';letter-spacing:.16em;text-transform:uppercase;',
         'color:' + C.ink + ';opacity:.78;padding-top:10px;">A Christian creative conference</div>',
  '</td></tr>',

  /* --- the confirmation --- */
  '<tr><td bgcolor="' + C.paper + '" style="background:' + C.paper + ';padding:32px 32px 8px;',
      'border-left:1px solid ' + C.line + ';border-right:1px solid ' + C.line + ';">',
    '<p style="margin:0 0 16px;font:400 17px/1.5 ' + sans + ';color:' + C.ink + ';">',
      'Hi ' + first + ',',
    '</p>',
    '<p style="margin:0 0 6px;font:800 26px/1.2 ' + sans + ';letter-spacing:-.02em;color:' + C.ink + ';">',
      "You're in.",
    '</p>',
    '<p style="margin:0 0 26px;font:400 16px/1.6 ' + sans + ';color:' + C.dim + ';">',
      'Your place is saved. Here is everything you need.',
    '</p>',
  '</td></tr>',

  /* --- the facts --- */
  '<tr><td bgcolor="' + C.paper + '" style="background:' + C.paper + ';padding:0 32px;',
      'border-left:1px solid ' + C.line + ';border-right:1px solid ' + C.line + ';">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
      row('When', EVENT.dateL + '<br><span style="font-weight:400;color:' + C.dim + ';">Doors '
                  + EVENT.doors + '. ' + EVENT.entry + '.</span>'),
      row('Where', EVENT.venue + '<br><span style="font-weight:400;color:' + C.dim + ';">'
                  + EVENT.addr + '</span>'),
    '</table>',
  '</td></tr>',

  /* --- the one thing we ask of them --- */
  '<tr><td bgcolor="' + C.paper + '" style="background:' + C.paper + ';padding:6px 32px 30px;',
      'border-left:1px solid ' + C.line + ';border-right:1px solid ' + C.line + ';">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
      '<tr><td bgcolor="' + C.flare + '" style="background:' + C.flare + ';padding:16px 18px;">',
        '<p style="margin:0;font:600 15px/1.5 ' + sans + ';color:' + C.ink + ';">',
          "Bring whatever you're working on, however unfinished.",
        '</p>',
      '</td></tr>',
    '</table>',
  '</td></tr>',

  /* --- sign off, on the dark ground the site closes on --- */
  '<tr><td bgcolor="' + C.dark + '" style="background:' + C.dark + ';padding:24px 32px;">',
    '<div style="font:800 15px/1.3 ' + sans + ';letter-spacing:-.01em;color:' + C.paper + ';">',
      'The Glow Tribe',
    '</div>',
    '<div style="font:400 13px/1.6 ' + sans + ';color:#9A8F88;padding-top:6px;">',
      'Musicians, filmmakers, writers. Anyone making something.',
    '</div>',
    '<div style="font:600 10px/1 ' + mono + ';letter-spacing:.18em;text-transform:uppercase;',
         'color:' + C.ember + ';padding-top:16px;">' + EVENT.verse + '</div>',
  '</td></tr>',

  '<tr><td style="padding:16px 8px 0;font:400 11px/1.5 ' + sans + ';color:' + C.dim + ';">',
    'You are receiving this because you registered for No Bushels at theglowtribe.com.',
  '</td></tr>',

  '</table>',
'</td></tr></table></body></html>'
  ].join('');
}

function doGet() { return out({ ok: true, service: 'no-bushels-registration' }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
