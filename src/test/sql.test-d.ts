import { expectTypeOf, test } from 'vitest';
import { FragmentSQLNode, PlaceholderSQLNode, sql, SQLNode } from '../main/index.js';

test('creates placeholder with unknown result', () => {
  const node = sql.placeholder('aaa');

  expectTypeOf(node).toEqualTypeOf<PlaceholderSQLNode<'aaa', any>>();
});

test('creates placeholder with typed result', () => {
  const node = sql.placeholder('aaa').cast<number>();

  expectTypeOf(node['_inferPlaceholders']).toEqualTypeOf<{ aaa: number }>();
});

test('keeps nested placeholder types', () => {
  const node = sql`${sql.placeholder('aaa').cast<number>()}`;

  expectTypeOf(node).toEqualTypeOf<SQLNode<any, { aaa: number }>>();
});

test('merges placeholder types', () => {
  const node = sql`${sql.placeholder('aaa').cast<number>()}${sql.placeholder('bbb').cast<string>()}`;

  expectTypeOf(node).toEqualTypeOf<SQLNode<any, { aaa: number; bbb: string }>>();
});

test('merges placeholder types and owerwrites return type', () => {
  const node = sql`${sql.placeholder('aaa').cast<number>()}${sql.placeholder('bbb').cast<string>()}`.cast<boolean>();

  expectTypeOf(node).toEqualTypeOf<SQLNode<boolean, { aaa: number; bbb: string }>>();
});

test('concatenates placeholder types', () => {
  const node = sql.placeholder('aaa').cast<number>().concat(sql.placeholder('bbb').cast<string>());

  expectTypeOf(node).toEqualTypeOf<FragmentSQLNode<any, { aaa: number; bbb: string }>>();
});
