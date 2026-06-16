import { z } from 'zod';

import { BRAND_NAME_RU } from './brand.js';
import { BENCHMARK_MIN_POOL_PARTICIPANTS, BENCHMARK_POOL_CONTRIBUTION_LABEL } from './benchmark-pool.js';
import type { PrivacySettingsView } from './schemas.js';

export const DataContributionPathSchema = z.enum([
  'none',
  'market_only',
  'file_import',
  'marketplace_api',
  'database',
]);

export type DataContributionPath = z.infer<typeof DataContributionPathSchema>;

export const TrustCapabilitiesSchema = z.object({
  personalDashboards: z.boolean(),
  personalInsights: z.boolean(),
  marketInsights: z.boolean(),
  benchmarkInsights: z.boolean(),
  benchmarkContribution: z.boolean(),
  autoRefresh: z.boolean(),
});

export type TrustCapabilities = z.infer<typeof TrustCapabilitiesSchema>;

export const TrustPolicyPillarSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  active: z.boolean(),
});

export type TrustPolicyPillar = z.infer<typeof TrustPolicyPillarSchema>;

export const TrustFaqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export type TrustFaqItem = z.infer<typeof TrustFaqItemSchema>;

export const TrustPolicyViewSchema = z.object({
  contributionPath: DataContributionPathSchema,
  contributionLabel: z.string(),
  contributionHint: z.string(),
  capabilities: TrustCapabilitiesSchema,
  pillars: z.array(TrustPolicyPillarSchema),
  faq: z.array(TrustFaqItemSchema),
  dataHandling: z.object({
    storesRawSellerData: z.boolean(),
    benchmarkUsesAnonymizedAggregatesOnly: z.boolean(),
    encryptionAtRest: z.boolean(),
  }),
});

export type TrustPolicyView = z.infer<typeof TrustPolicyViewSchema>;

export const TRUST_POLICY_PILLAR_DEFS = [
  {
    id: 'confidentiality',
    label: 'Конфиденциальность',
    description: 'Шифрование ключей и доступов, изоляция по компании, без продажи сырых данных.',
  },
  {
    id: 'community',
    label: 'Сообщество',
    description:
      'Бенчмарки — только обезличенные сводки по категории; сравнение при достаточной выборке участников.',
  },
  {
    id: 'ai',
    label: 'ИИ',
    description: 'Модели видят сводки и аномалии, а не строки заказов и артикулы.',
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    description: 'Личные, рыночные и бенчмарк-инсайты — разные слои с разными правилами доступа.',
  },
  {
    id: 'evolution',
    label: 'Постоянное развитие',
    description: 'Алгоритмы и сегменты пула обновляются по мере роста сообщества.',
  },
  {
    id: 'feedback',
    label: 'Обратная связь',
    description: 'Поддержка учитывает кейсы селлеров при развитии продукта.',
  },
  {
    id: 'scaling',
    label: 'Масштабирование',
    description: 'API и БД дают автообновление без ручных выгрузок.',
  },
  {
    id: 'freshness',
    label: 'Актуальность данных',
    description: 'Чем ближе источник к кабинету, тем свежее цифры в дашбордах.',
  },
  {
    id: 'convenience',
    label: 'Удобство',
    description: 'Можно начать с файла или рынка и подключить API позже.',
  },
  {
    id: 'speed',
    label: 'Скорость',
    description: 'Автосинхронизация и готовые отчёты экономят время на рутине.',
  },
] as const;

export const CONTRIBUTION_PATH_COPY: Record<
  DataContributionPath,
  { label: string; hint: string; trustPoints: string[] }
> = {
  none: {
    label: 'Демо или только обзор',
    hint: 'Свои продажи не подключены — доступны демо-дашборды и рыночные тренды по категории.',
    trustPoints: [
      'Ключи и файлы не передаются',
      'Можно подключить данные позже, когда будете готовы',
    ],
  },
  market_only: {
    label: 'Только рынок',
    hint: 'Смотрите сезонность и тренды категории без доступа к вашему кабинету.',
    trustPoints: [
      'Личный кабинет не нужен',
      'Бенчмарки — отдельное согласие',
    ],
  },
  file_import: {
    label: 'Файл CSV / Excel',
    hint: 'Дозированная загрузка: вы сами решаете, какой отчёт и когда отдать.',
    trustPoints: [
      'Файл можно удалить сразу после обработки',
      'API-ключ не обязателен',
      `В пул — только ${BENCHMARK_POOL_CONTRIBUTION_LABEL}, и только с отдельного согласия`,
    ],
  },
  marketplace_api: {
    label: 'API маркетплейса',
    hint: 'Ключ только на чтение — автообновление без ручных выгрузок.',
    trustPoints: [
      'Ключ шифруется и отзывается в один клик в кабинете WB/Ozon',
      `В пул — только ${BENCHMARK_POOL_CONTRIBUTION_LABEL}, и только с отдельного переключателя`,
    ],
  },
  database: {
    label: 'Ваша база данных',
    hint: 'Подключение read-only к витрине — данные остаются у вас.',
    trustPoints: [
      'Мы читаем агрегаты, не копируем всю БД к себе',
      'Подходит агентствам и крупным селлерам с собственной витриной',
    ],
  },
};

export const TRUST_FAQ: TrustFaqItem[] = [
  {
    id: 'is-it-safe',
    question: 'Безопасно ли подключать данные?',
    answer:
      `Да. Ключи и пароли шифруются, доступ к кабинету — только на чтение. Файл можно загрузить порциями и удалить после обработки. В бенчмарк-пул с отдельного согласия уходят только агрегаты: ${BENCHMARK_POOL_CONTRIBUTION_LABEL} — без SKU, артикулов и строк заказов. Сырые данные других селлеров вам не показываются.`,
  },
  {
    id: 'not-resale',
    question: 'Вы не парсер и не перепродаёте отчёты?',
    answer:
      `Нет. ${BRAND_NAME_RU} — аналитика для вашего кабинета и добровольное сравнение с сегментом. Мы не продаём выгрузки третьим лицам и не показываем ваши SKU и заказы другим селлерам. Рыночные тренды строятся по обезличенным сегментам категории.`,
  },
  {
    id: 'pool-threshold',
    question: 'Когда можно доверять бенчмарку?',
    answer:
      `Сравнение с сегментом показываем только при ≥${BENCHMARK_MIN_POOL_PARTICIPANTS} активных участниках в вашей категории — так нельзя «угадывать» конкурента по узкой выборке. В пул уходит только: ${BENCHMARK_POOL_CONTRIBUTION_LABEL}.`,
  },
  {
    id: 'internal-access',
    question: 'Кто внутри команды видит мои продажи?',
    answer:
      'Данные изолированы по компании (tenant). В обычной работе сотрудники не просматривают кабинеты; при обращении в поддержку смотрим только то, что нужно для диагностики, по вашему запросу. Ключи API хранятся в зашифрованном виде.',
  },
  {
    id: 'delete-data',
    question: 'Можно удалить свои данные?',
    answer:
      'Да. Подключение и загруженный файл можно удалить в разделе «Источники данных». После отключения бенчмарков ваши агрегаты ещё 14 дней остаются в пуле (см. настройки), затем перестают участвовать в расчёте. Полное удаление аккаунта — через поддержку.',
  },
  {
    id: 'marketplace-api',
    question: `Узнает ли Wildberries или Ozon, что я подключил ${BRAND_NAME_RU}?`,
    answer:
      'При API вы сами создаёте ключ в кабинете маркетплейса — это стандартный доступ «только чтение», как у сервисов аналитики. Маркетплейс видит запросы по ключу, но не получает доступ к другим вашим сервисам.',
  },
  {
    id: 'why-share',
    question: 'Зачем делиться данными с сообществом?',
    answer:
      'Чтобы видеть актуальные бенчмарки: сезонность ниш, всплески спроса, категории, которые вы могли не заметить. Новичкам это помогает найти стабильные ниши; опытным — не упустить тренд. Принцип честного обмена: смотреть сравнение можно, только если вы тоже вносите обезличенный вклад в пул своей категории.',
  },
  {
    id: 'not-useful',
    question: 'Что если в моей категории пока нечего взять?',
    answer:
      'В узкой нише выборка может быть скромной — зато рыночные тренды и другие категории всё равно помогут расширить ассортимент. Напишите в поддержку: разберём ваш кейс и подскажем, как усилить пользу именно для вас.',
  },
];

export type OrgConnectionProfile = {
  hasMarketplaceApi: boolean;
  hasFileImport: boolean;
  hasDatabase: boolean;
};

export const OrgDataModeSchema = z.enum(['demo', 'live']);
export type OrgDataMode = z.infer<typeof OrgDataModeSchema>;

export function hasPersonalDataSource(connections: OrgConnectionProfile): boolean {
  return (
    connections.hasMarketplaceApi || connections.hasFileImport || connections.hasDatabase
  );
}

export function inferOrgDataMode(connections: OrgConnectionProfile): OrgDataMode {
  return hasPersonalDataSource(connections) ? 'live' : 'demo';
}

export const BENCHMARK_OPT_IN_REQUIRES_PERSONAL_SOURCE =
  'Для участия в бенчмарк-пуле подключите файл, API маркетплейса или базу данных.';

export const PERSONAL_INSIGHTS_REQUIRES_SOURCE =
  'Инсайты по кабинету доступны после подключения файла, API или базы данных.';

export function inferDataContributionPath(profile: OrgConnectionProfile): DataContributionPath {
  if (profile.hasDatabase) return 'database';
  if (profile.hasMarketplaceApi) return 'marketplace_api';
  if (profile.hasFileImport) return 'file_import';
  return 'none';
}

export function getTrustCapabilities(
  path: DataContributionPath,
  privacy: Pick<
    PrivacySettingsView,
    'benchmarkReceiving' | 'benchmarkContributing' | 'benchmarkOptIn'
  >
): TrustCapabilities {
  const hasPersonalSource =
    path === 'file_import' || path === 'marketplace_api' || path === 'database';

  return {
    personalDashboards: hasPersonalSource,
    personalInsights: hasPersonalSource,
    marketInsights: true,
    benchmarkInsights: privacy.benchmarkReceiving,
    benchmarkContribution: privacy.benchmarkContributing,
    autoRefresh: path === 'marketplace_api' || path === 'database',
  };
}

function buildPillars(
  path: DataContributionPath,
  privacy: PrivacySettingsView,
  capabilities: TrustCapabilities
): TrustPolicyPillar[] {
  return TRUST_POLICY_PILLAR_DEFS.map((pillar) => {
    let active = false;

    switch (pillar.id) {
      case 'confidentiality':
        active = true;
        break;
      case 'community':
        active = privacy.benchmarkOptIn || privacy.benchmarkContributing;
        break;
      case 'ai':
        active = capabilities.personalInsights || capabilities.benchmarkInsights;
        break;
      case 'analytics':
        active =
          capabilities.personalDashboards ||
          capabilities.marketInsights ||
          capabilities.benchmarkInsights;
        break;
      case 'evolution':
        active = true;
        break;
      case 'feedback':
        active = true;
        break;
      case 'scaling':
        active = path === 'marketplace_api' || path === 'database';
        break;
      case 'freshness':
        active = path !== 'none' && path !== 'market_only';
        break;
      case 'convenience':
        active = path === 'file_import' || path === 'none' || path === 'market_only';
        break;
      case 'speed':
        active = capabilities.autoRefresh;
        break;
      default:
        active = false;
    }

    return { ...pillar, active };
  });
}

export function buildTrustPolicyView(input: {
  privacy: PrivacySettingsView;
  connections: OrgConnectionProfile;
}): TrustPolicyView {
  const contributionPath =
    input.connections.hasMarketplaceApi ||
    input.connections.hasFileImport ||
    input.connections.hasDatabase
      ? inferDataContributionPath(input.connections)
      : ('market_only' as const);

  const pathCopy = CONTRIBUTION_PATH_COPY[contributionPath];
  const capabilities = getTrustCapabilities(contributionPath, input.privacy);

  return TrustPolicyViewSchema.parse({
    contributionPath,
    contributionLabel: pathCopy.label,
    contributionHint: pathCopy.hint,
    capabilities,
    pillars: buildPillars(contributionPath, input.privacy, capabilities),
    faq: TRUST_FAQ,
    dataHandling: {
      storesRawSellerData: contributionPath !== 'market_only' && contributionPath !== 'none',
      benchmarkUsesAnonymizedAggregatesOnly: true,
      encryptionAtRest: true,
    },
  });
}
