import { describe, expect, test } from 'vitest';
import { FragmentSQLNode, ParamSQLNode, PlaceholderSQLNode, RawSQLNode, sql } from '../main/index.js';

describe('sql', () => {
  test('returns raw text', () => {
    expect(sql`aaa`).toStrictEqual(new RawSQLNode('aaa'));
  });

  test('returns fragment with params', () => {
    expect(sql`aaa${111}`).toStrictEqual(new FragmentSQLNode([new RawSQLNode('aaa'), new ParamSQLNode(111)]));

    expect(sql`${111}bbb`).toStrictEqual(new FragmentSQLNode([new ParamSQLNode(111), new RawSQLNode('bbb')]));

    expect(sql`aaa${111}bbb`).toStrictEqual(
      new FragmentSQLNode([new RawSQLNode('aaa'), new ParamSQLNode(111), new RawSQLNode('bbb')])
    );
  });

  test('ignores undefined', () => {
    expect(sql`aaa${undefined}bbb`).toStrictEqual(new FragmentSQLNode([new RawSQLNode('aaa'), new RawSQLNode('bbb')]));
  });

  test('keeps SQLNode instnaces', () => {
    expect(sql`aaa${sql.placeholder('ccc')}bbb`).toStrictEqual(
      new FragmentSQLNode([new RawSQLNode('aaa'), new PlaceholderSQLNode('ccc'), new RawSQLNode('bbb')])
    );
  });
});

describe('sql.join', () => {
  test('joins nodes', () => {
    expect(sql.join([sql`aaa`])).toStrictEqual(new RawSQLNode('aaa'));

    expect(sql.join([sql`aaa`, sql`bbb`])).toStrictEqual(
      new FragmentSQLNode([new RawSQLNode('aaa'), new RawSQLNode('bbb')])
    );
  });

  test('ignores undefined', () => {
    expect(sql.join([sql`aaa`, undefined, sql`bbb`])).toStrictEqual(
      new FragmentSQLNode([new RawSQLNode('aaa'), new RawSQLNode('bbb')])
    );
  });

  test('inserts reparator', () => {
    expect(sql.join([sql`aaa`, sql`bbb`], sql`ccc`)).toStrictEqual(
      new FragmentSQLNode([new RawSQLNode('aaa'), new RawSQLNode('ccc'), new RawSQLNode('bbb')])
    );
  });
});
