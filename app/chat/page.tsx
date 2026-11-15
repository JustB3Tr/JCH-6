import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ChatView } from '@/components/chat/chat-view'
import { pageTitle } from '@/lib/brand'

export const metadata: Metadata = {
  title: pageTitle('Chat'),
  description: 'Group chats and direct messages for the people you meet up with.',
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ChatView />
    </Suspense>
  )
}
