export const categoryDefinitions = [
  { id: 'food-home', title: '饮食与家庭', description: '根据现有食材和家庭目标，减少每天组餐时的重复判断。', accent: 'berry', order: 1 },
  { id: 'explore-play', title: '出行与玩乐', description: '找一个适合今天的去处、活动或轻松安排。', accent: 'evergreen', order: 2 },
  { id: 'health-care', title: '健康与照护', description: '把公开资料、家庭判断和需要确认的事项分开比较。', accent: 'ochre', order: 3 },
] as const;

export type CategoryId = (typeof categoryDefinitions)[number]['id'];
export type ModuleId = 'day-trips' | 'library-activities' | 'pediatric-dentists' | 'adult-dermatologists' | 'colonoscopy-specialists' | 'ob-gyn' | 'meal-builder' | 'restaurants' | 'sami-notebook';
export type ModuleAccent = 'evergreen' | 'lake' | 'ochre' | 'berry';
export type ModuleIcon = 'compass' | 'calendar' | 'care' | 'meal' | 'notebook';
export type ModulePrivacyClass = 'public-reference' | 'authenticated-household';

export interface ModuleDefinition {
  id: ModuleId;
  route: `/${string}/`;
  categoryId: CategoryId;
  title: string;
  summary: string;
  keywords: readonly string[];
  itemLabel: string;
  accent: ModuleAccent;
  icon: ModuleIcon;
  privacyClass: ModulePrivacyClass;
  status: 'active';
}

export const moduleRegistry = [
  {
    id: 'day-trips',
    route: '/day-trips/',
    categoryId: 'explore-play',
    title: 'Day Trips',
    summary: '自然中心、科学馆、公园、playground、动物和一小时左右车程的家庭目的地。',
    keywords: ['出行', '玩乐', '户外', '室内', '公园', 'nature', 'science', 'playground', 'animals'],
    itemLabel: '个地点',
    accent: 'evergreen',
    icon: 'compass',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'library-activities',
    route: '/library-activities/',
    categoryId: 'explore-play',
    title: 'Library Activities',
    summary: 'Fair Lawn 当前儿童 library 活动；按公开的 2024 Q3 基准做宽松年龄适配，明显偏大的才排除。',
    keywords: ['图书馆', '活动', '故事', '音乐', '手工', 'Fair Lawn', 'library', 'storytime', 'crafts', 'schedule'],
    itemLabel: '个活动',
    accent: 'lake',
    icon: 'calendar',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'pediatric-dentists',
    route: '/pediatric-dentists/',
    categoryId: 'health-care',
    title: 'Pediatric Dentists',
    summary: '按 provider、训练、Healthgrades 证据、路程和长期适配度比较附近儿童牙医。',
    keywords: ['健康', '照护', '牙医', '儿童牙医', 'dentist', 'pediatric', 'healthgrades', 'provider'],
    itemLabel: '家诊所',
    accent: 'ochre',
    icon: 'care',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'adult-dermatologists',
    route: '/adult-dermatologists/',
    categoryId: 'health-care',
    title: '肛周皮炎 / 湿疹皮肤科',
    summary: '按一般皮肤科基础、肛周皮炎鉴别能力、患者体验、安全资料和预约条件比较女性成人皮肤科医生。',
    keywords: ['健康', '照护', '皮肤科', '肛周皮炎', '肛周湿疹', '湿疹', '接触性皮炎', 'dermatologist', 'perianal dermatitis', 'eczema', 'contact dermatitis', 'patch testing', 'healthgrades', 'board certified'],
    itemLabel: '位医生',
    accent: 'ochre',
    icon: 'care',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'colonoscopy-specialists',
    route: '/colonoscopy-specialists/',
    categoryId: 'health-care',
    title: 'Colonoscopy Specialists',
    summary: '按复杂息肉切除能力、医院级 Facility、Healthgrades 负面证据和 NY 正式安全记录比较 NYC 肠镜专家。',
    keywords: ['健康', '照护', '肠镜', '息肉', 'colonoscopy', 'polyp', 'EMR', 'ESD', 'advanced endoscopy', 'Healthgrades'],
    itemLabel: '位专家',
    accent: 'ochre',
    icon: 'care',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'ob-gyn',
    route: '/ob-gyn/',
    categoryId: 'health-care',
    title: 'OB / GYN',
    summary: '按 Valley、Hackensack、Englewood 的接生关系、公开训练与患者体验比较 OB，并保留一份合并 GYN shortlist。',
    keywords: ['健康', '照护', '产科', '妇科', 'OB', 'GYN', 'OBGYN', 'pregnancy', 'delivery', 'Valley', 'Hackensack', 'Englewood', 'Premera'],
    itemLabel: '位去重医生',
    accent: 'ochre',
    icon: 'care',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'meal-builder',
    route: '/meal-builder/',
    categoryId: 'food-home',
    title: 'Meal Builder',
    summary: '勾选这顿可用的食材，实时补齐 Protein、Vegetable、Staple 和孩子需要的菜。',
    keywords: ['饮食', '组餐', '食材', '菜谱', '做饭', 'meal', 'recipe', 'ingredient', 'cooking'],
    itemLabel: '道候选菜',
    accent: 'berry',
    icon: 'meal',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'restaurants',
    route: '/restaurants/',
    categoryId: 'food-home',
    title: 'Restaurants',
    summary: '按堂食、外卖、类型和平台快速查找饭店与下单入口。',
    keywords: ['饮食', '饭店', '餐厅', '堂食', '外卖', '自取', 'restaurant', 'delivery', 'pickup', 'takeout'],
    itemLabel: '家饭店',
    accent: 'berry',
    icon: 'meal',
    privacyClass: 'public-reference',
    status: 'active',
  },
  {
    id: 'sami-notebook',
    route: '/sami-notebook/',
    categoryId: 'food-home',
    title: 'Sami的小本本',
    summary: '家庭共享的 Todo、项目、影视清单和随手记；完成状态、Board 和评论实时同步。',
    keywords: ['家庭', '记事', 'todo', '任务', '项目', '电影', '电视', 'notebook', 'board'],
    itemLabel: '个事项',
    accent: 'berry',
    icon: 'notebook',
    privacyClass: 'authenticated-household',
    status: 'active',
  },
] as const satisfies readonly ModuleDefinition[];
