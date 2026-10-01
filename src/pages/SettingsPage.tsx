export default function SettingsPage() {
  return (
    <section className="card section-card">
      <h2>Security controls</h2>
      <div className="setting-row"><div><b>App PIN</b><span>Require PIN when opening the wallet</span></div><input type="checkbox" defaultChecked /></div>
      <div className="setting-row"><div><b>Biometric unlock</b><span>Use supported device biometrics</span></div><input type="checkbox" /></div>
      <div className="setting-row"><div><b>Login alerts</b><span>Notify about new sign-ins</span></div><input type="checkbox" defaultChecked /></div>
      <button className="secondary full">Change password</button>
      <button className="secondary full">Review active sessions</button>
    </section>
  );
}
