import { Landmark, Plus } from "lucide-react";
import { payoutMethods } from "../data/mock";

export default function PayoutMethodsPage() {
  return (
    <>
      <section className="card list">
        {payoutMethods.map(method => (
          <div className="list-row" key={method.id}>
            <div className="icon-circle"><Landmark size={20}/></div>
            <div className="grow"><b>{method.bankName}</b><span>{method.accountName} • {method.maskedAccount}</span></div>
            {method.isDefault && <span className="status completed">default</span>}
          </div>
        ))}
      </section>
      <button className="primary full"><Plus size={18}/>Add payout method</button>
      <p className="fine-print">Starter page only. Account validation, KYC rules and payout approval logic must be enforced server-side.</p>
    </>
  );
}
