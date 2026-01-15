import Link from "next/link";

export default function CardDisabledPage() {
  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-md mx-auto card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title">This card is disabled</h1>
          <p className="text-sm opacity-70">
            This card has been deactivated by its owner or administrator.
          </p>

          <div className="mt-4 flex gap-2">
            <Link className="btn btn-primary" href="/claim">
              Claim a different card
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