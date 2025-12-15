'use client'

import { MissionControl } from '@/components/MissionControl'
import { CoordinationLayout } from '@/components/layout/CoordinationLayout'

export default function Home() {
  return (
    <CoordinationLayout>
      <MissionControl />
    </CoordinationLayout>
  )
}
