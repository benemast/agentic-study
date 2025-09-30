// frontend/src/locales/index.js
import { en } from './en';
import { de } from './de';

export const translations = {
  en,
  de
};

export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' }
];

export default translations;