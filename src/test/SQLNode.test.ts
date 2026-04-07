import { describe, expect, test } from 'vitest';
import { FragmentSQLNode, ParamSQLNode, PlaceholderSQLNode, RawSQLNode } from '../main/index.js';

describe('fillPlaceholders', () => {
  test('replaces placeholder with ParamSQLNode', () => {
    const sql = new FragmentSQLNode([new PlaceholderSQLNode('aaa')]).fillPlaceholders({ aaa: 111 }) as FragmentSQLNode;

    expect(sql.childNodes).toEqual([new ParamSQLNode(111, 'aaa')]);
  });

  test('preserves non-placeholder nodes', () => {
    const sql = new FragmentSQLNode([
      new RawSQLNode('aaa'),
      new PlaceholderSQLNode('bbb'),
      new RawSQLNode('ccc'),
      new PlaceholderSQLNode('ddd'),
    ]).fillPlaceholders({ bbb: 111, ddd: 222 }) as FragmentSQLNode;

    expect(sql.childNodes).toEqual([
      new RawSQLNode('aaa'),
      new ParamSQLNode(111, 'bbb'),
      new RawSQLNode('ccc'),
      new ParamSQLNode(222, 'ddd'),
    ]);
  });

  test('throws for missing key', () => {
    expect(() => new FragmentSQLNode([new PlaceholderSQLNode('ddd')]).fillPlaceholders({} as any)).toThrow(
      new Error('Param value cannot be undefined')
    );
  });
});
