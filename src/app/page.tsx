import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#FAF2F0' }}>
      <div className="max-w-250px  text-center">

        {/* Organization Name */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Create Foundation Ticketing System
          </h1>
            
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <Link
            href="/admin/login"
            className="flex items-center justify-center gap-3 w-full text-white py-4 rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors"
            style={{ backgroundColor: '#414141' }}
          >
            Admin Panel
          </Link>

          <Link
            href="/scan"
            className="flex items-center justify-center gap-3 w-full text-white py-4 rounded-xl hover:bg-blue-50 font-medium text-lg transition-colors border-2 border-gray-600"
            style={{ backgroundColor: '#414141' }}
          >
            Scan QR Code
          </Link>
        </div>

        {/* Footer */}
        <p className="text-gray-300 text-sm mt-12">
          © 2026 Create Foundation
        </p>

      </div>
    </main>
  )
}



//draft code
// 'use client'

// import { useEffect } from 'react'
// import { supabase } from '@/lib/supabase'

// export default function Home() {
//   useEffect(() => {
//     const testConnection = async () => {
//       const { data, error } = await supabase.from('users').select('*')
//       if (error) {
//         console.log('Connection error:', error.message)
//       } else {
//         console.log('Connected to Supabase! ✅')
//       }
//     }
//     testConnection()
//   }, [])

//   return (
//     <main>
//       <h1>Connection Test</h1>
//       <p>Check your browser console for results</p>
//     </main>
//   )
// }





//Below is the original template code. Used for reference during front end development but may be deleted
// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
//       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={100}
//           height={20}
//           priority
//         />
//         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
//           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
//             To get started, edit the page.tsx file.
//           </h1>
//           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
//             Looking for a starting point or more instructions? Head over to{" "}
//             <a
//               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Templates
//             </a>{" "}
//             or the{" "}
//             <a
//               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               className="font-medium text-zinc-950 dark:text-zinc-50"
//             >
//               Learning
//             </a>{" "}
//             center.
//           </p>
//         </div>
//         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
//           <a
//             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={16}
//               height={16}
//             />
//             Deploy Now
//           </a>
//           <a
//             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Documentation
//           </a>
//         </div>
//       </main>
//     </div>
//   );
// }
