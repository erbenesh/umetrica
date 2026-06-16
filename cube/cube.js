module.exports = {
  queryRewrite: (query, { securityContext }) => {
    const tenantId = securityContext?.tenantId;

    if (!tenantId) {
      throw new Error('Missing tenantId in security context');
    }

    const tenantCubes = new Set(
      require('./model/tenant-isolated-cubes.json')
    );

    const cubeNames = new Set();
    const collect = (member) => {
      if (typeof member !== 'string' || !member.includes('.')) return;
      cubeNames.add(member.split('.')[0]);
    };

    for (const measure of query.measures ?? []) collect(measure);
    for (const dimension of query.dimensions ?? []) collect(dimension);
    for (const timeDimension of query.timeDimensions ?? []) collect(timeDimension.dimension);
    for (const filter of query.filters ?? []) collect(filter.member);

    const filters = [...(query.filters ?? [])];
    const hasFilter = (member) => filters.some((filter) => filter.member === member);

    for (const cubeName of cubeNames) {
      if (!tenantCubes.has(cubeName)) continue;
      const member = `${cubeName}.tenantId`;
      if (!hasFilter(member)) {
        filters.push({
          member,
          operator: 'equals',
          values: [tenantId],
        });
      }
    }

    query.filters = filters;
    return query;
  },
};
