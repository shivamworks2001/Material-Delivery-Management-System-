"use client";
import { useCallback, useEffect, useState } from "react";
import { customerSchema, customerPermissions } from "@/lib/customer-validation";
type Permissions = ReturnType<typeof customerPermissions>;
type Row = {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
  version: number;
  gstin: string | null;
  contact: { person: string; mobile: string; email: string } | null;
  addresses: { city: string }[];
};
type Listing = {
  rows: Row[];
  total: number;
  pages: number;
  counts: { total: number; active: number; inactive: number };
  categories: string[];
};
type Location = {
  id?: string;
  projectId?: string | null;
  name: string;
  address: string;
  person: string;
  mobile: string;
  email: string;
  pin: string;
  isDefault: boolean;
  active: boolean;
};
type Detail = Row & {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  actors: { id: string; name: string }[];
  documents: { id: string; name: string; size: number }[];
  projects: { id: string; name: string }[];
  locations: Location[];
  history: { id: string; action: string; actorId: string; createdAt: string }[];
  [key: string]: unknown;
};
type Field = [string, string, string?];
const groups: { name: string; fields: Field[] }[] = [
  {
    name: "Basic",
    fields: [
      ["type", "Customer type", "Company|Individual"],
      ["name", "Customer name *"],
      ["legalName", "Legal business name"],
      ["displayName", "Display name"],
      ["gstin", "GSTIN"],
      ["pan", "PAN number"],
      ["category", "Customer category"],
      ["industry", "Industry type"],
      ["active", "Customer status", "true|false"],
    ],
  },
  {
    name: "Contact",
    fields: [
      ["contact.person", "Primary contact person *"],
      ["contact.designation", "Designation"],
      ["contact.mobile", "Mobile number *"],
      ["contact.alternateMobile", "Alternate mobile"],
      ["contact.email", "Email address"],
      ["contact.website", "Website"],
      ["contact.landline", "Landline"],
    ],
  },
  {
    name: "Addresses",
    fields: [
      ...["billing", "shipping"].flatMap((kind) =>
        [
          ["line1", "Address line 1 *"],
          ["line2", "Address line 2"],
          ["country", "Country"],
          ["state", "State"],
          ["district", "District"],
          ["city", "City"],
          ["pin", "PIN code"],
        ].map(
          ([key, label]) =>
            [
              kind + "." + key,
              (kind === "billing" ? "Billing: " : "Shipping: ") + label,
            ] as Field,
        ),
      ),
    ],
  },
  { name: "Locations", fields: [] },
  {
    name: "Financial",
    fields: [
      ["financial.terms", "Payment terms", "Advance|Cash|Credit|Custom"],
      ["financial.customTerms", "Custom payment terms"],
      ["financial.creditLimit", "Credit limit"],
      ["financial.creditDays", "Credit days"],
      ["financial.openingBalance", "Opening balance"],
      ["financial.balanceType", "Opening balance type", "Receivable|Payable"],
      ["financial.currency", "Currency"],
      ["financial.tds", "TDS applicable", "false|true"],
      ["financial.tdsDetails", "TDS details"],
    ],
  },
  {
    name: "Additional",
    fields: [
      ["group", "Customer group"],
      ["salesperson", "Assigned salesperson"],
      ["source", "Customer source"],
      ["notes", "Remarks / notes"],
    ],
  },
];
function flatten(
  value: unknown,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const [k, v] of Object.entries(value)) {
      if (v !== null && typeof v === "object" && !Array.isArray(v))
        flatten(v, prefix + k + ".", out);
      else if (v !== null && typeof v !== "object") out[prefix + k] = String(v);
    }
  return out;
}
function expand(values: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const [a, b] = key.split(".");
    if (b) {
      const section = (out[a] ??= {}) as Record<string, unknown>;
      section[b] = value;
    } else out[a] = value;
  }
  return out;
}
const initial = {
  type: "Company",
  name: "",
  active: "true",
  "contact.person": "",
  "contact.mobile": "",
  "billing.line1": "",
  "billing.country": "India",
  "shipping.line1": "",
  "shipping.country": "India",
  "financial.terms": "Cash",
  "financial.currency": "INR",
  "financial.creditLimit": "0",
  "financial.creditDays": "0",
  "financial.openingBalance": "0",
  "financial.balanceType": "Receivable",
  "financial.tds": "false",
};
export function CustomerManager({ permissions }: { permissions: Permissions }) {
  const [listing, setListing] = useState<Listing | null>(null),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"list" | "edit" | "view">("list"),
    [detail, setDetail] = useState<Detail | null>(null),
    [section, setSection] = useState("Basic"),
    [values, setValues] = useState<Record<string, string>>(initial),
    [locations, setLocations] = useState<Location[]>([]),
    [same, setSame] = useState(true),
    [files, setFiles] = useState<File[]>([]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(
          "/api/customers?" +
            new URLSearchParams({
              q: query,
              type,
              category,
              status,
              sort,
              page: String(page),
            }),
          { signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setListing(data);
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError"))
          setMessage(
            e instanceof Error ? e.message : "Unable to load customers",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query, type, category, status, sort, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => load(controller.signal), 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  async function open(id: string, edit = false) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/customers/" + id);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDetail(d);
      const billing = d.addresses.find(
          (a: { kind: string }) => a.kind === "BILLING",
        ),
        shipping = d.addresses.find(
          (a: { kind: string }) => a.kind === "SHIPPING",
        );
      setValues({
        ...initial,
        ...flatten(d),
        ...flatten(billing, "billing."),
        ...flatten(shipping, "shipping."),
      });
      setLocations(d.locations);
      setSame(false);
      setFiles([]);
      setErrors({});
      setSection("Basic");
      setMode(edit ? "edit" : "view");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load customer");
    } finally {
      setBusy(false);
    }
  }
  function start() {
    setDetail(null);
    setValues(initial);
    setLocations([]);
    setSame(true);
    setFiles([]);
    setErrors({});
    setSection("Basic");
    setMode("edit");
    setMessage("");
  }
  function change(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  async function save() {
    setMessage("");
    const payload = expand(values);
    payload.active = values.active === "true";
    payload.sameAsBilling = same;
    payload.locations = locations;
    payload.version = detail?.version;
    if (same) delete payload.shipping;
    if (!permissions.financial) delete payload.financial;
    else if (payload.financial)
      (payload.financial as Record<string, unknown>).tds =
        values["financial.tds"] === "true";
    const parsed = customerSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      setMessage(
        "Please correct the highlighted fields. Check each section marked below.",
      );
      return;
    }
    if (
      detail?.active &&
      !parsed.data.active &&
      !confirm(
        "Deactivate this customer? It will no longer be available for new deliveries.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(
        "/api/customers" + (detail ? "/" + detail.id : ""),
        {
          method: detail ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.fields || {});
        throw new Error(data.error);
      }
      const remaining = [...files];
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const upload = await fetch("/api/customers/" + data.id + "/documents", {
          method: "POST",
          body: form,
        });
        if (!upload.ok) {
          await open(data.id, true);
          setFiles(remaining);
          throw new Error(
            "Customer saved, but document upload failed. Retry the remaining documents.",
          );
        }
        remaining.shift();
      }
      await open(data.id);
      setMessage("Customer saved successfully.");
      load();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Unable to save. Your entered data is preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle(row: Row) {
    if (
      !confirm((row.active ? "Deactivate" : "Activate") + " " + row.name + "?")
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/customers/" + row.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active, version: row.version }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessage("Customer status updated.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to update status");
    } finally {
      setBusy(false);
    }
  }
  const tabs = groups.filter(
    (g) => g.name !== "Financial" || permissions.financial,
  );
  const fields = tabs.find((g) => g.name === section)?.fields || [];
  return (
    <>
      <div className="heading">
        <div>
          <p className="eyebrow">CUSTOMER MASTER</p>
          <h1>Customer Management</h1>
          <p className="muted">
            Customer relationships, addresses and delivery contacts.
          </p>
        </div>
        {mode === "list" ? (
          <button className="primary" onClick={start}>
            Add New Customer
          </button>
        ) : (
          <button
            className="quiet"
            onClick={() => {
              if (
                mode === "edit" &&
                !confirm("Leave this form? Unsaved changes will be lost.")
              )
                return;
              setMode("list");
              setMessage("");
            }}
          >
            Back to customers
          </button>
        )}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {mode === "list" && (
        <>
          <section className="stats">
            {["total", "active", "inactive"].map((k) => (
              <article className="card" key={k}>
                <p>{k[0].toUpperCase() + k.slice(1)} customers</p>
                <strong>
                  {listing?.counts[k as keyof Listing["counts"]] ?? "—"}
                </strong>
              </article>
            ))}
          </section>
          <section className="card">
            <div className="customer-filters">
              <label>
                Search
                <input
                  value={query}
                  placeholder="Name, code, GSTIN, mobile or email"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                Type
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All types</option>
                  <option>Company</option>
                  <option>Individual</option>
                </select>
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {listing?.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Sort
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="code">Customer code</option>
                </select>
              </label>
            </div>
            {loading ? (
              <p role="status">Loading customers…</p>
            ) : !listing?.rows.length ? (
              <div className="empty">
                <h2>No customers found</h2>
                <p>Add a customer or adjust your search.</p>
              </div>
            ) : (
              <div className="customer-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Code",
                        "Customer name",
                        "Type",
                        "Contact person",
                        "Mobile",
                        "Email",
                        "GSTIN",
                        "City",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listing.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.code}</td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => open(row.id)}
                          >
                            {row.name}
                          </button>
                        </td>
                        <td>{row.type}</td>
                        <td>{row.contact?.person}</td>
                        <td>{row.contact?.mobile}</td>
                        <td>{row.contact?.email || "—"}</td>
                        <td>{row.gstin || "—"}</td>
                        <td>{row.addresses[0]?.city || "—"}</td>
                        <td>
                          <span className="badge">
                            {row.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="customer-actions">
                            <button
                              disabled={busy}
                              className="quiet"
                              onClick={() => open(row.id)}
                            >
                              View
                            </button>
                            <button
                              disabled={busy}
                              className="quiet"
                              onClick={() => open(row.id, true)}
                            >
                              Edit
                            </button>
                            {permissions.status && (
                              <button
                                disabled={busy}
                                className="quiet"
                                onClick={() => toggle(row)}
                              >
                                {row.active ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="customer-pagination">
              <button
                className="quiet"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {listing?.pages || 1} · {listing?.total || 0}{" "}
                results
              </span>
              <button
                className="quiet"
                disabled={page >= (listing?.pages || 1) || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </section>
        </>
      )}
      {mode === "edit" && (
        <section className="card">
          <div className="section-heading">
            <h2>{detail ? "Edit " + detail.code : "New customer"}</h2>
            <span className="muted">* Required · Code assigned on save</span>
          </div>
          <div className="customer-tabs" role="tablist">
            {tabs.map((g) => (
              <button
                role="tab"
                aria-selected={section === g.name}
                key={g.name}
                className={section === g.name ? "primary" : "quiet"}
                onClick={() => setSection(g.name)}
              >
                {g.name}
                {g.fields.some(([key]) => errors[key]) ? " •" : ""}
              </button>
            ))}
          </div>
          {section === "Addresses" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={same}
                onChange={(e) => setSame(e.target.checked)}
              />{" "}
              Shipping same as billing address
            </label>
          )}
          <div className="customer-form-grid">
            {fields
              .filter(
                ([key]) =>
                  !(same && key.startsWith("shipping.")) &&
                  !(values.type === "Individual" && key === "legalName") &&
                  !(
                    key === "financial.tdsDetails" &&
                    values["financial.tds"] !== "true"
                  ) &&
                  !(
                    key === "financial.customTerms" &&
                    values["financial.terms"] !== "Custom"
                  ),
              )
              .map(([key, label, options]) => (
                <label key={key}>
                  {label}
                  {options ? (
                    <select
                      value={values[key] || options.split("|")[0]}
                      disabled={key === "active" && !permissions.status}
                      onChange={(e) => change(key, e.target.value)}
                    >
                      {options.split("|").map((o) => (
                        <option key={o} value={o}>
                          {key === "active"
                            ? o === "true"
                              ? "Active"
                              : "Inactive"
                            : key === "financial.tds"
                              ? o === "true"
                                ? "Yes"
                                : "No"
                              : o}
                        </option>
                      ))}
                    </select>
                  ) : key === "notes" ? (
                    <textarea
                      value={values[key] || ""}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  ) : (
                    <input
                      aria-invalid={!!errors[key]}
                      value={values[key] || ""}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  )}{" "}
                  {errors[key] && (
                    <span className="field-error">{errors[key]}</span>
                  )}
                </label>
              ))}
          </div>
          {section === "Locations" && (
            <>
              <p className="muted">
                Choose an existing project when available. Locations may also
                belong directly to the customer.
              </p>
              {locations.map((l, index) => (
                <fieldset className="location-card" key={l.id || index}>
                  <legend>Delivery location {index + 1}</legend>
                  <div className="customer-form-grid">
                    {[
                      "name",
                      "address",
                      "person",
                      "mobile",
                      "email",
                      "pin",
                    ].map((k) => (
                      <label key={k}>
                        {
                          (
                            {
                              name: "Location name *",
                              address: "Complete address *",
                              person: "Contact person",
                              mobile: "Mobile",
                              email: "Email",
                              pin: "PIN code",
                            } as Record<string, string>
                          )[k]
                        }
                        <input
                          value={String(l[k as keyof Location] || "")}
                          onChange={(e) =>
                            setLocations((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, [k]: e.target.value } : r,
                              ),
                            )
                          }
                        />
                        {errors["locations." + index + "." + k] && (
                          <span className="field-error">
                            {errors["locations." + index + "." + k]}
                          </span>
                        )}
                      </label>
                    ))}
                    <label>
                      Project
                      <select
                        value={l.projectId || ""}
                        onChange={(e) =>
                          setLocations((rows) =>
                            rows.map((r, i) =>
                              i === index
                                ? { ...r, projectId: e.target.value || null }
                                : r,
                            ),
                          )
                        }
                      >
                        <option value="">Customer delivery location</option>
                        {detail?.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={l.isDefault}
                      onChange={(e) =>
                        setLocations((rows) =>
                          rows.map((r, i) => ({
                            ...r,
                            isDefault: i === index ? e.target.checked : false,
                          })),
                        )
                      }
                    />
                    Default delivery location
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={l.active}
                      onChange={(e) =>
                        setLocations((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, active: e.target.checked }
                              : r,
                          ),
                        )
                      }
                    />
                    Active location
                  </label>
                  <button
                    className="quiet"
                    onClick={() => {
                      if (
                        confirm(
                          "Remove this location? Existing history is retained.",
                        )
                      )
                        setLocations((rows) =>
                          rows.filter((_, i) => i !== index),
                        );
                    }}
                  >
                    Remove location
                  </button>
                </fieldset>
              ))}
              {errors.locations && (
                <p className="field-error">{errors.locations}</p>
              )}
              <button
                className="quiet"
                onClick={() =>
                  setLocations((rows) => [
                    ...rows,
                    {
                      name: "",
                      address: "",
                      person: "",
                      mobile: "",
                      email: "",
                      pin: "",
                      active: true,
                      isDefault: rows.length === 0,
                    },
                  ])
                }
              >
                Add Another Location
              </button>
            </>
          )}
          {section === "Additional" && (
            <label>
              Supporting documents (PDF, JPEG, PNG; 2 MB each)
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <small>{files.map((f) => f.name).join(", ")}</small>
            </label>
          )}
          {Object.keys(errors).length > 0 && (
            <div className="notice error" role="alert">
              {Object.entries(errors).map(([key, error]) => (
                <p key={key}>
                  {key}: {error}
                </p>
              ))}
            </div>
          )}
          <div className="customer-save">
            <button className="primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save customer"}
            </button>
          </div>
        </section>
      )}
      {mode === "view" && detail && (
        <>
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>{detail.name}</h2>
                <p className="muted">
                  {detail.code} · {detail.active ? "Active" : "Inactive"}
                </p>
              </div>
              <button className="primary" onClick={() => open(detail.id, true)}>
                Edit Customer
              </button>
            </div>
          </section>
          {tabs
            .filter((g) => g.name !== "Locations")
            .map((g) => (
              <section className="card customer-section" key={g.name}>
                <h2>{g.name}</h2>
                <dl className="customer-form-grid">
                  {g.fields.map(([key, label]) => (
                    <div key={key}>
                      <dt>{label.replace(" *", "")}</dt>
                      <dd>
                        {key === "active"
                          ? values[key] === "true"
                            ? "Active"
                            : "Inactive"
                          : key === "financial.tds"
                            ? values[key] === "true"
                              ? "Yes"
                              : "No"
                            : values[key] || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          <section className="card customer-section">
            <h2>Delivery locations</h2>
            {detail.locations.length ? (
              detail.locations.map((l) => (
                <div className="location-card" key={l.id}>
                  <h3>
                    {l.name} {l.isDefault ? "· Default" : ""}
                  </h3>
                  <p>
                    Project:{" "}
                    {detail.projects.find((p) => p.id === l.projectId)?.name ||
                      "Customer location"}
                  </p>
                  <p>{l.address}</p>
                  <p>
                    {l.person} · {l.mobile} · {l.email}
                  </p>
                  <p>
                    {l.pin} · {l.active ? "Active" : "Inactive"}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">No delivery locations added.</p>
            )}
          </section>
          <section className="card customer-section">
            <h2>Supporting documents</h2>
            {detail.documents.length ? (
              detail.documents.map((d) => (
                <p key={d.id}>
                  <a
                    className="text-button"
                    href={"/api/customers/" + detail.id + "/documents/" + d.id}
                  >
                    {d.name} ({Math.ceil(d.size / 1024)} KB)
                  </a>
                </p>
              ))
            ) : (
              <p className="muted">No documents uploaded.</p>
            )}
          </section>
          <section className="card customer-section">
            <h2>System information</h2>
            <p>ID: {detail.id}</p>
            <p>
              Created: {new Date(detail.createdAt).toLocaleString()} by{" "}
              {detail.actors.find((a) => a.id === detail.createdBy)?.name ||
                detail.createdBy}
            </p>
            <p>
              Modified: {new Date(detail.updatedAt).toLocaleString()} by{" "}
              {detail.actors.find((a) => a.id === detail.updatedBy)?.name ||
                detail.updatedBy}
            </p>
            <h3>Audit history</h3>
            {detail.history.map((h) => (
              <p key={h.id}>
                {h.action} · {new Date(h.createdAt).toLocaleString()} ·{" "}
                {detail.actors.find((a) => a.id === h.actorId)?.name ||
                  h.actorId}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
