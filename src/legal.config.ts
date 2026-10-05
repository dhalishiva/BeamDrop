// Single source of truth for who operates BeamDrop. The legal pages read from here.
//
// BEFORE LAUNCH: replace `legalName` (and fill `address`) with the registered business
// entity that will operate the service, then have the Terms and Privacy pages reviewed
// by a lawyer. They are a careful first draft, not legal advice.

export const COMPANY = {
  product: 'BeamDrop',
  brand: 'Kriosity',
  /** The entity that enters into the Terms with users. */
  legalName: 'Kriosity',
  /** Optional registered address; hidden when empty. */
  address: '',
  location: 'Noida, Uttar Pradesh, India',
  /** Courts with jurisdiction under the Terms. */
  courts: 'Gautam Buddh Nagar, Uttar Pradesh',
  supportEmail: 'support@kriosity.in',
  generalEmail: 'hello@kriosity.in',
  website: 'https://kriosity.in',
  lastUpdated: '6 October 2026',
} as const;
