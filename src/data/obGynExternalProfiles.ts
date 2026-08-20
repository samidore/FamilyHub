export type ObGynHealthgradesLinkKind = 'profile' | 'group' | 'directory';

export interface ObGynExternalProfileLinks {
  healthgradesUrl: string;
  healthgradesLinkKind: ObGynHealthgradesLinkKind;
  webmdUrl?: string;
  zocdocUrl?: string;
}

const healthgradesHackensackDirectory = 'https://www.healthgrades.com/obstetrics-gynecology-directory/nj-new-jersey/hackensack';
const healthgradesValleyParamus = 'https://www.healthgrades.com/group-directory/nj-new-jersey/paramus/valley-medical-group-ob-gyn-paramus-u3lyngv';
const healthgradesValleyRamsey = 'https://www.healthgrades.com/group-directory/nj-new-jersey/ramsey/valley-medical-group-ob-gyn-ramsey-u3l2kcv';
const healthgradesValleyFairLawn = 'https://www.healthgrades.com/group-directory/nj-new-jersey/fair-lawn/valley-medical-group-ob-gyn-fair-lawn-u3lymj7';
const healthgradesValleyMontvale = 'https://www.healthgrades.com/group-directory/nj-new-jersey/montvale/valley-medical-group-center-for-womens-health-u3l23d5';
const healthgradesValleyRidgewood = 'https://www.healthgrades.com/group-directory/nj-new-jersey/ridgewood/valley-medical-group-gynecology-ridgewood-u3l2hxj';
const healthgradesHumcAcademic = 'https://www.healthgrades.com/group-directory/nj-new-jersey/hackensack/hackensack-meridian-medical-group-ob-gyn-xtwls2';
const healthgradesKirilMarkGroup = 'https://www.healthgrades.com/group-directory/nj-new-jersey/hackensack/arthur-okeefe-xsw7tf';
const healthgradesEnglewoodFour = 'https://www.healthgrades.com/group-directory/nj-new-jersey/englewood/englewood-health-physician-network-englert-tovmasian-desoyza-shoshilos-ob-gyn-at-englewood-u3l25vk';
const healthgradesEnglewoodComplete = 'https://www.healthgrades.com/group-directory/nj-new-jersey/englewood/englewood-health-physician-network-complete-womens-healthcare-at-englewood-u3ljcwc';
const healthgradesEnglewoodBrescia = 'https://www.healthgrades.com/group-directory/nj-new-jersey/englewood/englewood-health-physician-network-brescia-and-migliaccio-womens-health-at-englewood-u3lyflr';
const healthgradesEnglewoodRivera = 'https://www.healthgrades.com/group-directory/nj-new-jersey/englewood/englewood-health-physician-network-brescia-and-migliaccio-womens-health-at-englewood-u3cl5hj';
const healthgradesSandraGironGroup = 'https://www.healthgrades.com/group-directory/nj-new-jersey/cliffside-park/englewood-health-physician-network-bariatric-and-general-surgery-at-cliffside-park-u3l2xq3';

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
    healthgradesUrl: healthgradesValleyParamus,
    healthgradesLinkKind: 'group',
    webmdUrl: 'https://doctor.webmd.com/doctor/eugenia-kuo-d90703bf-04c9-4028-8fac-51b380055ac9-overview',
  },
  'amna-iftikhar': {
    healthgradesUrl: 'https://www.healthgrades.com/providers/amna-iftikhar-eres94f484',
    healthgradesLinkKind: 'profile',
  },
  'oscarina-contin-mendoza': {
    healthgradesUrl: healthgradesValleyParamus,
    healthgradesLinkKind: 'group',
    webmdUrl: 'https://doctor.webmd.com/doctor/oscarina-contin-28cf091b-72c4-4df6-9593-7dd3cdfeda05-overview',
  },
  'richa-pursnani': {
    healthgradesUrl: healthgradesValleyParamus,
    healthgradesLinkKind: 'group',
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
    healthgradesUrl: healthgradesValleyMontvale,
    healthgradesLinkKind: 'group',
  },

  'judi-gerardis': {
    healthgradesUrl: healthgradesHackensackDirectory,
    healthgradesLinkKind: 'directory',
    webmdUrl: 'https://doctor.webmd.com/doctor/judi-gerardis-fa830121-4480-4237-8c29-28ded0f94503-overview',
  },
  'lizabeth-kopp': {
    healthgradesUrl: healthgradesHackensackDirectory,
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
    healthgradesUrl: healthgradesHackensackDirectory,
    healthgradesLinkKind: 'directory',
  },
  'emily-howell': {
    healthgradesUrl: healthgradesHackensackDirectory,
    healthgradesLinkKind: 'directory',
  },
  'maryann-khoudary': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-maryann-khoudary-yn5kf',
    healthgradesLinkKind: 'profile',
  },
  'david-lee': {
    healthgradesUrl: healthgradesHackensackDirectory,
    healthgradesLinkKind: 'directory',
  },
  'kiril-mark': {
    healthgradesUrl: healthgradesKirilMarkGroup,
    healthgradesLinkKind: 'group',
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
    healthgradesUrl: healthgradesEnglewoodFour,
    healthgradesLinkKind: 'group',
  },
  'anna-shoshilos': {
    healthgradesUrl: healthgradesEnglewoodFour,
    healthgradesLinkKind: 'group',
  },
  'lucy-tovmasian': {
    healthgradesUrl: healthgradesEnglewoodFour,
    healthgradesLinkKind: 'group',
  },
  'marina-jacobson': {
    healthgradesUrl: healthgradesEnglewoodComplete,
    healthgradesLinkKind: 'group',
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
    healthgradesUrl: healthgradesEnglewoodRivera,
    healthgradesLinkKind: 'group',
  },
  'sara-brescia': {
    healthgradesUrl: healthgradesEnglewoodBrescia,
    healthgradesLinkKind: 'group',
  },
  'sara-slatky': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-sara-slatky-xylk9dn',
    healthgradesLinkKind: 'profile',
  },

  'michael-faust': {
    healthgradesUrl: healthgradesValleyRamsey,
    healthgradesLinkKind: 'group',
  },
  'linda-silva-karcz': {
    healthgradesUrl: 'https://www.healthgrades.com/physician/dr-linda-silva-karcz-3xjgq',
    healthgradesLinkKind: 'profile',
  },
  'sandra-giron': {
    healthgradesUrl: healthgradesSandraGironGroup,
    healthgradesLinkKind: 'group',
  },
  'jeffrey-reinkraut': {
    healthgradesUrl: healthgradesValleyFairLawn,
    healthgradesLinkKind: 'group',
  },
  'michelle-beloff': {
    healthgradesUrl: healthgradesValleyRidgewood,
    healthgradesLinkKind: 'group',
  },
};
