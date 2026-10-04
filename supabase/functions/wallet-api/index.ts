import {createRemoteJWKSet,jwtVerify} from 'npm:jose@5.9.6';
import {WalletDomain} from './domain.ts';
import {PgStore} from './database.ts';
import {DomainError,Vault} from './security.ts';
import {userCommand,adminCommand} from './validation.ts';
import {readWalletSummary,readWalletLedger} from './wallet-read.ts';
import {withCors} from './cors.ts';
const allowedOrigins=(Deno.env.get('ALLOWED_ORIGINS')||'https://dtexchange.bm-techi-1295.chatgpt.site').split(',').map(s=>s.trim()).filter(Boolean);
const base=Deno.env.get('SUPABASE_URL')!;
const jwks=createRemoteJWKSet(new URL(base+'/auth/v1/.well-known/jwks.json'));
const db=new PgStore();
const blocked=async()=>{throw new DomainError('Payment provider setup is required. No funds were moved.',503);};
let domain:WalletDomain;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
Deno.serve(withCors(async req=>{try{
 const path=new URL(req.url).pathname.split('/wallet-api')[1]||'/';
 if(path==='/health'&&req.method==='GET'){await db.query('SELECT 1');return json({status:'ok',storage:'postgresql',paymentsEnabled:false});}
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)throw new DomainError('Sign in to continue.',401);
 const {payload}=await jwtVerify(token,jwks,{issuer:base+'/auth/v1',audience:'authenticated'});
 if(!payload.sub||!payload.session_id)throw new DomainError('Invalid session.',401);
 const key=Deno.env.get('SUPABASE_ANON_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
 const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
 if(!userResponse.ok)throw new DomainError('Sign in again.',401);
 const user=await userResponse.json();if(user.id!==payload.sub||!user.email_confirmed_at)throw new DomainError('Confirm your email before continuing.',403);
 const session=await db.query('SELECT id FROM auth.sessions WHERE id=$1 AND user_id=$2 AND (not_after IS NULL OR not_after>now())',[payload.session_id,user.id]);
 if(!session.rows.length)throw new DomainError('Session expired. Sign in again.',401);
 const bucket=Math.floor(Date.now()/60000);
 const rate=await db.query('INSERT INTO private.api_rate_limits(id,hits,bucket) VALUES($1,1,$2) ON CONFLICT(id) DO UPDATE SET hits=CASE WHEN api_rate_limits.bucket=excluded.bucket THEN api_rate_limits.hits+1 ELSE 1 END,bucket=excluded.bucket RETURNING hits',[user.id,bucket]);
 if(rate.rows[0].hits>120)throw new DomainError('Too many requests. Try again in a minute.',429);
 domain??=new WalletDomain(db,(Deno.env.get('PAYOUT_ENCRYPTION_KEY')?new Vault(Deno.env.get('PAYOUT_ENCRYPTION_KEY')!):{encrypt(){throw new DomainError('Secure payout storage is not configured yet.',503);},decrypt(){throw new DomainError('Secure payout storage is not configured yet.',503);}}),{verify:blocked,payout:blocked,receipt:blocked},'provider','UNCONFIGURED',20);
 const admin=path.startsWith('/api/admin/');
 const identity={id:user.id,email:user.email,name:user.user_metadata?.full_name||user.email,source:'supabase' as const,aal:payload.aal as string,userAgent:req.headers.get('user-agent')||undefined};
 const actor=admin?await domain.administrator(identity):await domain.actor(identity);
 if(req.method==='GET'&&(path==='/api/wallet/summary'||path==='/api/wallet/ledger')){
  const params=new URL(req.url).searchParams;
  if([...params.keys()].some(k=>k!=='before')||params.getAll('before').length>1||(path.endsWith('/summary')&&params.size))throw new DomainError('Unsupported wallet query.',400);
  return json(path.endsWith('/summary')?await readWalletSummary(db,actor.id):await readWalletLedger(db,actor.id,params.get('before')));
 }
 if(req.method==='POST'){
  if(!['/api/wallet','/api/admin/actions','/api/withdrawal/quote'].includes(path))throw new DomainError('Not found.',404);
  const raw=await req.text();if(raw.length>12000)throw new DomainError('Request too large.',413);
  const body=JSON.parse(raw);
  if(path==='/api/withdrawal/quote'){
   if(!Number.isSafeInteger(body.payoutAmountPaise)||body.payoutAmountPaise<=0||body.payoutAmountPaise>100000000||typeof body.methodId!=='string')throw new DomainError('Enter a valid INR amount and payout method.');
   await domain.active(db,actor.id);await domain.clearSecurity(db,actor.id);
   const method=await db.query("SELECT id FROM payout_methods WHERE id=$1 AND user_id=$2 AND status='Active' AND type IN ('BANK','UPI') AND currency='INR'",[body.methodId,actor.id]);
   if(!method.rows.length)throw new DomainError('Choose your active Bank/UPI payout method.',409);
   throw new DomainError('INR exchange rate and payout fees are unavailable until the payout provider is connected. No funds were reserved.',503);
  }
  if(body.action==='request'||body.action==='review'&&body.decision==='approve'||body.action==='stage')throw new DomainError('Deposits and payouts are unavailable until the payment provider is connected.',409);
  if(body.action==='method_add'&&!['BANK','UPI'].includes(body.details?.type))throw new DomainError('Choose a Bank or UPI payout method for INR.');
  if(body.action==='settings'&&(body.settings?.depositsEnabled||body.settings?.withdrawalsEnabled))throw new DomainError('Connect the payment provider before enabling transfers.');
  if(admin)await domain.adminAction(actor,adminCommand.parse(body));else await domain.userAction(actor,userCommand.parse(body));
 }else if(req.method!=='GET'||!['/api/wallet','/api/admin/snapshot'].includes(path))throw new DomainError('Not found.',404);
 const data=await domain.snapshot(actor,admin);data.settings.depositsEnabled=false;data.settings.withdrawalsEnabled=false;
 return json({...data,paymentsEnabled:false});
 }catch(e){
  const code=typeof e==='object'&&e!==null&&'code' in e&&typeof e.code==='string'?e.code:'';
  const name=e instanceof Error?e.name:'';
  const status=e instanceof DomainError?e.status:name==='ZodError'||e instanceof SyntaxError?400:code==='23505'?409:code.startsWith('ERR_JWT')||code.startsWith('ERR_JWS')?401:503;
  console.error('wallet_api_error',code||name);
  return json({error:e instanceof DomainError?e.message:status===401?'Sign in again.':status===400?'Check your input.':status===409?'This operation already exists.':'Wallet service temporarily unavailable.'},status);
 }},allowedOrigins));
