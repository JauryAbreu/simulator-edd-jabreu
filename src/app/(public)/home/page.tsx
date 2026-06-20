import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Simulador EDD</h1>
        <p className="text-lg text-gray-600">
          Plataforma de evaluaciones y simulacros para preparación de exámenes.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-gray-300 bg-white px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </main>
  );
}
