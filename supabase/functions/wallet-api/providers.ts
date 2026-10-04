import {DomainError} from './security.ts';
export type DepositClaim={id:string;txHash:string;destination:string;amountAtomic:string;asset:'USDT';network:'TRC20'};
export type Receipt={txHash:string;destination:string;amountAtomic:string;asset:string;network:string;confirmations:number;success:boolean;tokenContract:string;provider:string;simulated:boolean};
export type PayoutReceipt={reference:string;status:'COMPLETED'|'PROCESSING'|'FAILED';amountAtomic:string;destinationFingerprint:string};
export interface PaymentProvider{verify(claim:DepositClaim):Promise<Receipt>;payout(id:string,amount:string,destination:unknown):Promise<PayoutReceipt>;receipt(reference:string):Promise<PayoutReceipt>}
export class TestPaymentProvider implements PaymentProvider{
 async verify(c:DepositClaim):Promise<Receipt>{if(!/^TEST[-_][a-z0-9_-]{4,80}$/i.test(c.txHash))throw new DomainError('Test deposits require a TEST- reference. Real hashes are not accepted.');return {...c,tokenContract:'TEST-USDT',confirmations:30,success:true,provider:'local-test-provider',simulated:true};}
 async payout(id:string,amount:string,destination:any):Promise<PayoutReceipt>{return {reference:'TEST-'+id,status:'COMPLETED',amountAtomic:amount,destinationFingerprint:destination.fingerprint};}
 async receipt():Promise<PayoutReceipt>{throw new DomainError('Test provider payouts complete synchronously.');}
}
export class HttpPaymentProvider implements PaymentProvider{
 constructor(private origin:string,private key:string){const u=new URL(origin);if(u.protocol!=='https:'||u.username||u.password)throw new Error('Use an HTTPS provider origin.');}
 private async call(path:string,body?:unknown){const response=await fetch(new URL(path,this.origin),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new DomainError('Payment provider unavailable. Funds remain reserved.',503);return response.json() as Promise<any>;}
 async verify(c:DepositClaim){return this.call('/v1/deposits/'+encodeURIComponent(c.txHash));}
 async payout(id:string,amount:string,destination:unknown){return this.call('/v1/payouts',{idempotencyKey:id,amountAtomic:amount,currency:'USDT',destination});}
 async receipt(reference:string){return this.call('/v1/payouts/'+encodeURIComponent(reference));}
}
export function validateReceipt(c:DepositClaim,r:Receipt,contract:string,confirmations:number,mode:'test'|'provider'){
 if(!r||r.success!==true||r.txHash.toLowerCase()!==c.txHash.toLowerCase()||r.destination!==c.destination||r.asset!==c.asset||r.network!==c.network||r.tokenContract!==contract||!Number.isSafeInteger(r.confirmations)||r.confirmations<confirmations||r.amountAtomic!==c.amountAtomic||(mode==='provider'&&r.simulated!==false))throw new DomainError('Deposit verification did not match the token, network, destination, amount, or confirmations.',409);
}
