'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function ProfileMenu({ open, onOpenChange }: Props) {
  const router = useRouter()
  const boxRef = useRef<HTMLDivElement | null>(null)

  // close when clicking outside (ChatGPT style)
  useEffect(() => {
    if (!open) return

    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) onOpenChange(false)
    }

    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open, onOpenChange])

  if (!open) return null

  const logout = async () => {
    // TODO later: real supabase signOut()
    onOpenChange(false)
    router.push('/login')
  }

  const editProfile = () => {
    // For now: open a simple settings page or placeholder
    // Later we will show a modal like ChatGPT
    onOpenChange(false)
    router.push('/dashboard/settings')
  }

  return (
    <div className="fixed bottom-5 left-16 z-50">
      <div
        ref={boxRef}
        className="w-56 rounded-xl border border-white/10 bg-zinc-900/95 p-2 text-white shadow-lg backdrop-blur"
      >
        <button
          onClick={editProfile}
          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
        >
          Edit profile
        </button>

        <div className="my-1 h-px bg-white/10" />

        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    </div>
  )
}