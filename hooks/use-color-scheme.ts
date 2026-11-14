'use client'

import { useEffect, useState } from 'react'

/** Tracks the effective color scheme, including a manual `.dark` class. */
export function useColorScheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const read = () => {
      const root = document.documentElement
      setDark(root.classList.contains('dark') || (!root.classList.contains('light') && query.matches))
    }
    read()
    query.addEventListener('change', read)
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      query.removeEventListener('change', read)
      observer.disconnect()
    }
  }, [])

  return dark
}
