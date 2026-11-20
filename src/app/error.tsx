"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="content"><h1>Workspace temporarily unavailable</h1><p>Please check your connection and try again. Your saved records are unchanged.</p><button className="primary" onClick={reset}>Try again</button></main>; }
