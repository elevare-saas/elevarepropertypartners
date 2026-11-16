/* home page FAQ: what Elevare is, and how to start (the section ends with a WhatsApp button) */
import {CONFIG} from './data';

export const FAQ: [string, string][] = [
  [
    'What is Elevare?',
    'A Phuket property partner. Tell us what you need and we recommend a short list of verified homes to rent or buy, then stay with you from your holiday to your purchase.'
  ],
  [
    'How is it different from property portals?',
    'Portals give you thousands of listings to filter yourself. We ask a few questions and recommend only checked homes that fit, with the reason for each.'
  ],
  [
    'How do you check homes?',
    "We list a home only with the owner's permission, real photos and checked prices, plus a licence for holiday stays."
  ],
  ['Does it cost anything to view?', 'No. Viewings are free, and there is no deposit before you have seen the home.'],
  [
    'How do I start?',
    `Answer a few questions on this page, or message us on WhatsApp. An advisor replies ${CONFIG.replyWindow}.`
  ]
];
