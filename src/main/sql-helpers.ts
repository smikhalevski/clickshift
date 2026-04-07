import { InferPlaceholders, InferResult, SQLNode, SQLNodeWrapper } from './SQLNode.js';
import { sql } from './sql.js';

import { SelectSQLNode } from './SelectSQLNode.js';

type SQLValue<TValue> = SQLNodeWrapper<SQLNode<TValue>> | SelectSQLNode<Record<string, TValue>> | TValue;

type InferSQLValue<T> = T extends SQLNodeWrapper<any> ? SQLValue<InferResult<T>> : SQLValue<T>;

declare module './sql.js' {
  export interface SQLFunction {
    count<TNode extends SQLNodeWrapper>(node?: TNode): SQLNode<number, InferPlaceholders<TNode>>;

    countDistinct<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<number, InferPlaceholders<TNode>>;

    avg<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<number | null, InferPlaceholders<TNode>>;

    avgDistinct<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<number | null, InferPlaceholders<TNode>>;

    sum<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<number | null, InferPlaceholders<TNode>>;

    sumDistinct<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<number | null, InferPlaceholders<TNode>>;

    max<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<InferResult<TNode> | null, InferPlaceholders<TNode>>;

    min<TNode extends SQLNodeWrapper>(node: TNode): SQLNode<InferResult<TNode> | null, InferPlaceholders<TNode>>;

    eq<TLeft, TRight extends InferSQLValue<TLeft>>(
      left: TLeft,
      right: TRight
    ): SQLNode<boolean, InferPlaceholders<TLeft | TRight>>;

    ne<TLeft, TRight extends InferSQLValue<TLeft>>(
      left: TLeft,
      right: TRight
    ): SQLNode<boolean, InferPlaceholders<TLeft | TRight>>;
  }
}

sql.count = node => sql`count(${node})`;

sql.countDistinct = node => sql`count(distinct ${node})`;

sql.avg = node => sql`avg(${node})`;

sql.avgDistinct = node => sql`avg(distinct ${node})`;

sql.sum = node => sql`sum(${node})`;

sql.sumDistinct = node => sql`sum(distinct ${node})`;

sql.max = node => sql`max(${node})`;

sql.min = node => sql`min(${node})`;

sql.eq = (left, right) => sql`${left} = ${right}`;

sql.ne = (left, right) => sql`${left} <> ${right}`;
