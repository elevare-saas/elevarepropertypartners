/* WhatsApp is the website's first contact. The number comes from the database (dashboard → Website settings),
   loaded before the page renders; the settings page doesn't accept an empty one. */
import {CONFIG} from '@/concierge/data';

export const whatsappUrl = (text: string) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

if (!CONFIG.whatsapp)
  console.warn('No WhatsApp number loaded (dashboard → Website settings): WhatsApp buttons cannot reach Elevare.');
