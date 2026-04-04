export interface ClickhouseTableEngines {
  MergeTree: never;
}

export type ClickhouseTableEngine = keyof ClickhouseTableEngines;

export interface ClickhouseColumnTypes {
  String: string;
  Bool: boolean;
  Int8: number;
  Int16: number;
  Int32: number;
  Int64: bigint;
  UInt8: number;
  UInt16: number;
  UInt32: number;
  UInt64: bigint;
  Float32: number;
  Float64: number;
  Date: Date;
  DateTime: Date;
  UUID: string;
  JSON: Record<string, unknown> | unknown[];
}

type ColumnConfig = 'nullable' | 'optional';

export interface ColumnReference<TType = unknown> {
  readonly $inferType: TType;
}

export type AnyColumn = Column<unknown, never> | Column<unknown, any>;

export type AnySQL = SQL<never> | SQL<any>;

export class Column<TType, TConfig extends ColumnConfig> implements ColumnReference<
  TType | ('nullable' extends TConfig ? null : never)
> {
  declare readonly $inferType: TType | ('nullable' extends TConfig ? null : never);

  protected _sqlType: string;
  protected _sqlName: string | undefined;
  protected _table: Table | undefined;
  protected _isNullable = false;
  protected _defaultValue: this['$inferType'] | SQL | undefined;

  constructor(sqlType: string, sqlName?: string) {
    this._sqlType = sqlType;
    this._sqlName = sqlName;
  }

  nullable(): Column<TType, TConfig | 'nullable'> {
    this._isNullable = true;

    return this as Column<TType, TConfig | 'nullable'>;
  }

  default(value: this['$inferType'] | SQL): Column<TType, TConfig | 'optional'> {
    this._defaultValue = value;

    return this as Column<TType, TConfig | 'optional'>;
  }

  $type<TSubtype extends TType>(): Column<TSubtype, TConfig> {
    return this as unknown as Column<TSubtype, TConfig>;
  }

  toString(): string {
    if (this._table === undefined || this._sqlName === undefined) {
      throw new Error('Orphan column');
    }
    return this._table.toString() + '.' + escapeIdentifier(this._sqlName);
  }
}

type InferColumnReferences<TColumns extends Record<string, AnyColumn>> = {
  [K in keyof TColumns]: ColumnReference<TColumns[K]['$inferType']>;
};

type OptionalColumnKeys<TColumns extends Record<string, AnyColumn>> = {
  [K in keyof TColumns]: TColumns[K] extends Column<any, infer TConfig>
    ? TConfig extends 'optional'
      ? K
      : never
    : never;
}[keyof TColumns];

type InferInsert<TColumns extends Record<string, AnyColumn>> = {
  [K in OptionalColumnKeys<TColumns>]?: TColumns[K]['$inferType'];
} & {
  [K in Exclude<keyof TColumns, OptionalColumnKeys<TColumns>>]: TColumns[K]['$inferType'];
};

export interface TableOptions<TColumns extends Record<string, AnyColumn>> {
  engine?: ClickhouseTableEngine;
  orderBy?: (table: InferColumnReferences<TColumns>) => Array<InferColumnReferences<TColumns>[keyof TColumns] | SQL>;
}

export class Table<TColumns extends Record<string, AnyColumn> = any> {
  declare readonly $inferInsert: InferInsert<TColumns>;

  protected _sqlName: string;
  protected _columns: TColumns;
  protected _engine: ClickhouseTableEngine | undefined;
  protected _orderBy: Array<AnyColumn | SQL> | undefined;

  constructor(sqlName: string, columns: TColumns, options?: TableOptions<TColumns>) {
    this._sqlName = sqlName;
    this._columns = columns;

    for (const key in columns) {
      const column = columns[key];

      if (column['_table'] !== undefined) {
        throw new Error('Column already belongs to a table');
      }

      column['_sqlName'] ??= key;
      column['_table'] = this;

      (this as unknown as TColumns)[key] = column;
    }

    this._engine = options?.engine;
    this._orderBy = options?.orderBy?.(columns) as Array<AnyColumn | SQL> | undefined;
  }

  toString(): string {
    return escapeIdentifier(this._sqlName);
  }
}

function escapeIdentifier(value: string): string {
  return '`' + value.replaceAll('`', '``') + '`';
}

export class SQL<TReturnType = never> {
  declare readonly $inferReturn: TReturnType;

  constructor(
    readonly strings: readonly string[],
    readonly values: readonly unknown[]
  ) {}

  toPreparedStatement(): SQLPreparedStatement {
    return buildSQLPreparedStatement(this.strings, this.values);
  }
}

export interface SQLPreparedStatement {
  sqlStatement: string;
  values: Record<string, unknown>;
}

function buildSQLPreparedStatement(
  strings: readonly string[],
  values: readonly unknown[],
  result: SQLPreparedStatement = { sqlStatement: '', values: {} }
): SQLPreparedStatement {
  result.sqlStatement += strings[0];

  for (let i = 0; i < values.length; ++i) {
    const value = values[i];

    if (value instanceof SQL) {
      buildSQLPreparedStatement(value.strings, value.values, result);
      result.sqlStatement += strings[i + 1];
      continue;
    }

    if (value instanceof Column || value instanceof Table) {
      result.sqlStatement += value + strings[i + 1];
      continue;
    }

    const valueKey = 'p' + (Object.keys(result.values).length + 1);

    result.sqlStatement += '{' + valueKey + ':Auto}' + strings[i + 1];
    result.values[valueKey] = value;
  }

  return result;
}

type SQLValue =
  | string
  | number
  | boolean
  | bigint
  | null
  | Record<string, unknown>
  | unknown[]
  | AnySQL
  | ColumnReference
  | Table;

export interface SQLTemplate {
  <TReturnType = never>(sql: string): SQL<TReturnType>;

  <TReturnType = never>(strings: readonly string[], ...values: SQLValue[]): SQL<TReturnType>;

  table<TColumns extends Record<string, AnyColumn>>(
    sqlName: string,
    columns: TColumns,
    options?: TableOptions<TColumns>
  ): Table<TColumns> & InferColumnReferences<TColumns>;
}

type ColumnFactories = {
  [TClickhouseType in keyof ClickhouseColumnTypes]: (
    sqlName?: string
  ) => Column<ClickhouseColumnTypes[TClickhouseType], never>;
};

function createColumnFactory<TClickhouseType extends keyof ClickhouseColumnTypes>(
  sqlType: TClickhouseType
): (sqlName?: string) => Column<ClickhouseColumnTypes[TClickhouseType], never> {
  return sqlName => new Column(sqlType, sqlName);
}

export const sql: SQLTemplate & ColumnFactories = (strings: string | readonly string[], ...values: unknown[]) => {
  return typeof strings === 'string' ? new SQL([strings], []) : new SQL(strings, values);
};

sql.table = <TColumns extends Record<string, AnyColumn>>(
  sqlName: string,
  columns: TColumns,
  options?: TableOptions<TColumns>
): Table<TColumns> & InferColumnReferences<TColumns> =>
  new Table(sqlName, columns, options) as Table<TColumns> & InferColumnReferences<TColumns>;

sql.String = createColumnFactory('String');
sql.Bool = createColumnFactory('Bool');
sql.Int8 = createColumnFactory('Int8');
sql.Int16 = createColumnFactory('Int16');
sql.Int32 = createColumnFactory('Int32');
sql.Int64 = createColumnFactory('Int64');
sql.UInt8 = createColumnFactory('UInt8');
sql.UInt16 = createColumnFactory('UInt16');
sql.UInt32 = createColumnFactory('UInt32');
sql.UInt64 = createColumnFactory('UInt64');
sql.Float32 = createColumnFactory('Float32');
sql.Float64 = createColumnFactory('Float64');
sql.Date = createColumnFactory('Date');
sql.DateTime = createColumnFactory('DateTime');
sql.UUID = createColumnFactory('UUID');
sql.JSON = createColumnFactory('JSON');

// Operations plugin

export interface SQLTemplate {
  eq<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  lt<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  lte<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  gt<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  gte<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  like<TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']): SQL;

  inArray<TColumn extends ColumnReference>(column: TColumn, values: TColumn['$inferType'][]): SQL;

  notInArray<TColumn extends ColumnReference>(column: TColumn, values: TColumn['$inferType'][]): SQL;
}

sql.eq = createScalarOperationFactory('=');
sql.lt = createScalarOperationFactory('<');
sql.lte = createScalarOperationFactory('<=');
sql.gt = createScalarOperationFactory('>');
sql.gte = createScalarOperationFactory('>=');
sql.like = createScalarOperationFactory('LIKE');
sql.inArray = createArrayOperationFactory('IN');
sql.notInArray = createArrayOperationFactory('NOT IN');

function createScalarOperationFactory(
  operator: string
): <TColumn extends ColumnReference>(column: TColumn, value: TColumn['$inferType']) => SQL {
  return (column, value) => sql`${column}${sql(operator)}${value as SQLValue}`;
}

function createArrayOperationFactory(
  operator: string
): <TColumn extends ColumnReference>(column: TColumn, values: TColumn['$inferType'][]) => SQL {
  return (column, values) => sql`${column}${sql(operator)}(${joinSQL(values as SQLValue[], ',')})`;
}

// Boolean operation plugin

export interface SQLTemplate {
  and(...expressions: Array<SQL | null | undefined>): SQL | undefined;

  or(...expressions: Array<SQL | null | undefined>): SQL | undefined;
}

sql.and = createBooleanExpressionFactory('AND');
sql.or = createBooleanExpressionFactory('OR');

function createBooleanExpressionFactory(
  operator: string
): (...expressions: Array<SQL | null | undefined>) => SQL | undefined {
  return function () {
    const values = [];

    for (let i = 0; i < arguments.length; ++i) {
      const expr = arguments[i];

      if (expr === null || expr === undefined) {
        continue;
      }

      values.push(expr);
    }

    return joinSQL(values, operator);
  };
}

function joinSQL(rawValues: SQLValue[], separator: string): SQL {
  const strings = [''];
  const values = [];

  for (let i = 0; i < rawValues.length; ++i) {
    const expr = rawValues[i];

    if (expr === null || expr === undefined) {
      continue;
    }

    values.push(expr);
    strings.push(separator);
  }

  strings[strings.length - 1] = '';

  return sql(strings, ...values);
}

const EMPTY_SQL = sql``;

// Database querying

type InferReturnType<TSource extends ColumnReference | AnySQL> =
  TSource extends ColumnReference<infer TType> ? TType : TSource extends AnySQL ? TSource['$inferReturn'] : never;

type InferRowReturnType<TRow extends Record<string, ColumnReference | AnySQL>> = {
  [K in keyof TRow]: InferReturnType<TRow[K]>;
};

class SelectQuery<
  TRow extends Record<string, ColumnReference | AnySQL>,
  TOmit extends keyof SelectQuery<any, any> = never,
> {
  protected _row: TRow;
  protected _table: Table | SQL | undefined;
  protected _whereSql: SQL | undefined;
  protected _tailSql: SQL | undefined;
  protected _client: any;

  constructor(client: any, row: TRow) {
    this._client = client;
    this._row = row;
  }

  from(table: Table | SQL): Omit<SelectQuery<TRow, TOmit | 'from'>, TOmit | 'from'> {
    this._table = table;
    return this as any;
  }

  where(sql: SQL | undefined): Omit<SelectQuery<TRow, TOmit | 'where'>, TOmit | 'where'> {
    this._whereSql = sql;
    return this as any;
  }

  tail(sql: SQL | undefined): this {
    this._tailSql = sql;
    return this;
  }

  async then<T>(callback: (rows: InferRowReturnType<TRow>[]) => T): Promise<T> {
    const { sqlStatement, values } = sql`
      SELECT ${joinSQL(Object.values(this._row), ',')}
      ${this._table !== undefined ? sql`FROM ${this._table}` : EMPTY_SQL}
      ${this._whereSql !== undefined ? sql`WHERE ${this._whereSql}` : EMPTY_SQL}
      ${this._tailSql !== undefined ? this._tailSql : EMPTY_SQL}
    `.toPreparedStatement();

    const result = await this._client.query({
      query: sqlStatement,
      query_params: values,
      format: 'JSONCompactEachRow',
    });

    const rows = await result.json();

    const colNames = Object.keys(this._row);

    for (let i = 0; i < rows.length; ++i) {
      const row = rows[i];
      const rowObj: Record<string, unknown> = (rows[i] = {});

      for (let j = 0; j < row.length; ++j) {
        rowObj[colNames[j]] = row[j];
      }
    }

    return callback(rows);
  }
}

class InsertQuery<TTable extends Table> {
  protected _table: TTable;
  protected _values: TTable['$inferInsert'][] | undefined;
  protected _tailSql: SQL | undefined;
  protected _client: any;

  constructor(client: any, table: TTable) {
    this._table = table;
    this._client = client;
  }

  values(values: TTable['$inferInsert'] | TTable['$inferInsert'][]): this {
    this._values = Array.isArray(values) ? values : [values];
    return this;
  }

  tail(sql: SQL | undefined): this {
    this._tailSql = sql;
    return this;
  }

  async then<T>(callback: () => T): Promise<T> {
    if (this._values === undefined) {
      throw new Error('Values are not specified');
    }

    await this._client.insert(
      this._table['_sqlName'],
      this._values.map(values => {
        const rowObj: Record<string, undefined> = {};

        for (const key in values) {
          rowObj[this._table['_columns'][key]._sqlName] = values[key];
        }

        return rowObj;
      })
    );

    return callback();
  }
}

class Clickhouse {
  protected _client: any;

  constructor(client: any) {
    this._client = client;
  }

  select<TRow extends Record<string, ColumnReference | AnySQL>>(row: TRow): SelectQuery<TRow> {
    return new SelectQuery(this._client, row);
  }

  insert<TTable extends Table>(table: TTable): InsertQuery<TTable> {
    return new InsertQuery(this._client, table);
  }
}

// USAGE EXAMPLE

export const fooTable = sql.table(
  'foo',
  {
    fooId: sql.UUID(),
  },
  {
    engine: 'MergeTree',
    orderBy: table => [table.fooId],
  }
);

export const barTable = sql.table(
  'bar',
  {
    barId: sql.UUID(),
    title: sql.String().nullable().default(null),
  },
  {
    engine: 'MergeTree',
    orderBy: table => [table.barId],
  }
);

sql`
  SELECT ${barTable.title}
  FROM ${barTable}
  WHERE ${sql.eq(barTable.barId, 'xxx')}
`;

import { createClient } from '@clickhouse/client';

const clickhouse = new Clickhouse(createClient());

const r = await clickhouse.select({
  foo: barTable.title,
}).tail(sql`
  FROM ${barTable}
  WHERE ${sql.eq(barTable.barId, '111')}
`);

await clickhouse.insert(barTable).values({ barId: '' });
