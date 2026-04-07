import * as clickhouse from '../../../main/dialect/clickhouse/index.js';
import { toClickhouseSelectQuery } from '../../../main/dialect/clickhouse/index.js';
import { sql } from '../../../main/index.js';
import { expect, test } from 'vitest';

test('stringifies query', () => {
  const fooTable = clickhouse.table('foo', {
    bar: clickhouse.String('bar').nullable(),
    qux: clickhouse.Int8('qux'),
  });

  const selectNode1 = sql.select({ rrr: sql.placeholder('ooo').cast<number>() }).from(fooTable);

  const selectNode2 = sql
    .select({
      bar: fooTable.bar,
      fff: sql.sum(fooTable.qux),
    })
    .from(selectNode1)
    .where(sql.eq(fooTable.bar, sql.select({ xxx: fooTable.bar }).from(fooTable)))
    .fillPlaceholders({ ooo: 111 });

  expect(toClickhouseSelectQuery(selectNode2)).toStrictEqual({
    text: 'SELECT `foo`.`bar`,sum(`foo`.`qux`) FROM (SELECT {ooo:Auto} FROM `foo`) WHERE `foo`.`bar` = SELECT `foo`.`bar` FROM `foo`',
    params: {
      ooo: 111,
    },
  });
});
