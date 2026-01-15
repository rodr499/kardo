import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title">Kardo</h1>
          <p>DaisyUI is working.</p>
          <button className="btn btn-primary">Continue</button>
        </div>
      </div>
    </main>
  );
}