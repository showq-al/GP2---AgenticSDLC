'use client'
import { useState } from 'react'

type Props = {
  onSearch: (term: string) => void
}

export default function SidebarSearch({ onSearch }: Props) {
  const [value, setValue] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    onSearch(e.target.value)
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <div className="relative mx-1 mt-1">
      {/* Search icon */}
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
          />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search chats..."
        className="w-full rounded-xl bg-white/[0.08] py-2.5 pl-10 pr-8 text-sm text-white
                   placeholder-white/40 transition
                   focus:bg-white/[0.12] focus:outline-none focus:ring-1 focus:ring-purple-500/50"
      />

      {/* Clear button — only visible while there is text */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-3 flex items-center text-white/40 transition hover:text-white/80"
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}