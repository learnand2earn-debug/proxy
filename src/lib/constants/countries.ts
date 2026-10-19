export interface CountryMeta {
  code: string;
  name: string;
  flag: string;
}

// Comprehensive Country code to Flag & Name dictionary
export const COUNTRY_META: Record<string, { name: string; flag: string }> = {
  PK: { name: 'Pakistan', flag: '🇵🇰' },
  IN: { name: 'India', flag: '🇮🇳' },
  US: { name: 'United States', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  HK: { name: 'Hong Kong', flag: '🇭🇰' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  UA: { name: 'Ukraine', flag: '🇺🇦' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  RO: { name: 'Romania', flag: '🇷🇴' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  BD: { name: 'Bangladesh', flag: '🇧🇩' },
  CN: { name: 'China', flag: '🇨🇳' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  EG: { name: 'Egypt', flag: '🇪🇬' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  PE: { name: 'Peru', flag: '🇵🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  CZ: { name: 'Czech Republic', flag: '🇨🇿' },
  BG: { name: 'Bulgaria', flag: '🇧🇬' },
  HU: { name: 'Hungary', flag: '🇭🇺' },
  GR: { name: 'Greece', flag: '🇬🇷' },
  PT: { name: 'Portugal', flag: '🇵🇹' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  IR: { name: 'Iran', flag: '🇮🇷' },
  IQ: { name: 'Iraq', flag: '🇮🇶' },
  AF: { name: 'Afghanistan', flag: '🇦🇫' },
  NP: { name: 'Nepal', flag: '🇳🇵' },
  LK: { name: 'Sri Lanka', flag: '🇱🇰' },
  DZ: { name: 'Algeria', flag: '🇩🇿' },
  MA: { name: 'Morocco', flag: '🇲🇦' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  GH: { name: 'Ghana', flag: '🇬🇭' },
  KZ: { name: 'Kazakhstan', flag: '🇰🇿' },
  UZ: { name: 'Uzbekistan', flag: '🇺🇿' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  TW: { name: 'Taiwan', flag: '🇹🇼' },
};

// Top popular quick-select country list
export const POPULAR_COUNTRIES: CountryMeta[] = [
  { code: 'ALL', name: 'All Countries (Global)', flag: '🌐' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' }
];

// All countries sorted alphabetically
export const ALL_COUNTRIES: CountryMeta[] = Object.entries(COUNTRY_META)
  .map(([code, meta]) => ({ code, name: meta.name, flag: meta.flag }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Resolves country info from either 2-letter ISO code or full country name
 */
export function getCountryInfo(codeOrName?: string): CountryMeta {
  if (!codeOrName || codeOrName === 'ALL' || codeOrName === 'all') {
    return { code: 'ALL', name: 'All Countries (Global)', flag: '🌐' };
  }

  const query = codeOrName.trim();
  const upper = query.toUpperCase();

  // 1. Direct match by 2-letter code
  if (COUNTRY_META[upper]) {
    return { code: upper, name: COUNTRY_META[upper].name, flag: COUNTRY_META[upper].flag };
  }

  // 2. Match by full name
  const byName = Object.entries(COUNTRY_META).find(
    ([, val]) => val.name.toLowerCase() === query.toLowerCase() ||
                 val.name.toLowerCase().includes(query.toLowerCase())
  );
  if (byName) {
    return { code: byName[0], name: byName[1].name, flag: byName[1].flag };
  }

  // 3. Fallback: generate regional flag emoji if 2 letters
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    try {
      const flag = String.fromCodePoint(...upper.split('').map(char => 127397 + char.charCodeAt(0)));
      return { code: upper, name: upper, flag };
    } catch {
      return { code: upper, name: upper, flag: '🌐' };
    }
  }

  return { code: upper, name: query, flag: '🌐' };
}
