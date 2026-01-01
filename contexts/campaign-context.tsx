// contexts/campaign-context.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'

interface CampaignContextType {
  campaignId: string | null
  userId: string | null
}

const CampaignContext = createContext<CampaignContextType | null>(null)

export function CampaignProvider({ 
  campaignId, 
  userId,
  children 
}: { 
  campaignId: string | null
  userId: string | null
  children: ReactNode 
}) {
  return (
    <CampaignContext.Provider value={{ campaignId, userId }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaignContext() {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaignContext must be used within CampaignProvider')
  }
  return context
}