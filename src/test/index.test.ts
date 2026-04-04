import { expect, test } from 'vitest';
import { SQL, sql, SQLPreparedStatement } from '../main/index.js';

// test('sql', () => {
//   expect(sql`aaa${sql`ccc`}bbb`).toEqual(new SQL(['aaacccbbb'], []));
//   expect(sql`aaa${sql`ccc${111}ddd`}bbb`).toEqual(new SQL(['aaaccc', 'dddbbb'], [111]));
//   expect(sql`aaa${sql`${111}ddd`}bbb`).toEqual(new SQL(['aaa', 'dddbbb'], [111]));
//   expect(sql`aaa${sql`ccc${111}`}bbb`).toEqual(new SQL(['aaaccc', 'bbb'], [111]));
//   expect(sql`aaa${sql`ccc${111}ddd${222}`}bbb`).toEqual(new SQL(['aaaccc', 'ddd', 'bbb'], [111, 222]));
//   expect(sql`aaa${sql`ccc${sql`eee${111}fff`}ddd`}bbb`).toEqual(new SQL(['aaaccceee', 'fffdddbbb'], [111]));
//   expect(sql`aaa${sql`ccc${sql`eee${111}${222}fff`}ddd`}bbb`).toEqual(
//     new SQL(['aaaccceee', '', 'fffdddbbb'], [111, 222])
//   );
// });

test('toPreparedStatement', () => {
  expect(sql`aaa${sql`ccc`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaacccbbb',
    values: {},
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`ccc${111}ddd`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaaccc{p1:Auto}dddbbb',
    values: {
      p1: 111,
    },
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`${111}ddd`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaa{p1:Auto}dddbbb',
    values: {
      p1: 111,
    },
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`ccc${111}`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaaccc{p1:Auto}bbb',
    values: {
      p1: 111,
    },
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`ccc${111}ddd${222}`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaaccc{p1:Auto}ddd{p2:Auto}bbb',
    values: {
      p1: 111,
      p2: 222,
    },
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`ccc${sql`eee${111}fff`}ddd`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaaccceee{p1:Auto}fffdddbbb',
    values: {
      p1: 111,
    },
  } satisfies SQLPreparedStatement);

  expect(sql`aaa${sql`ccc${sql`eee${111}${222}fff`}ddd`}bbb`.toPreparedStatement()).toStrictEqual({
    sqlStatement: 'aaaccceee{p1:Auto}{p2:Auto}fffdddbbb',
    values: {
      p1: 111,
      p2: 222,
    },
  } satisfies SQLPreparedStatement);
});

test('e2e', () => {
  const fooTable = sql.table(
    'foo',
    {
      fooId: sql.String().nullable().$type<'xxx'>().default('xxx'),
      payload: sql.JSON().nullable().$type<[string]>(),
    },
    {
      engine: 'MergeTree',
      orderBy: table => [table.fooId],
    }
  );

  expect(
    sql`
    SELECT ${fooTable.payload}
    FROM ${fooTable}
    WHERE ${sql.eq(fooTable.fooId, 'xxx')}
  `.toPreparedStatement()
  ).toEqual({
    sqlStatement: `
    SELECT \`foo\`.\`payload\`
    FROM \`foo\`
    WHERE \`foo\`.\`fooId\`={p1:Auto}
  `,
    values: {
      p1: 'xxx',
    },
  } satisfies SQLPreparedStatement);
});
