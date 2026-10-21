import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const temp=mkdtempSync(join(tmpdir(),'wallet-edge-'));
for(const file of ['cors','wallet-read','session','security','providers','domain']){
 const source=readFileSync(new URL('../supabase/functions/wallet-api/'+file+'.ts',import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll('.ts\'','.mjs\'');
 writeFileSync(join(temp,file+'.mjs'),output);
}
writeFileSync(join(temp,'database.mjs'),'export const one=async(db,sql,args=[]) => (await db.query(sql,args)).rows[0];');
after(()=>rmSync(temp,{recursive:true,force:true}));
const {withCors}=await import(pathToFileURL(join(temp,'cors.mjs')));
const {requireLiveSession}=await import(pathToFileURL(join(temp,'session.mjs')));
const {atomicToUsdt,readWalletSummary,readWalletLedger,ledgerItem}=await import(pathToFileURL(join(temp,'wallet-read.mjs')));
const {WalletDomain}=await import(pathToFileURL(join(temp,'domain.mjs')));
const origin='https://www.texvelvetloom.store';
const actor={id:'user-a',email:'a@example.test',name:'A',role:'AUDITOR',permissions:['finance.read','audit.read','security.read'],aal:'aal2',requireMfa:false};
const makeDomain=db=>new WalletDomain(db,{encrypt(){},decrypt(){}},{},'provider');

test('exact custom-domain preflight bypasses authentication; errors include CORS',async()=>{
 let calls=0;
 const handler=withCors(async()=>{calls++;return Response.json({error:'Sign in again.'},{status:401});},[origin]);
 const response=await handler(new Request(origin+'/wallet',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization, apikey, content-type'}}));
 assert.equal(response.status,204);assert.equal(calls,0);assert.equal(response.headers.get('access-control-allow-origin'),origin);
 const error=await handler(new Request(origin+'/wallet',{headers:{Origin:origin}}));
 assert.equal(error.status,401);assert.equal(error.headers.get('access-control-allow-origin'),origin);
});
test('untrusted origin and unsupported preflight are denied before handler',async()=>{
 const handler=withCors(async()=>{throw new Error('must not run');},[origin]);
 assert.equal((await handler(new Request(origin,{headers:{Origin:'https://evil.example'}}))).status,403);
 assert.equal((await handler(new Request(origin,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'DELETE'}}))).status,403);
 assert.equal((await handler(new Request(origin,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'x-admin-role'}}))).status,403);
});
test('session identity and validator share one transaction; revoked/missing sessions fail closed',async()=>{
 for(const valid of [true,false,undefined]){
  const seen=[];
  const db={query(){throw new Error('must use transaction');},transaction:async work=>work({query:async(sql,args)=>{seen.push([sql,args]);return {rows:sql.includes('wallet_session_valid')?[{valid}]:[]};}})};
  if(valid===true)await requireLiveSession(db,'session-a','user-a');
  else await assert.rejects(requireLiveSession(db,'session-a','user-a'),e=>e.status===401);
  assert.equal(seen.length,2);assert.deepEqual(seen[0][1],['session-a','user-a']);assert.deepEqual(seen[1][1],['session-a','user-a']);
  assert.ok(!seen.some(([sql])=>sql.includes('FROM auth.sessions')));
 }
});
test('summary preserves precision, active holds and exact response contract',async()=>{
 let seen;
 const db={query:async(sql,args)=>{seen=[sql,args];return {rows:[{status:'Active',wallet_id:'w-a',currency:'USDT',total:'9007199254740993',held:'1000001'}]};}};
 const response=await readWalletSummary(db,'user-a');
 assert.deepEqual(response,{asset:'USDT',network:'TRC20',balanceUsdt:'9007199254.740993',heldBalanceUsdt:'1.000001',availableBalanceUsdt:'9007199253.740992',depositAddress:null,paymentsEnabled:false});
 assert.deepEqual(seen[1],['user-a']);assert.match(seen[0],/status='ACTIVE'/);
 assert.equal(atomicToUsdt('-1'),'-0.000001');
});
test('summary denies suspended/missing wallets, unsupported asset and inconsistent holds',async()=>{
 for(const row of [undefined,{status:'Suspended'},{status:'Active'},{status:'Active',wallet_id:'w',currency:'BTC'},{status:'Active',wallet_id:'w',currency:'USDT',total:'1',held:'2'}]){
  await assert.rejects(readWalletSummary({query:async()=>({rows:row?[row]:[]})},'user-a'));
 }
});
test('ledger prevents cross-user cursors before reading entries',async()=>{
 const cursor='11111111-1111-4111-8111-111111111111',seen=[];
 const db={transaction:async work=>work({query:async(sql,args)=>{seen.push([sql,args]);return {rows:sql.startsWith('SELECT u.status')?[{status:'Active',wallet_id:'w-a',currency:'USDT'}]:[]};}})};
 await assert.rejects(readWalletLedger(db,'user-a',cursor),e=>e.status===400);
 assert.equal(seen.length,2);assert.deepEqual(seen[1][1],[cursor,'w-a']);
 await assert.rejects(readWalletLedger(db,'user-a','user-b'),e=>e.status===400);
});
test('ledger returns 50 immutable posted entries with a continuation cursor',async()=>{
 const rows=Array.from({length:51},(_,i)=>({id:'entry-'+i,amount_atomic:'1000001',kind:'DEPOSIT_CREDIT',reference:'ref-'+i,created_at:'2026-10-04T00:00:00Z'}));
 let params;
 const db={transaction:async work=>work({query:async(sql,args)=>sql.startsWith('SELECT u.status')?{rows:[{status:'Active',wallet_id:'w-a',currency:'USDT'}]}:(params=args,{rows})})};
 const result=await readWalletLedger(db,'user-a',null);
 assert.equal(result.transactions.length,50);assert.equal(result.nextCursor,'entry-49');assert.deepEqual(params,['w-a',null,51]);
 assert.deepEqual(result.transactions[0],{id:'entry-0',asset:'USDT',network:'TRC20',type:'deposit',amountUsdt:'1.000001',status:'completed',createdAt:'2026-10-04T00:00:00.000Z',reference:'ref-0'});
 assert.throws(()=>ledgerItem({...rows[0],amount_atomic:'-1'}));assert.throws(()=>ledgerItem({...rows[0],kind:'UNKNOWN'}));
});
test('admin requires AAL2 even if require_mfa is disabled; disabled admins denied',async()=>{
 for(const identity of [{...actor,aal:'aal1'},{...actor,role:null}]){
  const domain=makeDomain({});domain.actor=async()=>identity;
  await assert.rejects(domain.administrator(identity),e=>e.status===403);
 }
 const domain=makeDomain({});domain.actor=async()=>actor;assert.equal((await domain.administrator(actor)).role,'AUDITOR');
 await assert.rejects(domain.snapshot({...actor,aal:'aal1'},true),e=>e.status===403);
});
test('AUDITOR without users.read never queries user directory; users.read permits it',async()=>{
 for(const permissions of [[],['users.read']]){
  const seen=[];const db={query:async sql=>{seen.push(sql);return {rows:sql.startsWith('SELECT * FROM system_settings')?[{value:{},revision:1}]:[]};}};
  const result=await makeDomain(db).snapshot({...actor,permissions},true);
  assert.deepEqual(result.users,[]);
  assert.equal(seen.some(sql=>sql.startsWith('SELECT u.*,p.verification_status')),permissions.includes('users.read'));
 }
});
