import {z} from 'npm:zod@3.25.76';
const id=z.string().min(1).max(200),uuid=z.string().uuid(),reason=z.string().trim().min(5).max(500),units=z.number().int().positive().max(100000000),operationId=uuid;
export const settingsSchema=z.object({depositsEnabled:z.boolean(),withdrawalsEnabled:z.boolean(),minDeposit:units,minWithdrawal:units,maxWithdrawal:units,withdrawalFee:z.number().int().min(0).max(1000000),maintenanceMode:z.boolean().optional(),referralsEnabled:z.boolean(),referralReward:units,referralMinimum:units}).strict().refine(s=>s.maxWithdrawal>=s.minWithdrawal);
const details=z.discriminatedUnion('type',[
 z.object({type:z.literal('BANK_ACCOUNT'),accountNumber:z.string().regex(/^\d{6,34}$/),accountHolder:z.string().trim().min(2).max(100),bankCode:z.string().regex(/^[A-Z0-9]{4,20}$/)}).strict(),
 z.object({type:z.literal('UPI'),upiId:z.string().regex(/^[\w.\-]{2,100}@[\w.\-]{2,50}$/)}).strict(),
 z.object({type:z.literal('TRC20'),address:z.string().regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)}).strict()
]);
export const userCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('request'),type:z.enum(['Deposit','Withdrawal']),units,reference:z.string().trim().min(4).max(90).optional(),methodId:uuid.optional(),expectedFee:z.number().int().nonnegative().optional(),operationId}),
 z.object({action:z.literal('cancel'),id:uuid,operationId}),z.object({action:z.literal('profile'),name:z.string().trim().min(2).max(50),operationId}),
 z.object({action:z.literal('method_add'),name:z.string().trim().min(2).max(40),details:details.optional(),operationId}),
 z.object({action:z.literal('method_change'),id:uuid,change:z.enum(['default','remove']),operationId}),
 z.object({action:z.literal('read_notifications'),operationId}),z.object({action:z.literal('link_referral'),code:z.string().min(4).max(60),operationId}),
 z.object({action:z.literal('connect_email'),consent:z.literal(true),operationId}),z.object({action:z.literal('disconnect_notification'),channel:z.enum(['Email','Telegram']),operationId})
]);
export const adminCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),id:uuid,decision:z.enum(['approve','reject']),verified:z.boolean().optional(),reason,operationId}),
 z.object({action:z.literal('stage'),id:uuid,stage:z.enum(['VERIFYING','UNDER_REVIEW','PROCESSING']),reason,operationId}),
 z.object({action:z.literal('adjust'),userId:id,direction:z.enum(['credit','debit']),units,reference:z.string().min(3).max(120),adjustmentType:z.enum(['CREDIT_ADJUSTMENT','DEBIT_ADJUSTMENT','REVERSAL','CORRECTION']).optional(),currency:z.literal('USDT').optional(),reason,operationId}),
 z.object({action:z.literal('user_status'),userId:id,status:z.enum(['Active','Suspended']),reason,operationId}),
 z.object({action:z.literal('role'),userId:id,role:z.enum(['OPERATIONS_ADMIN','FINANCE_REVIEWER','SUPPORT_AGENT','AUDITOR','none']),reason,operationId}),
 z.object({action:z.literal('method_status'),id:uuid,status:z.enum(['Active','Disabled']),reason,operationId}),
 z.object({action:z.literal('payout_reveal'),id:uuid,reason,operationId}),
 z.object({action:z.literal('security_review'),userId:id,reason,operationId}),z.object({action:z.literal('security_resolve'),id:uuid,reason,operationId}),
 z.object({action:z.literal('settings'),settings:settingsSchema,revision:z.number().int().positive(),reason,operationId}),
 z.object({action:z.literal('referral_settings'),enabled:z.boolean(),rewardType:z.enum(['FIXED','PERCENTAGE']),rewardRate:z.string().regex(/^\d{1,6}(\.\d{1,6})?$/),maximumReward:units,qualification:units,revision:z.number().int().positive(),reason,operationId}),
 z.object({action:z.literal('template'),id,title:z.string().trim().min(3).max(100),message:z.string().trim().min(5).max(1000),enabled:z.boolean(),reason,operationId}),
 z.object({action:z.literal('notify'),userId:id,title:z.string().trim().min(3).max(100),message:z.string().trim().min(5).max(1000),reason,operationId}),
 z.object({action:z.literal('referral_reward'),id:uuid,reason,operationId})
]);
