import { useEffect, useState } from "react";

interface BusinessProcess {
  _id?: string;
  name?: string;
  description?: string;
}

function BusinessList() {
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/business")
      .then(res => res.json())
      .then(data => setProcesses(data))
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Business Processes</h2>
      <ul>
        {processes.map((p) => (
          <li key={p._id}>
            <strong>{p.name}</strong> – {p.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BusinessList;
