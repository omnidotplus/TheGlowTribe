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

In that sheet: click on **Extensions → Apps Script**. Delete whatever is in the editor and
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

    /*
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
        subject: "You're in, No Bushels, 21 Nov 2026",
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


AKfycbx9JjF138aD0mhXTQhjUNurlFlR4OYE13LtakRHr1CL_KQqISZ9ldgloEMW_s4qwp0A

https://script.google.com/macros/s/AKfycbx9JjF138aD0mhXTQhjUNurlFlR4OYE13LtakRHr1CL_KQqISZ9ldgloEMW_s4qwp0A/exec

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

---

## Troubleshooting

### The browser console says CORS, and the status is 403

The CORS message is a symptom. Google refused the request before it reached the
script, and its error page carries no CORS headers, so the browser reports the
missing header rather than the refusal. Nothing in the site's code can fix it.
Prove it from outside the browser, where CORS does not exist:

```bash
./check-endpoint.sh                 # tests the URL in .env
./check-endpoint.sh '<exec-url>'    # tests a URL before you commit to it
```

A 403 from `curl` means the endpoint refuses everyone, not just the site.

### 403 with an "Access denied · Drive · You need access" page

This is the one that costs an afternoon, because the obvious setting is not the
cause. If the response mentions **Drive** and **"You are signed in as"**, Google
is not refusing your script, it never found a web app at that URL and fell back
to treating it as a Drive document.

Check **Execute as** before touching anything else. The two fields interact:

| Execute as | Who has access | An anonymous visitor gets |
|---|---|---|
| **Me** | **Anyone** | the script runs, as intended |
| User accessing the web app | Anyone | Drive's "You need access" page |

With *User accessing the web app*, Google must run the script **as the visitor**,
so it needs them signed in with access to the sheet. A visitor to a public site
is neither, so it fails at Drive rather than at your code. Setting *Who has
access* to Anyone cannot rescue this, which is why changing it looks like it
does nothing.

Also confirm the deployment is in the active list rather than under **archived
deployments**. An archived deployment produces the same Drive fallback.

### Changes to the script do nothing

Apps Script serves the last *deployed* version, not what is in the editor.
After editing: **Deploy → Manage deployments → pencil → Version: New version →
Deploy**. Editing an existing deployment this way keeps the same `/exec` URL.
Creating a **New deployment** instead mints a new URL, which then has to be
updated in `.env` **and** in the host's environment variables.

### It works locally but not on the deployed site

`PUBLIC_REG_ENDPOINT` is read at **build time**, not per request. Setting or
changing it on the host requires a fresh deploy; editing the variable alone
leaves the already-built page pointing at the old value.
