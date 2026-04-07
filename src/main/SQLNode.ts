type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type ReplaceAny<T, R = unknown> = 0 extends 1 & T ? R : T;

export type Squash<T> = { [K in keyof T]: T[K] } & {};

export type InferResult<T> = T extends SQLNodeWrapper<infer TNode> ? TNode['_inferResult'] : never;

export type InferPlaceholders<T> = Squash<
  UnionToIntersection<T extends SQLNodeWrapper<infer TNode> ? TNode['_inferPlaceholders'] : never>
>;

export interface SQLNodeVisitor {
  onEnter(node: SQLNode): boolean | void;

  onExit(node: SQLNode): void;
}

export type SQL_NODE = typeof SQL_NODE;

const SQL_NODE = Symbol('SQL_NODE');

// Disables intellisense for SQL_NODE
export { SQL_NODE };

export interface SQLNodeWrapper<TNode extends SQLNode = SQLNode> {
  readonly [SQL_NODE]: TNode;
}

export abstract class SQLNode<
  TResult = unknown,
  TPlaceholders extends Record<string, unknown> = {},
> implements SQLNodeWrapper<SQLNode<TResult, TPlaceholders>> {
  declare readonly ['_inferResult']: TResult;
  declare readonly ['_inferPlaceholders']: TPlaceholders;

  readonly [SQL_NODE] = this;

  isEmpty(): boolean {
    return false;
  }

  concat<TChildren extends ReadonlyArray<SQLNodeWrapper | string | undefined>>(
    ...children: TChildren
  ): FragmentSQLNode<any, Squash<InferPlaceholders<TChildren[number]> & TPlaceholders>> {
    const childNodes: SQLNode[] = [this];

    for (const child of children) {
      if (child !== undefined) {
        childNodes.push(typeof child === 'string' ? new RawSQLNode(child) : toSQLNode(child));
      }
    }

    return new FragmentSQLNode(childNodes);
  }

  alias(name: string): AliasedSQLNode<TResult, TPlaceholders> {
    return new AliasedSQLNode(name, this);
  }

  cast<TRefinedResult extends TResult>(): SQLNode<TRefinedResult, TPlaceholders> {
    return this as unknown as SQLNode<TRefinedResult, TPlaceholders>;
  }

  fillPlaceholders(values: TPlaceholders): SQLNode<TResult> {
    return this;
  }

  visit(visitor: SQLNodeVisitor): void {
    if (visitor.onEnter(this) === false) {
      return;
    }

    if (this instanceof ContainerSQLNode) {
      for (const node of this) {
        node.visit(visitor);
      }
    }

    visitor.onExit(this);
  }
}

export abstract class ContainerSQLNode<TResult = unknown, TPlaceholders extends Record<string, unknown> = {}>
  extends SQLNode<TResult, TPlaceholders>
  implements Iterable<SQLNode>
{
  isEmpty(): boolean {
    for (const node of this) {
      if (!node.isEmpty()) {
        return false;
      }
    }
    return true;
  }

  fillPlaceholders(values: TPlaceholders): SQLNode<TResult> {
    const nodes: SQLNode[] = [];

    for (const node of this) {
      nodes.push(node.fillPlaceholders(values));
    }

    return new FragmentSQLNode(nodes);
  }

  abstract [Symbol.iterator](): Iterator<SQLNode>;
}

export class RawSQLNode<TResult = unknown> extends SQLNode<TResult> {
  constructor(readonly text: string) {
    super();
  }

  isEmpty(): boolean {
    return isBlank(this.text);
  }
}

export class ParamSQLNode<TValue = unknown> extends SQLNode<TValue> {
  constructor(
    readonly value: unknown,
    readonly name?: string
  ) {
    if (value === undefined) {
      throw new Error('Param value cannot be undefined');
    }

    super();
  }
}

export class PlaceholderSQLNode<TName extends string = string, TValue = unknown> extends SQLNode<
  TValue,
  Record<TName, TValue>
> {
  constructor(readonly name: TName) {
    super();
  }

  cast<TRefinedValue extends TValue>(): SQLNode<TRefinedValue, Record<TName, ReplaceAny<TValue> & TRefinedValue>> {
    return this as unknown as SQLNode<TRefinedValue, Record<TName, TRefinedValue>>;
  }

  fillPlaceholders(values: Record<TName, TValue>): SQLNode<TValue> {
    return new ParamSQLNode(values[this.name], this.name);
  }
}

export class AliasSQLNode<TResult = unknown> extends SQLNode<TResult> {
  constructor(
    readonly name: string,
    readonly sourceNode: SQLNode<TResult>
  ) {
    super();

    if (name.length === 0) {
      throw new Error('Alias name cannot be empty');
    }
  }
}

export class AliasedSQLNode<TResult = unknown, TPlaceholders extends Record<string, unknown> = {}> extends SQLNode<
  TResult,
  TPlaceholders
> {
  constructor(
    readonly name: string,
    readonly sourceNode: SQLNode<TResult, TPlaceholders>
  ) {
    super();

    if (name.length === 0) {
      throw new Error('Alias name cannot be empty');
    }
  }

  ref(): AliasSQLNode<TResult> {
    return new AliasSQLNode(this.name, this);
  }

  isEmpty(): boolean {
    return this.sourceNode.isEmpty();
  }

  fillPlaceholders(values: TPlaceholders): SQLNode<TResult> {
    return new AliasedSQLNode(this.name, this.sourceNode.fillPlaceholders(values));
  }
}

export class FragmentSQLNode<
  TResult = unknown,
  TPlaceholders extends Record<string, unknown> = {},
> extends ContainerSQLNode<TResult, TPlaceholders> {
  constructor(readonly childNodes: readonly SQLNode[]) {
    super();
  }

  [Symbol.iterator](): Iterator<SQLNode> {
    return this.childNodes.values();
  }
}

export function unwrapSQLNode<TNode extends SQLNode>(
  value: SQLNodeWrapper<TNode> | TNode
): ReplaceAny<TNode, SQLNode | undefined>;

export function unwrapSQLNode<TNode extends SQLNode>(
  value: SQLNodeWrapper<TNode> | TNode | undefined
): TNode | undefined;

export function unwrapSQLNode(value: unknown): SQLNode | undefined;

export function unwrapSQLNode(value: any) {
  return value?.[SQL_NODE] instanceof SQLNode ? value[SQL_NODE] : undefined;
}

export function toSQLNode<TNode extends SQLNode>(value: SQLNodeWrapper<TNode> | TNode): ReplaceAny<TNode, SQLNode>;

export function toSQLNode(value: unknown): SQLNode;

export function toSQLNode(value: any) {
  const node = unwrapSQLNode(value);

  if (node === undefined) {
    throw new TypeError('Not an SQL node');
  }

  return node;
}

export function isBlank(text: string): boolean {
  return /^[\s\n\r]*$/.test(text);
}
