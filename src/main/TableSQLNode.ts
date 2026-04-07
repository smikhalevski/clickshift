import { InferResult, SQL_NODE, SQLNode, Squash } from './SQLNode.js';

export type InferRow<TColumns extends Record<string, SQLNode>> = Squash<{
  [K in keyof TColumns & string]: InferResult<TColumns[K]>;
}>;

export type InferRowNodes<TRow extends Record<string, unknown>> = Squash<{
  [K in keyof TRow & string]: SQLNode<TRow[K]>;
}>;

export type InferColumnNodes<TRow extends Record<string, unknown>> = Squash<{
  [K in keyof TRow & string]: ColumnSQLNode<TRow[K]>;
}>;

export interface ValueAdapter<TValue = unknown, TDriverValue = unknown, TConfig = unknown> {
  getTypeRawSQL(config: TConfig): string;

  encodeValue(value: TValue): TDriverValue;

  decodeValue(value: TDriverValue): TValue;
}

export function createIdentityValueAdapter<TValue, TConfig = unknown>(
  getTypeRawSQL: (config: TConfig) => string
): ValueAdapter<TValue, TValue, TConfig> {
  return {
    getTypeRawSQL,
    encodeValue: value => value,
    decodeValue: value => value,
  };
}

export class ColumnSQLNode<TValue = unknown> extends SQLNode<TValue> {
  protected _valueAdapter: ValueAdapter<TValue>;

  constructor(
    readonly name: string,
    valueAdapter: ValueAdapter<TValue>
  ) {
    super();
    this._valueAdapter = valueAdapter;
  }
}

export abstract class ColumnBuilder<TColumnNode extends ColumnSQLNode> {
  protected readonly _name;

  constructor(name?: string) {
    this._name = name;
  }

  protected abstract _build(key: string, tableNode: TableSQLNode): TColumnNode;
}

export type InferColumnBuilders<TColumnNodes extends Record<string, ColumnSQLNode>> = {
  [K in keyof TColumnNodes]: ColumnBuilder<TColumnNodes[K]>;
};

export class TableSQLNode<TColumnNodes extends Record<string, ColumnSQLNode> = {}> extends SQLNode {
  readonly columnNodes: Readonly<TColumnNodes>;

  constructor(
    readonly name: string,
    builders: InferColumnBuilders<TColumnNodes>
  ) {
    super();

    const columnNodes: Record<string, ColumnSQLNode> = { [SQL_NODE]: this };

    for (const key in builders) {
      columnNodes[key] = builders[key]['_build'](key, this);
    }

    this.columnNodes = columnNodes as TColumnNodes;
  }
}
