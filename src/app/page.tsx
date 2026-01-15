import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kardo - Your Digital Business Card",
  description: "Share your contact information instantly. No apps, no downloads—just scan and connect.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-base-200 via-base-100 to-base-200">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <p className="text-2xl md:text-3xl font-semibold text-base-content mb-4">
            Your Digital Business Card
          </p>
          <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
            Share your contact information instantly. No apps, no downloads—just scan and connect.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body items-center text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="card-title text-lg">Instant Sharing</h3>
              <p className="text-sm text-base-content/70">
                Share your contact info with a simple scan
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body items-center text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="card-title text-lg">Always Updated</h3>
              <p className="text-sm text-base-content/70">
                Your contacts always have your latest information
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body items-center text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="card-title text-lg">Privacy First</h3>
              <p className="text-sm text-base-content/70">
                You control who sees your information
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="card bg-base-100 shadow-xl border-2 border-primary/20">
          <div className="card-body items-center text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-base-content/70 mb-8 max-w-md">
              Claim your Kardo card and start sharing your contact information the modern way.
            </p>
            <div className="flex justify-center w-full max-w-md">
              <Link className="btn btn-primary btn-lg" href="/claim">
                Claim Your Card
              </Link>
            </div>
            <p className="text-xs text-base-content/50 mt-6">
              Have a card code? Enter it when you claim your card.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-base-300">
          <p className="text-sm text-base-content/60">
            Powered by <span className="font-semibold text-primary">Kardo</span> — 
            Making connections simple, one card at a time.
          </p>
        </div>
      </div>
    </main>
  );
}
