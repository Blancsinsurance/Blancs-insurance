# Twilio A2P 10DLC — Resubmit instructions (Error 30909 / CTA verification)

## What changed on the website

1. **Public CTA / proof page (use this URL in Twilio):**  
   **https://www.blancsins.com/en/sms-opt-in**

   Documents both opt-in methods with exact language and the full verbal script.

2. **Quote form** (`/en/contact`): optional SMS checkbox remains **unchecked by default** and is **not required** to submit. Disclosures include message/data rates, STOP/HELP, and links to Privacy + Terms.

3. **Privacy Policy** and **Footer** link to the SMS opt-in page.

Deploy these code changes to production **before** resubmitting the campaign so reviewers can open the URLs.

---

## Message Flow / Call-to-Action text to paste into Twilio

Copy the block below into the **Message Flow** (or “How do end users consent?”) field. Do **not** only list verbal without a URL.

```
End users opt in to informational text messages from Blanc's Insurance in two ways:

1) WEBSITE FORM (primary): Visit https://www.blancsins.com/en/contact and complete the quote request form. Below the form fields is an optional checkbox that is unchecked by default and is not required to submit the form or receive a quote. The checkbox label reads: "Yes, send me informational text messages about my quote, policy, and account from Blanc's Insurance at the phone number provided (optional — not required to receive a quote or service). Message and data rates may apply. Message frequency varies. Reply STOP to opt out, HELP for help." Under the checkbox: "Mobile information and messaging consent will not be shared with third parties or affiliates for marketing or promotional purposes." Links to Privacy Policy (https://www.blancsins.com/en/privacy) and Terms of Service (https://www.blancsins.com/en/terms). Only users who check the box and submit are enrolled for informational SMS.

2) VERBAL (phone or in-person with a licensed agent): Agent reads the following script, then records the customer's clear "yes" in the agency CRM (date, time, phone number). Script: "Before we continue, would you like to receive informational text messages from Blanc's Insurance about your quote, policy, or account at the phone number you provided? These messages are informational only — for example quote follow-ups, appointment reminders, and policy updates. We do not send marketing or promotional texts under this program. Message frequency varies. Message and data rates may apply. You can opt out at any time by replying STOP to any text. For help, reply HELP. Our Privacy Policy is at blancsins.com/privacy and our Terms of Service are at blancsins.com/terms. Mobile information is not shared with third parties for marketing. Consent is completely optional and is not required to get a quote or any service from us. Do you consent to receive informational text messages from Blanc's Insurance at this number? Please say yes or no." If the customer does not clearly say yes, no SMS enrollment is created.

Full public documentation of both methods (for reviewers): https://www.blancsins.com/en/sms-opt-in

Privacy Policy: https://www.blancsins.com/en/privacy  
Terms of Service: https://www.blancsins.com/en/terms

Messages are informational only (quotes, policy, account). Consent is never a condition of purchase or service. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.
```

---

## Opt-in type selection in Twilio

- Prefer listing **both** Web Form and Verbal if you use both, and point reviewers to **https://www.blancsins.com/en/sms-opt-in**.
- If Twilio only allows one primary method, choose **Web Form** and still include the verbal path in the Message Flow text above (with the same public URL).
- Do **not** submit verbal alone without a public URL — that is what caused Error 30909 / CTA verification failure.

---

## After deploy checklist

- [ ] https://www.blancsins.com/en/sms-opt-in loads and shows web + verbal sections
- [ ] https://www.blancsins.com/en/contact shows the optional SMS checkbox (unchecked) with full disclosure
- [ ] https://www.blancsins.com/en/privacy and /terms load
- [ ] Paste Message Flow text above into the campaign resubmission
- [ ] Campaign remains **informational / customer care** (not marketing) to match the consent language
