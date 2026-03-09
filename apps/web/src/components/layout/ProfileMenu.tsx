'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type ProfileMenuProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  userName?: string
  userEmail?: string
  userAvatar?: string
  onProfileUpdated?: (data: { name: string; avatarUrl: string }) => void
}

export default function ProfileMenu({
  open,
  onOpenChange,
  userName = 'User',
  userEmail = 'user@example.com',
  userAvatar = '',
  onProfileUpdated,
}: ProfileMenuProps) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [name, setName] = useState(userName)
  const [avatarUrl, setAvatarUrl] = useState(userAvatar)

  useEffect(() => {
    setName(userName)
  }, [userName])

  useEffect(() => {
    setAvatarUrl(userAvatar)
  }, [userAvatar])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onOpenChange(false)
    router.push('/login')
  }

  const handleOpenDetails = () => {
    onOpenChange(false)
    setDetailsOpen(true)
  }
  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setAvatarUrl(objectUrl)
  }
  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          avatar_url: avatarUrl,
        },
      })

      if (error) {
        alert(error.message)
        return
      }
      onProfileUpdated?.({
        name,
        avatarUrl,
      })
      setDetailsOpen(false)
    } catch (error) {
      console.error(error)
      alert('Failed to update profile')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('You must be logged in to delete your account.')
        return
      }

      const response = await fetch('http://localhost:8000/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to delete account')
      }

      await supabase.auth.signOut()
      onOpenChange(false)
      setDetailsOpen(false)
      router.push('/login')
    } catch (error: any) {
      console.error('Delete account error:', error)
      alert(error?.message || 'Failed to delete account.')
    }
  }

  const fallbackInitial = name?.trim()?.charAt(0)?.toUpperCase() || 'U'

  return (
    <>
      {/* Small menu popup */}
      {open && (
        <div className="fixed bottom-4 left-16 z-50">
          <div
            ref={menuRef}
            className="w-56 rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-xl backdrop-blur"
          >
            <button
              onClick={handleOpenDetails}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
            >
              Profile details
            </button>

            <div className="my-2 h-px bg-white/10" />

            <button
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Center modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Profile details</h2>
                <p className="mt-1 text-sm text-white/50">
                  View and update your profile information
                </p>
              </div>

              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close profile details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10 transition hover:ring-white/25"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-white">
                      {fallbackInitial}
                    </span>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                    <span className="text-xs text-white">Change</span>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <p className="mt-3 text-xs text-white/50">
                  Click the photo to choose an image
                </p>
              </div>
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs text-white/50">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-xs text-white/50">Email</label>
                <input
                  type="text"
                  value={userEmail}
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={handleDeleteAccount}
                className="text-sm text-red-300 transition hover:text-red-200"
              >
                Delete account
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}