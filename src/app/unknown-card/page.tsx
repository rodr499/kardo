import Link from "next/link";

export default function UnknownCardPage() {
  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-md mx-auto card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title">Card not recognized</h1>
          <p className="text-sm opacity-70">
            This card code isn&apos;t in our system. If you just received this card, it may not be activated yet.
          </p>

          <div className="mt-4 flex gap-2">
            <Link className="btn btn-primary" href="/claim">
              Claim a card
            </Link>
            <Link className="btn btn-outline" href="/">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}