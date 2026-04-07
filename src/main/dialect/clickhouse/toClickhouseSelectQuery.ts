import {
  AliasedSQLNode,
  AliasSQLNode,
  FragmentSQLNode,
  ParamSQLNode,
  PlaceholderSQLNode,
  RawSQLNode,
  SQLNode,
} from '../../SQLNode.js';
import { ColumnSQLNode, TableSQLNode } from '../../TableSQLNode.js';
import { ClickhouseColumnSQLNode, ClickhouseTableSQLNode } from './schema.js';
import { SelectSQLNode } from '../../SelectSQLNode.js';
import { sql } from '../../sql.js';

export interface ClickhouseSelectQuery {
  text: string;
  params: Record<string, unknown>;
}

export function toClickhouseSelectQuery(node: SQLNode): ClickhouseSelectQuery {
  let text = '';
  let params: Record<string, unknown> = {};
  let paramsCount = 0;

  node.visit({
    onEnter(node) {
      if (node instanceof RawSQLNode) {
        text += node.text;
        return;
      }

      if (node instanceof ParamSQLNode) {
        const name = node.name !== undefined ? node.name : 'p' + ++paramsCount;
        params[name] = node.value;
        text += `{${name}:Auto}`;
        return;
      }

      if (node instanceof AliasSQLNode) {
        text += escapeIdentifier(node.name);
        return;
      }

      if (node instanceof AliasedSQLNode || node instanceof FragmentSQLNode) {
        return;
      }

      if (node instanceof TableSQLNode) {
        if (node instanceof ClickhouseTableSQLNode) {
          text += escapeIdentifier(node.name);
          return;
        }
        throw new Error('Expected a Clickhouse table');
      }

      if (node instanceof ColumnSQLNode) {
        if (node instanceof ClickhouseColumnSQLNode) {
          text += escapeIdentifier(node['_tableName']) + '.' + escapeIdentifier(node.name);
          return;
        }
        throw new Error('Expected a Clickhouse column');
      }

      if (node instanceof SelectSQLNode) {
        text += 'SELECT ';

        const query = toClickhouseSelectQuery(sql.join(Object.values(node['_rowNodes']), sql`,`));

        text += query.text;
        Object.assign(params, query.params);

        if (node['_fromNode'] !== undefined) {
          const query = toClickhouseSelectQuery(node['_fromNode']);

          if (node['_fromNode'] instanceof TableSQLNode) {
            text += ' FROM ' + query.text;
          } else {
            text += ' FROM (' + query.text + ')';
          }
          Object.assign(params, query.params);
        }

        if (node['_whereNode'] !== undefined) {
          const query = toClickhouseSelectQuery(node['_whereNode']);

          text += ' WHERE ' + query.text;
          Object.assign(params, query.params);
        }

        paramsCount = Object.keys(params).length;
        return false;
      }

      if (node instanceof PlaceholderSQLNode) {
        throw new Error('Placeholder is not filled');
      }

      throw new Error('Unexpected node');
    },

    onExit(node) {
      if (node instanceof AliasedSQLNode) {
        text += ' AS ' + escapeIdentifier(node.name);
        return;
      }
    },
  });

  return { text, params };
}

function escapeIdentifier(name: string): string {
  return '`' + name.replaceAll('`', '``') + '`';
}
