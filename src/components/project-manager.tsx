"use client";
import { useEffect, useState } from "react";
type Project = {
  id: string;
  name: string;
  active: boolean;
  customerId: string;
  customer: { code: string; name: string };
};
export function ProjectManager() {
  const [rows, setRows] = useState<Project[]>([]),
    [customers, setCustomers] = useState<
      { id: string; name: string; code: string }[]
    >([]),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<Project | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await fetch("/api/projects");
      if (!r.ok) throw Error("Unable to load projects");
      setRows(await r.json());
    } catch (e) {
      setMessage(String(e));
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/projects", { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Unable to load projects");
        setRows(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage(e.message);
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/customer-options?q=" + encodeURIComponent(query), {
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error("Unable to load customers");
        setCustomers(await r.json());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage(e.message);
      });
    return () => abort.abort();
  }, [query]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const active = data.get("active") === "on";
    if (
      edit?.active &&
      !active &&
      !confirm("Deactivate this project for new deliveries?")
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: edit?.id,
          customerId: edit?.customerId || data.get("customerId"),
          name: data.get("name"),
          active,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setEdit(null);
      form.reset();
      setMessage("Project saved.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="muted">
        Projects are linked to existing customers. Manage delivery locations in
        the customer form.
      </p>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="team-grid">
        <section className="card">
          <h2>Projects</h2>
          {!rows.length && <p>No projects yet.</p>}
          {rows.map((p) => (
            <div className="user-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <small>
                  {p.customer.code} · {p.customer.name} ·{" "}
                  {p.active ? "Active" : "Inactive"}
                </small>
              </div>
              <button className="quiet" onClick={() => setEdit(p)}>
                Edit
              </button>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>{edit ? "Edit project" : "Add project"}</h2>
          <form key={edit?.id || "new"} onSubmit={save}>
            {!edit && (
              <>
                <label>
                  Search customer
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label>
                  Customer
                  <select required name="customerId">
                    <option value="">Choose customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Project name
              <input
                name="name"
                required
                minLength={2}
                maxLength={200}
                defaultValue={edit?.name}
              />
            </label>
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={edit?.active ?? true}
              />
              Active
            </label>
            <button disabled={busy} className="primary">
              {busy ? "Saving…" : "Save project"}
            </button>
            {edit && (
              <button
                type="button"
                className="quiet"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
