import {
  ColumnBuilder,
  ColumnSQLNode,
  createIdentityValueAdapter,
  InferColumnBuilders,
  TableSQLNode,
  ValueAdapter,
} from '../../TableSQLNode.js';
import { SQLNode, SQLNodeWrapper } from '../../SQLNode.js';

export class ClickhouseColumnSQLNode<TValue> extends ColumnSQLNode<TValue> {
  protected _tableName: string;

  constructor(tableName: string, name: string, valueAdapter: ValueAdapter<TValue>) {
    super(name, valueAdapter);

    this._tableName = tableName;
  }
}

export class ClickhouseTableSQLNode<
  TColumns extends Record<string, ClickhouseColumnSQLNode<unknown>> = {},
> extends TableSQLNode<TColumns> {}

export class ClickhouseColumnBuilder<TValue, TConfig extends 'nullable' | 'optional' = never> extends ColumnBuilder<
  ClickhouseColumnSQLNode<TValue | ('nullable' extends TConfig ? null : never)>
> {
  protected _isNullable = false;
  protected _defaultValue: unknown;
  protected _valueAdapter: ValueAdapter<TValue>;

  constructor(name: string | undefined, valueAdapter: ValueAdapter<TValue>) {
    super(name);
    this._valueAdapter = valueAdapter;
  }

  nullable(): ClickhouseColumnBuilder<TValue, TConfig | 'nullable'> {
    this._isNullable = true;
    return this as ClickhouseColumnBuilder<TValue, TConfig | 'nullable'>;
  }

  default(
    value: TValue | ('nullable' extends TConfig ? null : never) | SQLNode
  ): ClickhouseColumnBuilder<TValue, TConfig | 'optional'> {
    this._defaultValue = value;
    return this as ClickhouseColumnBuilder<TValue, TConfig | 'optional'>;
  }

  protected _build(
    name: string,
    table: ClickhouseTableSQLNode
  ): ClickhouseColumnSQLNode<TValue | ('nullable' extends TConfig ? null : never)> {
    return new ClickhouseColumnSQLNode(table.name, name, this._valueAdapter);
  }
}

export function table<TColumns extends Record<string, ClickhouseColumnSQLNode<unknown>>>(
  name: string,
  columns: InferColumnBuilders<TColumns>
): SQLNodeWrapper<TableSQLNode<TColumns>> & TColumns {
  return new ClickhouseTableSQLNode(name, columns).columnNodes as SQLNodeWrapper<TableSQLNode<TColumns>> & TColumns;
}

const stringAdapter = createIdentityValueAdapter<string>(() => 'String');
const boolAdapter = createIdentityValueAdapter<boolean>(() => 'Bool');
const int8Adapter = createIdentityValueAdapter<number>(() => 'Int8');
const int16Adapter = createIdentityValueAdapter<number>(() => 'Int16');
const int32Adapter = createIdentityValueAdapter<number>(() => 'Int32');
const int64Adapter = createIdentityValueAdapter<bigint>(() => 'Int64');
const uInt8Adapter = createIdentityValueAdapter<number>(() => 'UInt8');
const uInt16Adapter = createIdentityValueAdapter<number>(() => 'UInt16');
const uInt32Adapter = createIdentityValueAdapter<number>(() => 'UInt32');
const uInt64Adapter = createIdentityValueAdapter<bigint>(() => 'UInt64');
const float32Adapter = createIdentityValueAdapter<number>(() => 'Float32');
const float64Adapter = createIdentityValueAdapter<number>(() => 'Float64');
const dateAdapter = createIdentityValueAdapter<Date>(() => 'Date');
const dateTimeAdapter = createIdentityValueAdapter<Date>(() => 'DateTime');
const uuidAdapter = createIdentityValueAdapter<string>(() => 'UUID');
const jsonAdapter = createIdentityValueAdapter<Record<string, unknown> | unknown[]>(() => 'JSON');

export function String(name?: string): ClickhouseColumnBuilder<string> {
  return new ClickhouseColumnBuilder(name, stringAdapter);
}

export function Bool(name?: string): ClickhouseColumnBuilder<boolean> {
  return new ClickhouseColumnBuilder(name, boolAdapter);
}

export function Int8(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, int8Adapter);
}

export function Int16(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, int16Adapter);
}

export function Int32(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, int32Adapter);
}

export function Int64(name?: string): ClickhouseColumnBuilder<bigint> {
  return new ClickhouseColumnBuilder(name, int64Adapter);
}

export function UInt8(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, uInt8Adapter);
}

export function UInt16(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, uInt16Adapter);
}

export function UInt32(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, uInt32Adapter);
}

export function UInt64(name?: string): ClickhouseColumnBuilder<bigint> {
  return new ClickhouseColumnBuilder(name, uInt64Adapter);
}

export function Float32(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, float32Adapter);
}

export function Float64(name?: string): ClickhouseColumnBuilder<number> {
  return new ClickhouseColumnBuilder(name, float64Adapter);
}

export function Date(name?: string): ClickhouseColumnBuilder<Date> {
  return new ClickhouseColumnBuilder(name, dateAdapter);
}

export function DateTime(name?: string): ClickhouseColumnBuilder<Date> {
  return new ClickhouseColumnBuilder(name, dateTimeAdapter);
}

export function UUID(name?: string): ClickhouseColumnBuilder<string> {
  return new ClickhouseColumnBuilder(name, uuidAdapter);
}

export function JSON(name?: string): ClickhouseColumnBuilder<Record<string, unknown> | unknown[]> {
  return new ClickhouseColumnBuilder(name, jsonAdapter);
}
