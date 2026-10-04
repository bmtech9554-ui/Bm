import pg from 'npm:pg@8.13.1';
export interface Queryable {query<T=Record<string,any>>(text:string,values?:unknown[]):Promise<{rows:T[];rowCount?:number|null}>}
export interface Store extends Queryable {transaction<T>(work:(tx:Queryable)=>Promise<T>):Promise<T>}
const pool=new pg.Pool({connectionString:Deno.env.get('SUPABASE_DB_URL'),max:1,connectionTimeoutMillis:10000,idleTimeoutMillis:10000,statement_timeout:15000});
export class PgStore implements Store {
 async transaction<T>(work:(tx:Queryable)=>Promise<T>):Promise<T>{const c=await pool.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE nila_app');const result=await work(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 query<T=Record<string,any>>(text:string,values:unknown[]=[]){return this.transaction(q=>q.query<T>(text,values));}
}
export const one=async<T=Record<string,any>>(db:Queryable,sql:string,args:unknown[]=[]) => (await db.query<T>(sql,args)).rows[0];
