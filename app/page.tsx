import Image from "next/image";

import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Multi-Purpose Testing Platform</h1>
      <nav className="space-y-4">
        <Link href="/deep-links" className="block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Deep Link Testing
        </Link>
        <Link href="/api-testing" className="block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          API Testing
        </Link>
        <Link href="/ui-testing" className="block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
          UI Component Testing
        </Link>
        <Link href="/revolut-success?order_id=test123" className="block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
          Test Revolut Success Page
        </Link>
      </nav>
    </main>
  )
}
