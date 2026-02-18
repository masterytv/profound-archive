'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { useCallback } from 'react'

export function ChannelSearch({ currentQuery }: { currentQuery: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleSearch = useCallback(
        (value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value) {
                params.set('q', value)
                params.set('page', '1') // Reset to first page on search
            } else {
                params.delete('q')
            }
            router.push(`${pathname}?${params.toString()}`)
        },
        [router, pathname, searchParams]
    )

    return (
        <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search channels..."
                defaultValue={currentQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
        </div>
    )
}
