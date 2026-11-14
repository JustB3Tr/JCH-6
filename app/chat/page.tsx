import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ChatView } from '@/components/chat/chat-view'

export const metadata: Metadata = {
  title: 'Chat — Hangout',
  description: 'Group chats and direct messages for the people you meet up with.',
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ChatView />
    </Suspense>
  )
}
