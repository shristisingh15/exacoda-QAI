import { useState, useEffect } from "react";
import UploadDocuments from "./UploadDocument";

function Flow() {
  const [step, setStep] = useState(1);
  const [processes, setProcesses] = useState<any[]>([]);

  useEffect(() => {
    if (step === 2) {
      fetch("http://localhost:5000/api/business")
        .then(res => res.json())
        .then(data => setProcesses(data));
    }
  }, [step]);

  return (
    <div>
      <h2>Project Flow</h2>

      <div className="steps">
        {step === 1 && <UploadDocuments setStep={setStep} />}

        {step === 2 && (
          <div>
            <h3>Flow Analysis</h3>
            {processes.length > 0 ? (
              <ul>
                {processes.map((p, idx) => (
                  <li key={idx}>
                    <strong>{p.name}</strong> - {p.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No business processes found.</p>
            )}
          </div>
        )}

        {step === 3 && <div>Test Scenarios</div>}
        {step === 4 && <div>Test Cases</div>}
        {step === 5 && <div>Test</div>}
      </div>
    </div>
  );
}

export default Flow;
