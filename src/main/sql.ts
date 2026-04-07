import {
  FragmentSQLNode,
  InferPlaceholders,
  isBlank,
  ParamSQLNode,
  PlaceholderSQLNode,
  RawSQLNode,
  SQLNode,
  SQLNodeWrapper,
  toSQLNode,
  unwrapSQLNode,
} from './SQLNode.js';

export interface SQLFunction {
  (text: string): SQLNode<any>;

  <TValues extends unknown[]>(
    texts: readonly string[],
    ...values: TValues
  ): SQLNode<any, InferPlaceholders<TValues[number]>>;

  join<TNodes extends ReadonlyArray<SQLNodeWrapper | undefined>, TSeparator extends SQLNodeWrapper>(
    nodes: TNodes,
    separator?: TSeparator
  ): SQLNode<any, InferPlaceholders<TNodes[number] | TSeparator>>;

  placeholder<TName extends string>(name: TName): PlaceholderSQLNode<TName, any>;
}

export const sql: SQLFunction = function (text: string | readonly string[]) {
  if (typeof text === 'string') {
    return new RawSQLNode(text);
  }

  const childNodes: SQLNode<unknown, any>[] = [];

  for (let i = 0; i < arguments.length; ++i) {
    if (i !== 0) {
      const child = arguments[i];

      if (child !== undefined) {
        const node = unwrapSQLNode(child);

        childNodes.push(node !== undefined ? node : new ParamSQLNode(child));
      }
    }

    if (!isBlank(text[i])) {
      childNodes.push(new RawSQLNode(text[i]));
    }
  }

  return childNodes.length === 1 ? childNodes[0] : new FragmentSQLNode(childNodes);
} as SQLFunction;

sql.join = (nodes, separator) => {
  const childNodes: SQLNode<unknown, any>[] = [];

  const separatorNode = separator !== undefined ? toSQLNode(separator) : separator;

  for (const child of nodes) {
    if (child === undefined) {
      continue;
    }

    const node = toSQLNode(child);

    if (node.isEmpty()) {
      continue;
    }
    if (childNodes.length === 0 || separatorNode === undefined) {
      childNodes.push(node);
    } else {
      childNodes.push(separatorNode, node);
    }
  }

  return childNodes.length === 1 ? childNodes[0] : new FragmentSQLNode(childNodes);
};

sql.placeholder = name => new PlaceholderSQLNode(name);
