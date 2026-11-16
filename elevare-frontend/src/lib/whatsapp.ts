/* WhatsApp is the website's first contact. The number comes from VITE_WHATSAPP_NUMBER
   (a production build refuses to finish without it, see vite.config.ts). */
import {CONFIG} from '@/concierge/data';

export const whatsappUrl = (text: string) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

if (!CONFIG.whatsapp && import.meta.env.DEV)
  console.warn('VITE_WHATSAPP_NUMBER is not set in elevare-frontend/.env: WhatsApp buttons cannot reach Elevare.');
