declare module "sql.js" {
  export interface QueryExecResult { columns: string[]; values: any[][] }
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): QueryExecResult[];
    prepare(sql: string): { run(params?: any[]): void };
    export(): Uint8Array;
    close(): void;
  }
  const init: (cfg?: any) => Promise<{ Database: new (data?: Uint8Array) => Database }>;
  export default init;
}
