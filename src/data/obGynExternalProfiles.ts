export type ObGynHealthgradesLinkKind = 'profile' | 'directory';

export interface ObGynExternalProfileLinks {
  healthgradesUrl: string;
  healthgradesLinkKind: ObGynHealthgradesLinkKind;
  webmdUrl?: string;
  zocdocUrl?: string;
}

const healthgradesFairLawn = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/fair-lawn';
const healthgradesParamus = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/paramus';
const healthgradesRamsey = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/ramsey';
const healthgradesMontvale = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/montvale';
const healthgradesRidgewood = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/ridgewood';
const healthgradesHackensack = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/hackensack';
const healthgradesEnglewood = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/englewood';

export const obGynExternalProfiles: Record<string, ObGynExternalProfileLinks> = {
  'david-garfinkel': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-david-garfinkel-3cmpf',
    healthgradesLinkKind: 'profile',
  },
  'jacqueline-rozov': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-jacqueline-rozov-xyn6nb8',
    healthgradesLinkKind: 'profile',
  },
  'eugenia-kuo': {
    healthgradesUrl: healthgradesParamus,
    healthgradesLinkKind: 'directory',
    webmdUrl: 'https://doctor.webmd.com/doctor/eugenia-kuo-d90703bf-04c9-4028-8fac-51b380055ac9-overview',
  },
  'amna-iftikhar': {
    healthgradesUrl: 'https://www.healthgrades.com/providers/amna-iftikhar-eres94f484',
    healthgradesLinkKind: 'profile',
  },
  'oscarina-contin-mendoza': {
    healthgradesUrl: healthgradesParamus,
    healthgradesLinkKind: 'directory',
    webmdUrl: 'https://doctor.webmd.com/doctor/oscarina-contin-28cf091b-72c4-4df6-9593-7dd3cdfeda05-overview',
  },
  'richa-pursnani': {
    healthgradesUrl: healthgradesParamus,
    healthgradesLinkKind: 'directory',
  },
  'sami-ahmad': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-sami-ahmad-gctf2',
    healthgradesLinkKind: 'profile',
  },
  'chandani-desai': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-chandani-desai-1qqiqzuk08',
    healthgradesLinkKind: 'profile',
  },
  'daying-zhang': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-daying-zhang-2qpq6',
    healthgradesLinkKind: 'profile',
  },
  'hayley-norian': {
    healthgradesUrl: healthgradesMontvale,
    healthgradesLinkKind: 'directory',
  },

  'judi-gerardis': {
    healthgradesUrl: healthgradesHackensack,
    healthgradesLinkKind: 'directory',
    webmdUrl: 'https://doctor.webmd.com/doctor/judi-gerardis-fa830121-4480-4237-8c29-28ded0f94503-overview',
  },
  'lizabeth-kopp': {
    healthgradesUrl: healthgradesHackensack,
    healthgradesLinkKind: 'directory',
  },
  'melanie-kaufer': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-melanie-kaufer-gdj8w',
    healthgradesLinkKind: 'profile',
  },
  'sara-bittman': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-sara-bittman-gd624',
    healthgradesLinkKind: 'profile',
  },
  'stavros-lazarou': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-stavros-lazarou-3fbc8',
    healthgradesLinkKind: 'profile',
  },
  'emily-howell': {
    healthgradesUrl: healthgradesHackensack,
    healthgradesLinkKind: 'directory',
  },
  'maryann-khoudary': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-maryann-khoudary-yn5kf',
    healthgradesLinkKind: 'profile',
  },
  'david-lee': {
    healthgradesUrl: healthgradesHackensack,
    healthgradesLinkKind: 'directory',
  },
  'kiril-mark': {
    healthgradesUrl: healthgradesHackensack,
    healthgradesLinkKind: 'directory',
  },
  'kanchi-chadha': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-kanchi-chadha-y9w7tdz',
    healthgradesLinkKind: 'profile',
  },

  'christopher-englert': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-christopher-englert-2kv74',
    healthgradesLinkKind: 'profile',
  },
  'neelangani-desoyza': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'anna-shoshilos': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'lucy-tovmasian': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'marina-jacobson': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'ronny-meier': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-ronny-meier-xgscx',
    healthgradesLinkKind: 'profile',
  },
  'zachary-merriam': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-zachary-merriam-3slp8',
    healthgradesLinkKind: 'profile',
  },
  'stephanie-rivera-segarra': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'sara-brescia': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'sara-slatky': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-sara-slatky-xylk9dn',
    healthgradesLinkKind: 'profile',
  },

  'michael-faust': {
    healthgradesUrl: healthgradesRamsey,
    healthgradesLinkKind: 'directory',
  },
  'linda-silva-karcz': {
    healthgradesUrl: healthgradesRidgewood,
    healthgradesLinkKind: 'directory',
  },
  'sandra-giron': {
    healthgradesUrl: healthgradesEnglewood,
    healthgradesLinkKind: 'directory',
  },
  'jeffrey-reinkraut': {
    healthgradesUrl: healthgradesFairLawn,
    healthgradesLinkKind: 'directory',
  },
  'michelle-beloff': {
    healthgradesUrl: healthgradesRidgewood,
    healthgradesLinkKind: 'directory',
  },
};
