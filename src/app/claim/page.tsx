export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-md mx-auto card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title">Claim your Kardo</h1>
          <p className="text-sm opacity-70">
            Scan a card to auto-fill, or enter the code manually.
          </p>

          <label className="form-control mt-4">
            <div className="label">
              <span className="label-text">Card code</span>
            </div>
            <input
              className="input input-bordered font-mono"
              defaultValue={code ?? ""}
              placeholder="AB7K9Q2M"
              readOnly
            />
            <div className="label">
              <span className="label-text-alt opacity-60">
                (Claim flow will become interactive after auth is added)
              </span>
            </div>
          </label>

          <button className="btn btn-primary mt-4" disabled>
            Sign in to claim (next)
          </button>
        </div>
      </div>
    </main>
  );
}