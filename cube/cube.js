module.exports = {
  queryRewrite: (query, { securityContext }) => {
    const tenantId = securityContext?.tenantId;

    if (!tenantId) {
      throw new Error('Missing tenantId in security context');
    }

    query.filters = [
      ...(query.filters ?? []),
      {
        member: 'Orders.tenantId',
        operator: 'equals',
        values: [tenantId],
      },
    ];

    return query;
  },
};
