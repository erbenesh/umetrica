import {
  buildDefaultGraphLayout,
  buildSuggestedJoinSql,
  DEFAULT_ORDERS_GRAPH_LAYOUT,
  DEFAULT_ORDERS_SEMANTIC_CUBE,
  semanticJoinId,
  type SemanticCubeDefinition,
  type SemanticGraphLayout,
  type SemanticViewDefinition,
} from './semantic-schemas.js';

export type DemoSemanticCubeSeed = {
  definition: SemanticCubeDefinition;
  layout: SemanticGraphLayout;
};

const CUSTOMERS_CUBE: SemanticCubeDefinition = {
  name: 'Customers',
  displayTitle: 'Клиенты',
  displayShortTitle: 'Клиенты',
  description: 'Покупатели: город, сегмент и дата регистрации.',
  source: {
    sql: 'SELECT * FROM public.customers',
    table: 'public.customers',
    connectionLabel: 'PostgreSQL',
    columns: ['id', 'tenant_id', 'email', 'city', 'segment', 'created_at'],
  },
  measures: [
    {
      id: 'measure:count',
      name: 'count',
      title: 'Количество клиентов',
      shortTitle: 'Клиенты',
      sql: '*',
      type: 'count',
    },
  ],
  dimensions: [
    {
      id: 'dimension:id',
      name: 'id',
      title: 'ID',
      shortTitle: 'ID',
      sql: 'id',
      type: 'string',
      primaryKey: true,
    },
    {
      id: 'dimension:email',
      name: 'email',
      title: 'Email',
      sql: 'email',
      type: 'string',
    },
    {
      id: 'dimension:city',
      name: 'city',
      title: 'Город клиента',
      shortTitle: 'Город',
      sql: 'city',
      type: 'string',
    },
    {
      id: 'dimension:segment',
      name: 'segment',
      title: 'Сегмент клиента',
      shortTitle: 'Сегмент',
      sql: 'segment',
      type: 'string',
    },
    {
      id: 'dimension:createdAt',
      name: 'createdAt',
      title: 'Дата регистрации',
      shortTitle: 'Регистрация',
      sql: 'created_at',
      type: 'time',
      granularity: 'day',
    },
    {
      id: 'dimension:tenantId',
      name: 'tenantId',
      title: 'tenantId',
      description: 'Системное измерение · нельзя удалить',
      sql: 'tenant_id',
      type: 'string',
      locked: true,
    },
  ],
  joins: [],
  segments: [
    {
      id: 'segment:vip',
      name: 'vip',
      title: 'VIP-клиенты',
      shortTitle: 'VIP',
      sql: "segment = 'vip'",
    },
  ],
  hierarchies: [
    {
      id: 'hierarchy:geo',
      name: 'geo',
      title: 'География клиентов',
      shortTitle: 'География',
      levels: ['segment', 'city'],
    },
  ],
  preAggregations: [],
};

const PRODUCTS_CUBE: SemanticCubeDefinition = {
  name: 'Products',
  displayTitle: 'Товары',
  displayShortTitle: 'Товары',
  description: 'Каталог товаров с ценой и категорией.',
  source: {
    sql: 'SELECT * FROM public.products',
    table: 'public.products',
    connectionLabel: 'PostgreSQL',
    columns: ['id', 'tenant_id', 'name', 'category', 'price', 'created_at'],
  },
  measures: [
    {
      id: 'measure:count',
      name: 'count',
      title: 'Количество SKU',
      shortTitle: 'SKU',
      sql: '*',
      type: 'count',
    },
    {
      id: 'measure:totalPrice',
      name: 'totalPrice',
      title: 'Сумма цен',
      shortTitle: 'Цены',
      sql: 'price',
      type: 'sum',
      format: 'currency',
    },
    {
      id: 'measure:avgPrice',
      name: 'avgPrice',
      title: 'Средняя цена',
      shortTitle: 'Ср. цена',
      sql: 'price',
      type: 'avg',
      format: 'currency',
    },
  ],
  dimensions: [
    {
      id: 'dimension:id',
      name: 'id',
      title: 'ID',
      shortTitle: 'ID',
      sql: 'id',
      type: 'string',
      primaryKey: true,
    },
    {
      id: 'dimension:name',
      name: 'name',
      title: 'Название товара',
      shortTitle: 'Название',
      sql: 'name',
      type: 'string',
    },
    {
      id: 'dimension:category',
      name: 'category',
      title: 'Категория товара',
      shortTitle: 'Категория',
      sql: 'category',
      type: 'string',
    },
    {
      id: 'dimension:createdAt',
      name: 'createdAt',
      title: 'Дата добавления',
      shortTitle: 'Добавлен',
      sql: 'created_at',
      type: 'time',
      granularity: 'day',
    },
    {
      id: 'dimension:tenantId',
      name: 'tenantId',
      title: 'tenantId',
      description: 'Системное измерение · нельзя удалить',
      sql: 'tenant_id',
      type: 'string',
      locked: true,
    },
  ],
  joins: [],
  segments: [],
  hierarchies: [],
  preAggregations: [
    {
      id: 'preAgg:by_category',
      name: 'by_category',
      measures: ['count', 'totalPrice'],
      dimensions: ['category'],
    },
  ],
};

const ORDER_ITEMS_CUBE: SemanticCubeDefinition = {
  name: 'OrderItems',
  displayTitle: 'Позиции заказов',
  displayShortTitle: 'Позиции',
  description: 'Строки заказов: количество и сумма по товарам.',
  source: {
    sql: 'SELECT * FROM public.order_items',
    table: 'public.order_items',
    connectionLabel: 'PostgreSQL',
    columns: ['id', 'tenant_id', 'order_id', 'product_id', 'quantity', 'amount', 'created_at'],
  },
  measures: [
    {
      id: 'measure:count',
      name: 'count',
      title: 'Количество строк',
      shortTitle: 'Строки',
      sql: '*',
      type: 'count',
    },
    {
      id: 'measure:quantity',
      name: 'quantity',
      title: 'Количество единиц',
      shortTitle: 'Единицы',
      sql: 'quantity',
      type: 'sum',
    },
    {
      id: 'measure:lineRevenue',
      name: 'lineRevenue',
      title: 'Выручка по строкам',
      shortTitle: 'Выручка',
      sql: 'amount',
      type: 'sum',
      format: 'currency',
    },
  ],
  dimensions: [
    {
      id: 'dimension:id',
      name: 'id',
      title: 'ID',
      shortTitle: 'ID',
      sql: 'id',
      type: 'string',
      primaryKey: true,
    },
    {
      id: 'dimension:orderId',
      name: 'orderId',
      title: 'Заказ',
      sql: 'order_id',
      type: 'string',
    },
    {
      id: 'dimension:productId',
      name: 'productId',
      title: 'Товар',
      sql: 'product_id',
      type: 'string',
    },
    {
      id: 'dimension:createdAt',
      name: 'createdAt',
      title: 'Дата',
      sql: 'created_at',
      type: 'time',
      granularity: 'day',
    },
    {
      id: 'dimension:tenantId',
      name: 'tenantId',
      title: 'tenantId',
      description: 'Системное измерение · нельзя удалить',
      sql: 'tenant_id',
      type: 'string',
      locked: true,
    },
  ],
  joins: [
    {
      id: semanticJoinId('OrderItems', 'Orders'),
      targetCube: 'Orders',
      relationship: 'belongsTo',
      sql: buildSuggestedJoinSql('OrderItems', 'order_id', 'Orders', 'id'),
    },
    {
      id: semanticJoinId('OrderItems', 'Products'),
      targetCube: 'Products',
      relationship: 'belongsTo',
      sql: buildSuggestedJoinSql('OrderItems', 'product_id', 'Products', 'id'),
    },
  ],
  segments: [],
  hierarchies: [],
  preAggregations: [],
};

function buildOrdersDemoCube(): SemanticCubeDefinition {
  return {
    ...DEFAULT_ORDERS_SEMANTIC_CUBE,
    source: {
      ...DEFAULT_ORDERS_SEMANTIC_CUBE.source,
      columns: ['id', 'tenant_id', 'customer_id', 'status', 'amount', 'created_at'],
    },
    dimensions: [
      {
        id: 'dimension:id',
        name: 'id',
        title: 'ID',
        shortTitle: 'ID',
        sql: 'id',
        type: 'string',
        primaryKey: true,
      },
      {
        id: 'dimension:status',
        name: 'status',
        title: 'Статус заказа',
        shortTitle: 'Статус',
        sql: 'status',
        type: 'string',
      },
      {
        id: 'dimension:createdAt',
        name: 'createdAt',
        title: 'Дата заказа',
        shortTitle: 'Дата',
        sql: 'created_at',
        type: 'time',
        granularity: 'day',
      },
      {
        id: 'dimension:customerId',
        name: 'customerId',
        title: 'Клиент',
        shortTitle: 'Клиент',
        sql: 'customer_id',
        type: 'string',
      },
      {
        id: 'dimension:tenantId',
        name: 'tenantId',
        title: 'tenantId',
        description: 'Системное измерение · нельзя удалить',
        sql: 'tenant_id',
        type: 'string',
        locked: true,
      },
    ],
    joins: [
      {
        id: semanticJoinId('Orders', 'Customers'),
        targetCube: 'Customers',
        relationship: 'belongsTo',
        sql: buildSuggestedJoinSql('Orders', 'customer_id', 'Customers', 'id'),
      },
    ],
    segments: [
      {
        id: 'segment:completed',
        name: 'completed',
        title: 'Завершённые заказы',
        shortTitle: 'Завершённые',
        sql: "status = 'completed'",
      },
      {
        id: 'segment:pending',
        name: 'pending',
        title: 'Заказы в обработке',
        shortTitle: 'В обработке',
        sql: "status = 'pending'",
      },
    ],
    hierarchies: [
      {
        id: 'hierarchy:status_time',
        name: 'status_time',
        title: 'Статус и дата заказа',
        shortTitle: 'Статус → дата',
        levels: ['status', 'createdAt'],
      },
    ],
    preAggregations: [
      {
        id: 'preAgg:orders_by_day',
        name: 'orders_by_day',
        measures: ['count', 'revenue'],
        dimensions: ['status'],
        timeDimension: 'createdAt',
        granularity: 'day',
        refreshKey: { every: '1 hour' },
      },
    ],
  };
}

export function getDemoSemanticCubeSeeds(): DemoSemanticCubeSeed[] {
  const orders = buildOrdersDemoCube();

  return [
    { definition: orders, layout: DEFAULT_ORDERS_GRAPH_LAYOUT },
    { definition: CUSTOMERS_CUBE, layout: buildDefaultGraphLayout(CUSTOMERS_CUBE) },
    { definition: PRODUCTS_CUBE, layout: buildDefaultGraphLayout(PRODUCTS_CUBE) },
    { definition: ORDER_ITEMS_CUBE, layout: buildDefaultGraphLayout(ORDER_ITEMS_CUBE) },
  ];
}

export const DEMO_SEMANTIC_VIEW: SemanticViewDefinition = {
  name: 'SalesOverview',
  title: 'Обзор продаж',
  shortTitle: 'Продажи',
  description: 'Позиции заказов с мерами заказов и товаров.',
  cubes: [
    {
      joinPath: 'OrderItems',
      includes: ['count', 'quantity', 'lineRevenue', 'createdAt'],
    },
    {
      joinPath: 'OrderItems.Orders',
      includes: ['status', 'revenue'],
    },
    {
      joinPath: 'OrderItems.Products',
      includes: ['category', 'name', 'avgPrice'],
    },
  ],
};
