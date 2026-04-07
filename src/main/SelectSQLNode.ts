import { SQLNode, SQLNodeWrapper, Squash, unwrapSQLNode } from './SQLNode.js';
import { InferRowNodes } from './TableSQLNode.js';

export class SelectSQLNode<
  TRow extends Record<string, unknown>,
  TPlaceholders extends Record<string, unknown> = {},
> extends SQLNode<TRow[], TPlaceholders> {
  protected _rowNodes: Record<string, SQLNode>;
  protected _fromNode: SQLNode | undefined;
  protected _whereNode: SQLNode | undefined;

  constructor(rowNodes: InferRowNodes<TRow>) {
    super();
    this._rowNodes = rowNodes;
  }

  from<TNodePlaceholders extends Record<string, unknown> = {}>(
    node: SQLNodeWrapper<SQLNode<unknown, TNodePlaceholders>>
  ): SelectSQLNode<TRow, Squash<TNodePlaceholders & TPlaceholders>> {
    this._fromNode = unwrapSQLNode(node);
    return this as unknown as SelectSQLNode<TRow, Squash<TNodePlaceholders & TPlaceholders>>;
  }

  where<TNodePlaceholders extends Record<string, unknown> = {}>(
    node: SQLNodeWrapper<SQLNode<boolean, TNodePlaceholders>> | undefined
  ): SelectSQLNode<TRow, Squash<TNodePlaceholders & TPlaceholders>> {
    this._whereNode = unwrapSQLNode(node);
    return this as unknown as SelectSQLNode<TRow, Squash<TNodePlaceholders & TPlaceholders>>;
  }

  fillPlaceholders(values: TPlaceholders): SQLNode<TRow[]> {
    const node = new SelectSQLNode<TRow>(
      Object.fromEntries(Object.entries(this._rowNodes).map(e => [e[0], e[1].fillPlaceholders(values)])) as any
    );

    node._fromNode = this._fromNode?.fillPlaceholders(values);
    node._whereNode = this._whereNode?.fillPlaceholders(values);

    return node;
  }
}
