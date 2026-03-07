import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Login link expired</h1>
        <p className="text-sm text-slate-500">
          This login link has expired or has already been used. Please request a new one.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
