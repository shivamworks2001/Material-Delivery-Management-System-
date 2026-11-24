"use client";
import { useEffect, useState } from "react";
type Option = { id: string; name: string; code?: string };
export type DeliverySelection = {
  customerId: string;
  projectId: string | null;
  locationId: string;
  address: string;
  person: string;
  mobile: string;
  email: string;
};
type Location = Option & {
  address: string;
  person: string;
  mobile: string;
  email: string;
  isDefault: boolean;
};
export function CustomerSelector({
  onChange,
}: {
  onChange: (selection: DeliverySelection | null) => void;
}) {
  const [query, setQuery] = useState(""),
    [customers, setCustomers] = useState<Option[]>([]),
    [customer, setCustomer] = useState(""),
    [projects, setProjects] = useState<Option[]>([]),
    [project, setProject] = useState(""),
    [locations, setLocations] = useState<Location[]>([]),
    [location, setLocation] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/customer-options?q=" + encodeURIComponent(query), {
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load customers");
        setCustomers(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [query]);
  useEffect(() => {
    if (!customer) return;
    const abort = new AbortController();
    fetch(
      "/api/customer-options?" +
        new URLSearchParams({ customerId: customer, projectId: project }),
      { signal: abort.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load delivery options");
        const data = await r.json();
        setProjects(data?.projects || []);
        setLocations(data?.locations || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [customer, project]);
  return (
    <fieldset>
      <legend>Customer and delivery destination</legend>
      <label>
        Find customer
        <input
          placeholder="Customer name or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        Customer
        <select
          value={customer}
          onChange={(e) => {
            setCustomer(e.target.value);
            setProject("");
            setLocation("");
            setLocations([]);
            setProjects([]);
            onChange(null);
          }}
        >
          <option value="">Choose customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Project
        <select
          value={project}
          disabled={!customer}
          onChange={(e) => {
            setProject(e.target.value);
            setLocation("");
            setLocations([]);
            onChange(null);
          }}
        >
          <option value="">Customer locations (no project)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Delivery location
        <select
          value={location}
          disabled={!customer}
          onChange={(e) => {
            setLocation(e.target.value);
            const l = locations.find((l) => l.id === e.target.value);
            onChange(
              l
                ? {
                    customerId: customer,
                    projectId: project || null,
                    locationId: l.id,
                    address: l.address,
                    person: l.person,
                    mobile: l.mobile,
                    email: l.email,
                  }
                : null,
            );
          }}
        >
          <option value="">Choose location</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
