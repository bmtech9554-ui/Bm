import {createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual,createHmac} from 'node:crypto';
export class DomainError extends Error{constructor(message:string,public status=400){super(message);}}
export function atomicAmount(amount:string):bigint{if(!/^\d{1,12}(\.\d{1,6})?$/.test(amount))throw new DomainError('Use a positive amount with at most 6 decimals.');const [whole,fraction='']=amount.split('.');const n=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));if(n<=0n)throw new DomainError('Amount must be greater than zero.');return n;}
export function centsToAtomic(units:number):bigint{if(!Number.isSafeInteger(units)||units<=0||units>100000000)throw new DomainError('Invalid amount.');return BigInt(units)*10000n;}
export const uiUnits=(n:string|number|bigint)=>Number(n)/10000;
export function fingerprint(value:unknown):string{const stable=(v:any):any=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
export class Vault{
 private key:Buffer;
 constructor(hex:string){if(!/^[0-9a-f]{64}$/i.test(hex))throw new Error('PAYOUT_ENCRYPTION_KEY must be a 32-byte hex secret.');this.key=Buffer.from(hex,'hex');}
 encrypt(value:unknown,userId:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(userId));const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString('base64')).join('.');}
 decrypt(value:string,userId:string){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'));const cipher=createDecipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(userId));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8'));}
}
export function verifyBridge(secret:string,timestamp:string,nonce:string,identity:string,method:string,path:string,body:string,signature:string){if(!secret||secret.length<32||!/^\d+$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>60000||!/^[-\w]{16,100}$/.test(nonce))return false;const hash=createHash('sha256').update(body).digest('hex');const expected=createHmac('sha256',secret).update([timestamp,nonce,identity,method,path,hash].join('\n')).digest('hex');return /^[0-9a-f]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));}
