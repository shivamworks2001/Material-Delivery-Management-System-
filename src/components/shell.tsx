import Link from "next/link";
export function Shell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="sun">☀</span>
          <span>
            Sunshine<small>ENGINEERING</small>
          </span>
        </Link>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {role !== "DELIVERY" && (
            <>
              <Link href="/customers">Customers</Link>
              <Link href="/projects">Projects</Link>
            </>
          )}
          <Link href="/">▦ &nbsp; Overview</Link>
          {role === "ADMIN" && (
            <Link href="/users">♙ &nbsp; Team & access</Link>
          )}
        </nav>
        <div className="sidebar-note">
          Built for the field.
          <br />
          <span>Connected from office to site.</span>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>Material Delivery Management</span>
          <div className="account">
            <span className="avatar">{name.slice(0, 1)}</span>
            <span>
              {name}
              <small>
                {role === "ADMIN"
                  ? "Administrator"
                  : role === "OFFICE"
                    ? "Office staff"
                    : "Delivery staff"}
              </small>
            </span>
            <form action="/api/auth/logout" method="post">
              <button className="quiet">Sign out</button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
        <nav className="mobile-nav">
          <Link href="/">Overview</Link>
          {role !== "DELIVERY" && (
            <>
              <Link href="/customers">Customers</Link>
              <Link href="/projects">Projects</Link>
            </>
          )}
          {role === "ADMIN" && <Link href="/users">Team & access</Link>}
        </nav>
      </div>
    </div>
  );
}
