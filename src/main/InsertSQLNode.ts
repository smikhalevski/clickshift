import { SQLNode } from './SQLNode.js';
import { InferColumnNodes, TableSQLNode } from './TableSQLNode.js';

type OneOrMany<T> = T | T[];

export class InsertSQLNode<TRow extends Record<string, unknown>> extends SQLNode<void> {
  protected _tableNode: TableSQLNode<InferColumnNodes<TRow>>;
  protected _values: OneOrMany<TRow> | undefined;

  constructor(tableNode: TableSQLNode<InferColumnNodes<TRow>>) {
    super();
    this._tableNode = tableNode;
  }

  values(values: OneOrMany<TRow>): InsertSQLNode<TRow> {
    this._values = values;
    return this;
  }
}
