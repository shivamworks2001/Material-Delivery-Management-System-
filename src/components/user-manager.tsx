"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type User = { id: string; name: string; email: string; role: string; active: boolean };
export function UserManager({ users }: { users: User[] }) {
 const router = useRouter();
 const [edit, setEdit] = useState<User | null>(null);
 const [message, setMessage] = useState("");
 const [busy, setBusy] = useState(false);
 const [search, setSearch] = useState("");
 async function save(event: React.FormEvent<HTMLFormElement>) {
 event.preventDefault(); setBusy(true); setMessage("");
 const form = event.currentTarget;
 const data = new FormData(form);
 try {
 const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit?.id, name: data.get("name"), email: data.get("email"), role: data.get("role"), active: data.get("active") === "on", ...(data.get("password") ? { password: data.get("password") } : {}) }) });
 const result = await response.json();
 if (!response.ok) throw new Error(result.error);
 setMessage("User saved successfully."); setEdit(null); form.reset(); router.refresh();
 } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save. Please retry."); } finally { setBusy(false); }
 }
 return <div className="team-grid"><section className="card"><h2>Team members</h2><label>Search users<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email"/></label><div className="user-list">{users.filter(u => (u.name + u.email).toLowerCase().includes(search.toLowerCase())).map(u => <div className="user-row" key={u.id}><span className="avatar">{u.name.slice(0, 1)}</span><div><strong>{u.name}</strong><small>{u.email}</small><small>{u.role} · {u.active ? "Active" : "Inactive"}</small></div><button className="quiet" onClick={() => { setEdit(u); setMessage(""); }}>Edit</button></div>)}</div></section><section className="card"><h2>{edit ? "Edit team member" : "Add team member"}</h2><form key={edit?.id ?? "new"} onSubmit={save}><label>Full name<input name="name" required minLength={2} maxLength={100} defaultValue={edit?.name}/></label><label>Email address<input name="email" type="email" required defaultValue={edit?.email}/></label><label>Role<select name="role" defaultValue={edit?.role ?? "DELIVERY"}><option value="DELIVERY">Delivery staff</option><option value="OFFICE">Office staff</option><option value="ADMIN">Administrator</option></select></label><label>{edit ? "New password (optional)" : "Password"}<input name="password" type="password" minLength={12} maxLength={128} required={!edit} autoComplete="new-password"/></label><label className="checkbox"><input name="active" type="checkbox" defaultChecked={edit?.active ?? true}/> Active account</label><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save team member"}</button>{edit && <button type="button" className="quiet" onClick={() => setEdit(null)}>Cancel edit</button>}</form>{message && <p role="status" className="notice">{message}</p>}</section></div>;
}
