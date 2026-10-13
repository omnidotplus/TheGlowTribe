# Registration setup

Registrations append a row to a Google Sheet. No database, no third-party service
holding the data, no submission limit. The sheet lives in your own Google account.

Ten minutes, once. Everything except the two steps marked **you** is already built.

---

## 1 · Make the sheet

Create a new Google Sheet called `No Bushels — Registrations`. Put these headers
in row 1, in this order:

```
Timestamp    Name    Email    Phone    Discipline    Page
```

## 2 · **You:** add the script

In that sheet: **Extensions → Apps Script**. Delete whatever is in the editor and
paste this in full.

```javascript
/* No Bushels registration endpoint.
   Appends one row per registration and emails the registrant a confirmation.
   Deployed as a web app; the site POSTs JSON as text/plain (see below). */

var NOTIFY = '';          // optional: your email, to be told about each signup
var SHEET  = 'Sheet1';    // rename if your tab is called something else

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

    /* Guard against a double-tap or a retry creating two rows for one person.
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

    /* The confirmation card on the site says "directions and a reminder will
       reach you by email", so something has to actually send one. Free Gmail
       allows 100 a day, which is far above this event's scale. A failure here
       must not fail the registration, so it is caught separately. */
    try {
      MailApp.sendEmail({
        to: email,
        subject: "You're in — No Bushels, 21 Nov 2026",
        name: 'The Glow Tribe',
        body: [
          'Hi ' + name.split(' ')[0] + ',',
          '',
          "You're registered for No Bushels.",
          '',
          'Saturday 21 November 2026',
          'EU Centre, Warri, Delta State',
          'Doors 09:00. Free entry.',
          '',
          "Bring whatever you're working on, however unfinished.",
          '',
          'The Glow Tribe'
        ].join('\n')
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

function doGet() { return out({ ok: true, service: 'no-bushels-registration' }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Optionally set `NOTIFY` to your own address on line 4 to get an email per signup.

## 3 · **You:** deploy it

**Deploy → New deployment**, then:

| Field | Value |
|---|---|
| Type | **Web app** |
| Execute as | **Me** |
| Who has access | **Anyone** |

"Anyone" is required: visitors are not signed into Google. It does not expose the
sheet, only this one script, which can append rows and nothing else.

Google will ask you to authorise it. It warns because the script sends email on
your behalf, which is the confirmation message above.

Copy the deployment URL. It ends in `/exec`.

## 4 · Point the site at it

```bash
cd site
cp .env.example .env
# paste the /exec URL after the =
npm run build
```

For a deployed site, set `PUBLIC_REG_ENDPOINT` in the host's environment
variables instead of committing `.env`. It is gitignored.

## 5 · Test it

Submit the form with a real address. You should get three things:

1. the card turns over to "You're in"
2. a new row in the sheet
3. the confirmation email

If the card does not turn, the form shows the reason in place of its note and
**nothing is stored** — it never claims success it cannot back.

---

## Notes

- **Re-deploy after editing the script.** Apps Script serves the last deployed
  version, not the editor's contents. `Deploy → Manage deployments → edit → Deploy`.
- **A duplicate email returns success without a second row.** A double-tap or a
  flaky-connection retry will not create two registrations for one person.
- **The email is best effort.** If sending fails the row is still saved, because
  losing a registration is worse than missing a confirmation.
- **Phone is optional** and may be blank in the sheet. That is intended.
- **Changing the header order means changing `appendRow`.** The script writes
  positionally.
