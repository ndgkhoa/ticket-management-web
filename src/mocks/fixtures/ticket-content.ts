export type TicketTopic =
  'Billing question' | 'Bug report' | 'Feature request' | 'Account access' | 'How-to';

type TopicContent = {
  subjects: readonly string[];
  bodies: readonly string[];
};

export const TICKET_CONTENT: Record<TicketTopic, TopicContent> = {
  'Billing question': {
    subjects: [
      'Charged twice for invoice {{invoice}}',
      'Refund for invoice {{invoice}} has not arrived',
      'Invoice {{invoice}} shows the wrong VAT rate',
      'Payment failed but the card was debited',
      'Can we switch from monthly to annual billing?',
      'Please remove the seat we cancelled last month',
      'Receipt for invoice {{invoice}} is addressed to the wrong company',
    ],
    bodies: [
      'Our finance team flagged this during the month-end close and I need something in writing before we can file it.',
      'The amount taken does not match the invoice total. The difference is small but the reconciliation will not balance until it is explained.',
      'This is the second billing period in a row this has happened, so I would rather understand the cause than get another one-off correction.',
      'I have attached the bank statement line. The reference matches your invoice number, so it is definitely us.',
    ],
  },
  'Bug report': {
    subjects: [
      'Export to CSV returns an empty file',
      'Dashboard charts render blank after the latest release',
      'Webhook retries fire twice for the same event',
      'Search returns no results for terms that clearly exist',
      'Uploading an attachment over 5MB fails silently',
      'Timezone on the activity feed is off by seven hours',
      'API returns 500 when filtering by two tags at once',
    ],
    bodies: [
      'It worked last week and nothing changed on our side. I can reproduce it on a clean profile with no extensions.',
      'Steps: open the list, apply any filter, then reload the page. It happens roughly four times out of five, so it looks like a race rather than a hard failure.',
      'Console shows the request going out and coming back 200, but the UI never updates. Screenshot and HAR file attached.',
      'This is blocking a report we send to our own customers on Monday, so a workaround would help even if the real fix takes longer.',
    ],
  },
  'Feature request': {
    subjects: [
      'Allow saved views to be shared with a team',
      'Add a bulk assign action to the ticket list',
      'Support SSO via Okta',
      'Let us set business hours per SLA policy',
      'Add a dark mode to the agent console',
      'Webhook payloads should include the previous status',
    ],
    bodies: [
      'We currently do this by hand every morning, which takes about half an hour across the team.',
      'Not urgent, but it is the one thing stopping us rolling this out to the wider support org.',
      'Happy to be a design partner on this if it helps — we have a fairly typical setup.',
    ],
  },
  'Account access': {
    subjects: [
      'Cannot login after password reset',
      'Locked out after too many failed attempts',
      'SSO login loops back to the sign-in page',
      'New agent cannot see any tickets',
      'Please revoke access for a departed employee',
      'Two-factor codes are rejected as invalid',
    ],
    bodies: [
      'The reset email arrives and the link works, but signing in with the new password fails immediately.',
      'This started this morning and affects two people on the team. Everyone else can sign in normally.',
      'They left on Friday, so this is time-sensitive from a security standpoint.',
      'I have tried a different browser and a phone. Same result, so I do not think it is a cache issue.',
    ],
  },
  'How-to': {
    subjects: [
      'How do I merge two duplicate tickets?',
      'Where do I configure the SLA breach warning?',
      'How can I export a month of tickets for an audit?',
      'Can internal notes be hidden from a specific role?',
      'What is the correct way to bulk import customers?',
    ],
    bodies: [
      'I have looked through the docs and either it is not there or I am searching for the wrong term.',
      'We need this for an audit next month, so I would rather get the setup right the first time.',
      'A pointer to the right page is fine — I do not need a full walkthrough.',
    ],
  },
};

export const AGENT_REPLIES: readonly string[] = [
  'Thanks for the detail — that is enough for me to reproduce it. Looking into it now and I will update you shortly.',
  'I can see what happened here. It is on our side, not yours, and I am sorting it out.',
  'Good catch. I have raised this internally with the numbers you sent and will keep you posted.',
  'I have applied the fix to your account. Could you confirm it looks right from your end?',
  'That is expected behaviour today, though I agree it is surprising. Here is the reasoning, and the workaround in the meantime.',
];

export const CUSTOMER_REPLIES: readonly string[] = [
  'Thanks for the quick response. Let me know if you need anything else from our side.',
  'That is confirmed working now — appreciate the turnaround.',
  'Still seeing it, unfortunately. I have attached a fresh screenshot from this morning.',
  'Understood. We can live with the workaround for now, but we would like to know when the real fix ships.',
  'Any update on this one? It is starting to affect our own customers.',
];

export const INTERNAL_NOTES: readonly string[] = [
  'Customer is on the enterprise plan and renews next quarter — worth handling carefully.',
  'Root cause is the retry loop in the webhook worker. Engineering has it; do not promise a date yet.',
  'Second report of this today. If a third comes in we should treat it as an incident.',
  'Refund approved by finance. Do not mention the approval thread to the customer.',
  'Previous agent already offered a credit here — check the history before offering another.',
];
