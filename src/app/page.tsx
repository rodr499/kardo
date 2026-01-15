import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-md mx-auto space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body text-center">
            <h1 className="text-3xl font-bold mb-2">Kardo</h1>
            <p className="text-base-content/70 mb-6">
              Your digital business card, simplified.
            </p>
            <div className="space-y-2">
              <Link className="btn btn-primary btn-block" href="/claim">
                Claim your card
              </Link>
              <p className="text-sm text-base-content/60 mt-4">
                Scan a card code or enter it manually to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
