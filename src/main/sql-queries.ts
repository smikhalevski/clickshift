import { InferPlaceholders, SQL_NODE, SQLNode, SQLNodeWrapper } from './SQLNode.js';
import { sql } from './sql.js';
import { InferRow, TableSQLNode } from './TableSQLNode.js';
import { InsertSQLNode } from './InsertSQLNode.js';
import { SelectSQLNode } from './SelectSQLNode.js';

declare module './sql.js' {
  export interface SQLFunction {
    insert<TTable extends SQLNodeWrapper<TableSQLNode<any>>>(
      table: TTable
    ): Pick<InsertSQLNode<InferRow<TTable[SQL_NODE]['columnNodes']>>, 'values'>;

    select<TRowNodes extends Record<string, SQLNode>>(
      fields: TRowNodes
    ): Pick<SelectSQLNode<InferRow<TRowNodes>, InferPlaceholders<TRowNodes[keyof TRowNodes]>>, 'from'>;
  }
}

sql.insert = table => new InsertSQLNode(table[SQL_NODE]);

sql.select = fields => new SelectSQLNode<any>(fields);
