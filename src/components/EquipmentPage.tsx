import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Wrench, Briefcase, LayoutGrid, Table, X, CalendarDays, ChevronLeft, ChevronRight, Inbox, CheckCircle2, XCircle, ArrowRightLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import toast from 'react-hot-toast'
import { fetchDashboardProjects } from '@/api/projects'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

type EquipmentType = 'TRUCK' | 'MANLIFT' | 'FORKLIFT' | 'VAN' | 'EXCAVATOR' | 'ROLLER' | 'DOZER' | 'LOADER' | 'CRANE' | 'DRILL' | 'GENERATOR' | 'COMPRESSOR' | 'WELDER' | 'PUMP' | 'OTHER'
type EquipmentStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
type EquipmentState = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'SERVICE_SCHEDULED' | 'MOVEMENT'
type ViewMode = 'table' | 'cards'
type FilterValue = 'ALL' | EquipmentState
type EquipmentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
type EquipmentRequestType = 'ASSIGNMENT' | 'MOVEMENT'

interface SeedProject {
  id: number
  name: string
  exactLocation?: string
  lifecycleStage?: string
}

interface EquipmentAsset {
  id: number
  name: string
  serialCode?: string | null
  type: EquipmentType
}

interface AssignmentEvent {
  id: number
  equipmentId: number
  projectId: number
  startDate: string // ISO
  endDate?: string | null // ISO
}

interface ServiceEvent {
  id: number
  equipmentId: number
  scheduledStart: string // ISO
  scheduledEnd: string // ISO
  type: 'ROUTINE' | 'REPAIR' | 'INSPECTION'
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
  notes?: string
}

interface MovementEvent {
  id: number
  equipmentId: number
  startDate: string // ISO
  fromProjectId?: number | null
  toProjectId?: number | null
  notes?: string
}

interface EquipmentRequest {
  id: number
  type: EquipmentRequestType
  projectId: number
  requestedType?: EquipmentType | null
  equipmentId?: number | null
  startDate: string // ISO
  endDate?: string | null // ISO
  fromProjectId?: number | null
  toProjectId?: number | null
  notes?: string | null
  status: EquipmentRequestStatus
  requestedBy?: {
    id: number
    username?: string
    email?: string
    name?: string
  }
  decidedBy?: {
    id: number
    username?: string
    email?: string
    name?: string
  } | null
  decidedAt?: string | null
  decisionNote?: string | null
  assignmentId?: number | null
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseISO(date: string) {
  const parsed = new Date(date)
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }
  return new Date(`${date}T00:00:00`)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function startOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

function endOfWeek(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + (6 - d.getDay()))
  return d
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function isBetween(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

function formatRange(startIso: string, endIso?: string | null) {
  if (!endIso) return new Date(startIso).toLocaleDateString()
  return `${new Date(startIso).toLocaleDateString()} – ${new Date(endIso).toLocaleDateString()}`
}

function shortEquipmentLabel(name: string) {
  const parts = name.split(' - ')
  return (parts[1] || parts[0] || name).trim()
}

const stateBadge: Record<EquipmentState, { variant: 'success' | 'secondary' | 'warning' | 'outline' | 'destructive' | 'info'; label: string }> = {
  AVAILABLE: { variant: 'success', label: 'Available' },
  ASSIGNED: { variant: 'secondary', label: 'Assigned' },
  MAINTENANCE: { variant: 'destructive', label: 'Maintenance' },
  SERVICE_SCHEDULED: { variant: 'warning', label: 'Service scheduled' },
  MOVEMENT: { variant: 'info', label: 'Movement' },
}

export const EquipmentPage: React.FC = () => {
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | EquipmentType>('ALL')
  const [search, setSearch] = useState('')

  const [visibleCount, setVisibleCount] = useState(24)

  const [projects, setProjects] = useState<SeedProject[]>([])
  const [fleet, setFleet] = useState<EquipmentAsset[]>([])
  const [assignments, setAssignments] = useState<AssignmentEvent[]>([])
  const [movements, setMovements] = useState<MovementEvent[]>([])
  const [services, setServices] = useState<ServiceEvent[]>([])
  const [requests, setRequests] = useState<EquipmentRequest[]>([])

  const reloadProjects = useCallback(async () => {
    const data = await fetchDashboardProjects(undefined)
    setProjects(
      data
        .filter((p) => p.lifecycleStage !== 'ESTIMATION')
        .map((p) => ({
        id: p.id,
        name: p.name,
        exactLocation: p.address,
        lifecycleStage: p.lifecycleStage,
      })),
    )
  }, [])

  const reloadFleet = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/equipment`)
    if (!response.ok) throw new Error(`Failed to fetch equipment: ${response.statusText}`)
    const rows = await response.json()
    setFleet(
      (rows as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        serialCode: r.serialCode ?? null,
        type: r.type,
      })),
    )
  }, [])

  const reloadFleetEvents = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/equipment/events/fleet`)
    if (!response.ok) throw new Error(`Failed to fetch fleet events: ${response.statusText}`)
    const data = await response.json()
    setAssignments(
      (data.assignments as any[]).map((a) => ({
        id: a.id,
        equipmentId: a.equipmentId,
        projectId: a.projectId,
        startDate: isoDate(parseISO(a.startDate)),
        endDate: a.endDate ? isoDate(parseISO(a.endDate)) : null,
      })),
    )
    setServices(
      (data.services as any[]).map((s) => ({
        id: s.id,
        equipmentId: s.equipmentId,
        scheduledStart: isoDate(parseISO(s.scheduledStart)),
        scheduledEnd: isoDate(parseISO(s.scheduledEnd)),
        type: s.type,
        status: s.status,
        notes: s.notes ?? undefined,
      })),
    )
    setMovements(
      (data.movements as any[]).map((m) => ({
        id: m.id,
        equipmentId: m.equipmentId,
        startDate: isoDate(parseISO(m.startDate)),
        fromProjectId: m.fromProjectId ?? null,
        toProjectId: m.toProjectId ?? null,
        notes: m.notes ?? undefined,
      })),
    )
  }, [])

  const reloadRequests = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/equipment/requests`)
    if (!response.ok) throw new Error(`Failed to fetch requests: ${response.statusText}`)
    const rows = await response.json()
    setRequests(
      (rows as any[]).map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        projectId: r.projectId,
        requestedType: r.requestedType ?? null,
        equipmentId: r.equipmentId ?? null,
        startDate: isoDate(parseISO(r.startDate)),
        endDate: r.endDate ? isoDate(parseISO(r.endDate)) : null,
        fromProjectId: r.fromProjectId ?? null,
        toProjectId: r.toProjectId ?? null,
        notes: r.notes ?? null,
        requestedBy: r.requestedBy
          ? {
              id: r.requestedBy.id,
              username: r.requestedBy.username,
              email: r.requestedBy.email,
              name: r.requestedBy.username,
            }
          : undefined,
        decidedBy: r.decidedBy
          ? {
              id: r.decidedBy.id,
              username: r.decidedBy.username,
              email: r.decidedBy.email,
              name: r.decidedBy.username,
            }
          : null,
        decidedAt: r.decidedAt ?? null,
        decisionNote: r.decisionNote ?? null,
        assignmentId: r.assignmentId ?? null,
      })),
    )
  }, [])

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadProjects(), reloadFleet(), reloadFleetEvents(), reloadRequests()])
  }, [reloadFleet, reloadFleetEvents, reloadProjects, reloadRequests])

  useEffect(() => {
    setVisibleCount(24)
  }, [filter, search, typeFilter])

  useEffect(() => {
    void (async () => {
      try {
        await reloadAll()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load equipment data')
      }
    })()
  }, [reloadAll])

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [assignOpen, setAssignOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)

  const [assignProjectId, setAssignProjectId] = useState<string>('')
  const [assignStart, setAssignStart] = useState<string>(isoDate(today))
  const [assignEnd, setAssignEnd] = useState<string>('')
  const [assignAutoResolve, setAssignAutoResolve] = useState(true)

  const [serviceType, setServiceType] = useState<ServiceEvent['type']>('ROUTINE')
  const [serviceStart, setServiceStart] = useState<string>(isoDate(addDays(today, 14)))
  const [serviceAutoResolve, setServiceAutoResolve] = useState(true)
  const [serviceNotes, setServiceNotes] = useState('')

  const [addEquipmentName, setAddEquipmentName] = useState('')
  const [addEquipmentType, setAddEquipmentType] = useState<EquipmentType>('EXCAVATOR')
  const [addEquipmentSerialCode, setAddEquipmentSerialCode] = useState('')
  const [addEquipmentStatus, setAddEquipmentStatus] = useState<EquipmentStatus>('AVAILABLE')

  const [editEquipmentOpen, setEditEquipmentOpen] = useState(false)
  const [editEquipmentId, setEditEquipmentId] = useState<number | null>(null)
  const [editEquipmentName, setEditEquipmentName] = useState('')
  const [editEquipmentType, setEditEquipmentType] = useState<EquipmentType>('EXCAVATOR')
  const [editEquipmentSerialCode, setEditEquipmentSerialCode] = useState('')
  const [editEquipmentStatus, setEditEquipmentStatus] = useState<EquipmentStatus>('AVAILABLE')

  const [movementStart, setMovementStart] = useState<string>(isoDate(addDays(today, 1)))
  const [movementNotes, setMovementNotes] = useState('')
  const [movementFromProjectId, setMovementFromProjectId] = useState<string>('')
  const [movementToProjectId, setMovementToProjectId] = useState<string>('')
  const [movementAutoResolve, setMovementAutoResolve] = useState(true)

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(today))
  const [calendarShowAssignments, setCalendarShowAssignments] = useState(true)
  const [calendarShowServices, setCalendarShowServices] = useState(true)
  const [calendarShowMovements, setCalendarShowMovements] = useState(true)

  const [requestsTab, setRequestsTab] = useState<'pending' | 'history'>('pending')
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [requestEditStart, setRequestEditStart] = useState<string>('')
  const [requestEditEnd, setRequestEditEnd] = useState<string>('')
  const [requestEditEquipmentId, setRequestEditEquipmentId] = useState<string>('')
  const [requestEditFromProjectId, setRequestEditFromProjectId] = useState<string>('')
  const [requestEditToProjectId, setRequestEditToProjectId] = useState<string>('')
  const [requestAutoResolve, setRequestAutoResolve] = useState(true)
  const [requestDecisionNote, setRequestDecisionNote] = useState('')

  const [quickRejectOpen, setQuickRejectOpen] = useState(false)
  const [quickRejectRequestId, setQuickRejectRequestId] = useState<number | null>(null)
  const [quickRejectNote, setQuickRejectNote] = useState('')

  const projectsById = useMemo(() => {
    const map = new Map<number, SeedProject>()
    projects.forEach((p) => map.set(p.id, p))
    return map
  }, [projects])

  const equipmentById = useMemo(() => {
    const map = new Map<number, EquipmentAsset>()
    fleet.forEach((e) => map.set(e.id, e))
    return map
  }, [fleet])

  const selectedEquipment = useMemo(() => {
    return fleet.find((e) => e.id === selectedEquipmentId) || null
  }, [fleet, selectedEquipmentId])

  const canConfirmAssign = useMemo(() => {
    if (!selectedEquipmentId) return false
    if (!assignProjectId) return false
    if (!assignStart) return false
    if (assignEnd) {
      const start = parseISO(assignStart)
      const end = parseISO(assignEnd)
      if (end.getTime() < start.getTime()) return false
    }
    return true
  }, [assignEnd, assignProjectId, assignStart, selectedEquipmentId])

  const canConfirmService = useMemo(() => {
    if (!selectedEquipmentId) return false
    if (!serviceStart) return false
    return true
  }, [selectedEquipmentId, serviceStart])

  const canConfirmMovement = useMemo(() => {
    if (!selectedEquipmentId) return false
    if (!movementStart) return false
    if (!movementToProjectId) return false
    if (movementFromProjectId && movementFromProjectId === movementToProjectId) return false
    return true
  }, [movementFromProjectId, movementStart, movementToProjectId, selectedEquipmentId])

  const canConfirmAddEquipment = useMemo(() => {
    if (!addEquipmentName.trim()) return false
    if (!addEquipmentType) return false
    return true
  }, [addEquipmentName, addEquipmentType])

  const pendingRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === 'PENDING')
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
  }, [requests])

  const historyRequests = useMemo(() => {
    return requests
      .filter((r) => r.status !== 'PENDING')
      .sort((a, b) => {
        const aTime = a.decidedAt ? new Date(a.decidedAt).getTime() : 0
        const bTime = b.decidedAt ? new Date(b.decidedAt).getTime() : 0
        return bTime - aTime
      })
  }, [requests])

  const selectedRequest = useMemo(() => {
    return requests.find((r) => r.id === selectedRequestId) || null
  }, [requests, selectedRequestId])

  const getActiveMovement = (equipmentId: number) => {
    const active = movements
      .filter((m) => m.equipmentId === equipmentId)
      .filter((m) => parseISO(m.startDate).getTime() <= today.getTime())
      .sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    return active[0] || null
  }

  const getNextMovement = (equipmentId: number) => {
    const future = movements
      .filter((m) => m.equipmentId === equipmentId)
      .filter((m) => parseISO(m.startDate).getTime() > today.getTime())
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())
    return future[0] || null
  }

  const getCurrentAssignment = (equipmentId: number) => {
    const active = assignments
      .filter((a) => a.equipmentId === equipmentId)
      .filter((a) => {
        const start = parseISO(a.startDate)
        const end = a.endDate ? parseISO(a.endDate) : addDays(today, 3650)
        return isBetween(today, start, end)
      })
      .sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
    return active[0] || null
  }

  const getNextService = (equipmentId: number) => {
    const future = services
      .filter((s) => s.equipmentId === equipmentId)
      .filter((s) => parseISO(s.scheduledEnd).getTime() >= today.getTime())
      .sort((a, b) => parseISO(a.scheduledStart).getTime() - parseISO(b.scheduledStart).getTime())
    return future[0] || null
  }

  const getActiveService = (equipmentId: number) => {
    return services
      .filter((s) => s.equipmentId === equipmentId)
      .find((s) => isBetween(today, parseISO(s.scheduledStart), parseISO(s.scheduledEnd)))
  }

  const getState = (equipmentId: number): EquipmentState => {
    const activeMovement = getActiveMovement(equipmentId)
    if (activeMovement) return 'MOVEMENT'
    const activeService = getActiveService(equipmentId)
    if (activeService) return 'MAINTENANCE'
    const assignment = getCurrentAssignment(equipmentId)
    if (assignment) return 'ASSIGNED'
    const nextMovement = getNextMovement(equipmentId)
    if (nextMovement) return 'MOVEMENT'
    const nextService = getNextService(equipmentId)
    if (nextService && parseISO(nextService.scheduledStart).getTime() > today.getTime()) return 'SERVICE_SCHEDULED'
    return 'AVAILABLE'
  }

  const getSearchProjectName = (equipmentId: number) => {
    const a = getCurrentAssignment(equipmentId)
    if (!a) return ''
    return projectsById.get(a.projectId)?.name || ''
  }

  const derivedRows = useMemo(() => {
    return fleet.map((e) => {
      const state = getState(e.id)
      const assignment = getCurrentAssignment(e.id)
      const nextService = getNextService(e.id)
      return {
        equipment: e,
        state,
        assignment,
        assignmentProject: assignment ? projectsById.get(assignment.projectId) || null : null,
        nextService,
      }
    })
  }, [fleet, assignments, services, projectsById])

  const contextRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return derivedRows.filter(({ equipment }) => {
      if (typeFilter !== 'ALL' && equipment.type !== typeFilter) return false
      if (!term) return true
      const projectName = getSearchProjectName(equipment.id)
      return (
        equipment.name.toLowerCase().includes(term) ||
        (equipment.serialCode || '').toLowerCase().includes(term) ||
        projectName.toLowerCase().includes(term)
      )
    })
  }, [derivedRows, search, typeFilter])

  const filteredRows = useMemo(() => {
    return contextRows.filter(({ state }) => {
      if (filter === 'ALL') return true
      return state === filter
    })
  }, [contextRows, filter])

  const visibleRows = useMemo(() => {
    return filteredRows.slice(0, Math.max(0, visibleCount))
  }, [filteredRows, visibleCount])

  const counts = useMemo(() => {
    const base: Record<EquipmentState, number> = { AVAILABLE: 0, ASSIGNED: 0, MAINTENANCE: 0, SERVICE_SCHEDULED: 0, MOVEMENT: 0 }
    contextRows.forEach((r) => { base[r.state] += 1 })
    return base
  }, [contextRows])

  const calendarWindow = useMemo(() => {
    const first = startOfMonth(calendarMonth)
    const last = endOfMonth(calendarMonth)
    const start = startOfWeek(first)
    const end = endOfWeek(last)
    const days: Date[] = []
    for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
      days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    }
    return { start, end, days }
  }, [calendarMonth])

  const calendarItemsByDay = useMemo(() => {
    type CalendarItem = {
      equipmentId: number
      equipmentName: string
      serialCode?: string | null
      assignmentProject?: string
      serviceKind?: 'SERVICE' | 'MAINTENANCE' | 'MOVEMENT'
      serviceLabel?: string
    }

    const windowStart = calendarWindow.start
    const windowEnd = calendarWindow.end
    const byDay = new Map<string, Map<number, CalendarItem>>()

    const allowedEquipmentIds = new Set(contextRows.map((r) => r.equipment.id))

    const upsert = (dayIso: string, equipmentId: number, patch: Partial<CalendarItem>) => {
      const dayMap = byDay.get(dayIso) || new Map<number, CalendarItem>()
      const existing = dayMap.get(equipmentId)
      const base: CalendarItem = existing || (() => {
        const eq = equipmentById.get(equipmentId)
        return {
          equipmentId,
          equipmentName: eq?.name || `Equipment #${equipmentId}`,
          serialCode: eq?.serialCode,
        }
      })()
      dayMap.set(equipmentId, { ...base, ...patch })
      byDay.set(dayIso, dayMap)
    }

    if (calendarShowAssignments) {
      assignments.forEach((a) => {
        if (!allowedEquipmentIds.has(a.equipmentId)) return
        const rangeStart = parseISO(a.startDate)
        const rangeEnd = a.endDate ? parseISO(a.endDate) : addDays(today, 3650)
        const start = rangeStart.getTime() > windowStart.getTime() ? rangeStart : windowStart
        const end = rangeEnd.getTime() < windowEnd.getTime() ? rangeEnd : windowEnd
        if (end.getTime() < start.getTime()) return

        const projectName = projectsById.get(a.projectId)?.name || `Project #${a.projectId}`
        for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
          upsert(isoDate(d), a.equipmentId, { assignmentProject: projectName })
        }
      })
    }

    if (calendarShowServices) {
      services.forEach((s) => {
        if (!allowedEquipmentIds.has(s.equipmentId)) return
        const rangeStart = parseISO(s.scheduledStart)
        const rangeEnd = parseISO(s.scheduledEnd)
        const start = rangeStart.getTime() > windowStart.getTime() ? rangeStart : windowStart
        const end = rangeEnd.getTime() < windowEnd.getTime() ? rangeEnd : windowEnd
        if (end.getTime() < start.getTime()) return

        const kind: CalendarItem['serviceKind'] = s.type === 'REPAIR' ? 'MAINTENANCE' : 'SERVICE'
        for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
          upsert(isoDate(d), s.equipmentId, { serviceKind: kind, serviceLabel: s.type })
        }
      })
    }

    if (calendarShowMovements) {
      movements.forEach((m) => {
        if (!allowedEquipmentIds.has(m.equipmentId)) return
        const rangeStart = parseISO(m.startDate)
        const start = rangeStart.getTime() > windowStart.getTime() ? rangeStart : windowStart
        const end = windowEnd
        if (end.getTime() < start.getTime()) return

        for (let d = start; d.getTime() <= end.getTime(); d = addDays(d, 1)) {
          upsert(isoDate(d), m.equipmentId, { serviceKind: 'MOVEMENT', serviceLabel: 'MOVEMENT' })
        }
      })
    }

    const flattened = new Map<string, CalendarItem[]>()
    byDay.forEach((m, dayIso) => {
      const arr = Array.from(m.values())
      arr.sort((a, b) => {
        const aRank = a.serviceKind ? 0 : a.assignmentProject ? 1 : 2
        const bRank = b.serviceKind ? 0 : b.assignmentProject ? 1 : 2
        if (aRank !== bRank) return aRank - bRank
        return a.equipmentName.localeCompare(b.equipmentName)
      })
      flattened.set(dayIso, arr)
    })

    return flattened
  }, [assignments, calendarShowAssignments, calendarShowMovements, calendarShowServices, calendarWindow, contextRows, equipmentById, movements, projectsById, services, today])

  const openDetails = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId)
    setDetailsOpen(true)
  }

  const openAssign = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId)
    setAssignProjectId('')
    setAssignStart(isoDate(today))
    setAssignEnd('')
    setAssignAutoResolve(true)
    setAssignOpen(true)
  }

  const openService = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId)
    setServiceType('ROUTINE')
    setServiceStart(isoDate(addDays(today, 14)))
    setServiceAutoResolve(true)
    setServiceNotes('')
    setServiceOpen(true)
  }

  const openMovement = (equipmentId: number) => {
    setSelectedEquipmentId(equipmentId)
    setMovementStart(isoDate(addDays(today, 1)))
    setMovementNotes('')
    setMovementAutoResolve(true)
    const current = getCurrentAssignment(equipmentId)
    setMovementFromProjectId(current ? String(current.projectId) : '')
    setMovementToProjectId('')
    setMovementOpen(true)
  }

  const getNextId = (items: { id: number }[]) => {
    return (items.reduce((max, i) => Math.max(max, i.id), 0) || 0) + 1
  }

  const openRequestReview = (requestId: number) => {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    setSelectedRequestId(requestId)
    setRequestEditStart(req.startDate)
    setRequestEditEnd(req.endDate ?? '')
    setRequestEditEquipmentId(req.equipmentId ? String(req.equipmentId) : '')
    setRequestEditFromProjectId(req.fromProjectId ? String(req.fromProjectId) : '')
    setRequestEditToProjectId(req.toProjectId ? String(req.toProjectId) : '')
    setRequestAutoResolve(true)
    setRequestDecisionNote(req.decisionNote ?? '')
    setRequestDrawerOpen(true)
  }

  const openQuickReject = (requestId: number, initialNote?: string) => {
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    setQuickRejectRequestId(requestId)
    setQuickRejectNote(initialNote || '')
    setQuickRejectOpen(true)
  }

  const openAddEquipment = () => {
    setAddEquipmentName('')
    setAddEquipmentType('EXCAVATOR')
    setAddEquipmentSerialCode('')
    setAddEquipmentStatus('AVAILABLE')
    setAddEquipmentOpen(true)
  }

  const openEditEquipment = (equipment: EquipmentAsset) => {
    setEditEquipmentId(equipment.id)
    setEditEquipmentName(equipment.name)
    setEditEquipmentType(equipment.type)
    setEditEquipmentSerialCode(equipment.serialCode || '')
    setEditEquipmentStatus('AVAILABLE')
    setEditEquipmentOpen(true)
  }

  const canConfirmEditEquipment = useMemo(() => {
    if (!editEquipmentId) return false
    if (!editEquipmentName.trim()) return false
    if (!editEquipmentType) return false
    return true
  }, [editEquipmentId, editEquipmentName, editEquipmentType])

  const confirmEditEquipment = () => {
    if (!canConfirmEditEquipment || !editEquipmentId) return

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment/${editEquipmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editEquipmentName.trim(),
            type: editEquipmentType,
            serialCode: editEquipmentSerialCode.trim() || null,
            status: editEquipmentStatus,
          }),
        })
        if (!response.ok) {
          const msg = await response.text()
          throw new Error(msg || `Failed to update equipment: ${response.statusText}`)
        }
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        setEditEquipmentOpen(false)
        toast.success('Equipment updated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update equipment')
      }
    })()
  }

  const deleteEquipment = (equipment: EquipmentAsset) => {
    const confirmed = window.confirm(`Delete equipment "${equipment.name}"?`)
    if (!confirmed) return

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment/${equipment.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const msg = await response.text()
          throw new Error(msg || `Failed to delete equipment: ${response.statusText}`)
        }
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        toast.success('Equipment deleted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete equipment')
      }
    })()
  }

  const confirmAddEquipment = () => {
    if (!canConfirmAddEquipment) return

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addEquipmentName.trim(),
            type: addEquipmentType,
            serialCode: addEquipmentSerialCode.trim() || null,
            status: addEquipmentStatus,
          }),
        })
        if (!response.ok) {
          const msg = await response.text()
          throw new Error(msg || `Failed to create equipment: ${response.statusText}`)
        }
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        setAddEquipmentOpen(false)
        toast.success('Equipment created')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create equipment')
      }
    })()
  }

  const confirmQuickReject = () => {
    if (!quickRejectRequestId) return
    const note = quickRejectNote.trim()
    if (!note) {
      toast.error('Add a note before rejecting')
      return
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment/requests/${quickRejectRequestId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisionNote: note }),
        })
        if (!response.ok) throw new Error(`Reject failed: ${response.statusText}`)
        await reloadRequests()
        setQuickRejectOpen(false)
        setQuickRejectRequestId(null)
        if (selectedRequestId === quickRejectRequestId) {
          setRequestDrawerOpen(false)
          setSelectedRequestId(null)
        }
        toast.success('Request rejected')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Reject failed')
      }
    })()
  }

  const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
    return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime()
  }

  const findOverlappingAssignment = (equipmentId: number, startIso: string, endIso: string) => {
    const start = parseISO(startIso)
    const end = parseISO(endIso)
    return assignments
      .filter((a) => a.equipmentId === equipmentId)
      .find((a) => {
        const aStart = parseISO(a.startDate)
        const aEnd = a.endDate ? parseISO(a.endDate) : addDays(today, 3650)
        return rangesOverlap(aStart, aEnd, start, end)
      })
  }

  const findOverlappingService = (equipmentId: number, startIso: string, endIso: string) => {
    const start = parseISO(startIso)
    const end = parseISO(endIso)
    return services
      .filter((s) => s.equipmentId === equipmentId)
      .find((s) => {
        const sStart = parseISO(s.scheduledStart)
        const sEnd = parseISO(s.scheduledEnd)
        return rangesOverlap(sStart, sEnd, start, end)
      })
  }

  const approveSelectedRequest = () => {
    if (!selectedRequest) return

    if (!requestEditStart) {
      toast.error('Select start date')
      return
    }

    if (!requestEditEquipmentId) {
      toast.error('Select equipment to approve')
      return
    }

    if (selectedRequest.type === 'ASSIGNMENT') {
      if (!requestEditEnd) {
        toast.error('Select end date')
        return
      }
      const start = parseISO(requestEditStart)
      const end = parseISO(requestEditEnd)
      if (end.getTime() < start.getTime()) {
        toast.error('End date must be after start date')
        return
      }

      const equipmentId = Number(requestEditEquipmentId)
      void (async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/equipment/requests/${selectedRequest.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              equipmentId,
              startDate: requestEditStart,
              endDate: requestEditEnd,
              decisionNote: requestDecisionNote.trim() || null,
              autoResolve: requestAutoResolve,
            }),
          })
          if (!response.ok) throw new Error(`Approve failed: ${response.statusText}`)
          await Promise.all([reloadRequests(), reloadFleetEvents(), reloadFleet()])
          setRequestDrawerOpen(false)
          toast.success('Request approved')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Approve failed')
        }
      })()
      return
    }

    if (selectedRequest.type === 'MOVEMENT') {
      if (!requestEditToProjectId) {
        toast.error('Select destination project')
        return
      }
      const equipmentId = Number(requestEditEquipmentId)
      const fromProjectId = requestEditFromProjectId ? Number(requestEditFromProjectId) : null
      const toProjectId = Number(requestEditToProjectId)

      void (async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/equipment/requests/${selectedRequest.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              equipmentId,
              startDate: requestEditStart,
              fromProjectId,
              toProjectId,
              decisionNote: requestDecisionNote.trim() || null,
              autoResolve: requestAutoResolve,
            }),
          })
          if (!response.ok) throw new Error(`Approve failed: ${response.statusText}`)
          await Promise.all([reloadRequests(), reloadFleetEvents(), reloadFleet()])
          setRequestDrawerOpen(false)
          toast.success('Movement approved')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Approve failed')
        }
      })()
      return
    }
  }

  const resolveAssignmentOverlapWithService = (equipmentId: number, serviceStartIso: string) => {
    const serviceStart = parseISO(serviceStartIso)
    setAssignments((prev) => {
      return prev.map((a) => {
        if (a.equipmentId !== equipmentId) return a
        const aStart = parseISO(a.startDate)
        const aEnd = a.endDate ? parseISO(a.endDate) : addDays(today, 3650)
        const overlaps = serviceStart.getTime() >= aStart.getTime() && serviceStart.getTime() <= aEnd.getTime()
        if (!overlaps) return a

        const newEnd = addDays(serviceStart, -1)
        if (newEnd.getTime() < aStart.getTime()) {
          return { ...a, endDate: a.startDate }
        }
        return { ...a, endDate: isoDate(newEnd) }
      })
    })
  }

  const confirmAssign = () => {
    if (!selectedEquipmentId) return
    if (!assignProjectId) {
      toast.error('Select a project')
      return
    }

    const projectId = Number(assignProjectId)
    const start = parseISO(assignStart)
    const end = assignEnd ? parseISO(assignEnd) : null
    if (end && end.getTime() < start.getTime()) {
      toast.error('End date must be after start date')
      return
    }

    const checkEnd = end || addDays(today, 3650)
    const movementConflict = movements
      .filter((m) => m.equipmentId === selectedEquipmentId)
      .find((m) => parseISO(m.startDate).getTime() <= checkEnd.getTime())
    if (movementConflict) {
      toast.error('Cannot assign: equipment is in movement')
      return
    }

    const nextService = getNextService(selectedEquipmentId)
    const hasFutureService = nextService && parseISO(nextService.scheduledStart).getTime() > today.getTime()
    const willOverlapService = hasFutureService && end
      ? parseISO(nextService!.scheduledStart).getTime() <= end.getTime()
      : hasFutureService && !end

    const finalEnd = (() => {
      if (!willOverlapService || !hasFutureService) return assignEnd ? isoDate(end!) : null
      if (!assignAutoResolve) return assignEnd ? isoDate(end!) : null
      const autoEnd = addDays(parseISO(nextService!.scheduledStart), -1)
      return isoDate(autoEnd)
    })()

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipmentId}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            startDate: isoDate(start),
            endDate: finalEnd,
            autoResolve: assignAutoResolve,
          }),
        })
        if (!response.ok) throw new Error(`Assignment failed: ${response.statusText}`)
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        setAssignOpen(false)
        toast.success('Assignment created')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Assignment failed')
      }
    })()
  }

  const confirmService = () => {
    if (!selectedEquipmentId) return
    const start = parseISO(serviceStart)
    const end = addDays(start, 7)

    const movementConflict = movements
      .filter((m) => m.equipmentId === selectedEquipmentId)
      .find((m) => parseISO(m.startDate).getTime() <= end.getTime())
    if (movementConflict) {
      toast.error('Cannot schedule service: equipment is in movement')
      return
    }

    const currentAssignment = getCurrentAssignment(selectedEquipmentId)
    const wouldOverlap = !!currentAssignment && (() => {
      const aStart = parseISO(currentAssignment.startDate)
      const aEnd = currentAssignment.endDate ? parseISO(currentAssignment.endDate) : addDays(today, 3650)
      return start.getTime() >= aStart.getTime() && start.getTime() <= aEnd.getTime()
    })()

    if (wouldOverlap && serviceAutoResolve) {
      resolveAssignmentOverlapWithService(selectedEquipmentId, isoDate(start))
    }

    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipmentId}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: serviceType,
            scheduledStart: isoDate(start),
            scheduledEnd: isoDate(end),
            notes: serviceNotes.trim() || null,
            autoResolve: serviceAutoResolve,
          }),
        })
        if (!response.ok) throw new Error(`Service failed: ${response.statusText}`)
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        setServiceOpen(false)
        toast.success('Service scheduled')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Service failed')
      }
    })()
  }

  const confirmMovement = () => {
    if (!selectedEquipmentId) return
    if (!movementToProjectId) {
      toast.error('Select destination project')
      return
    }

    void (async () => {
      try {
        const toProjectId = Number(movementToProjectId)
        const fromProjectId = movementFromProjectId ? Number(movementFromProjectId) : null
        const response = await fetch(`${API_BASE_URL}/equipment/${selectedEquipmentId}/movements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: movementStart,
            fromProjectId,
            toProjectId,
            notes: movementNotes.trim() || null,
            autoResolve: movementAutoResolve,
          }),
        })
        if (!response.ok) {
          const msg = await response.text()
          throw new Error(msg || `Movement failed: ${response.statusText}`)
        }
        await Promise.all([reloadFleetEvents(), reloadFleet()])
        setMovementOpen(false)
        toast.success('Movement scheduled')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Movement failed')
      }
    })()
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipment</h1>
          <p className="text-sm text-slate-600">
            Fleet availability, assignments, and service windows.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Table view"
            >
              <Table className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Cards view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
          </div>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => setCalendarOpen(true)}>
            <CalendarDays className="h-4 w-4" />
            Month calendar
          </Button>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => setRequestsOpen(true)}>
            <Inbox className="h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                {pendingRequests.length}
              </span>
            )}
          </Button>

          <Button size="sm" className="hidden sm:flex" onClick={openAddEquipment}>
            <Plus className="h-4 w-4 mr-1" />
            Add equipment
          </Button>
          <Button size="sm" className="sm:hidden p-2" title="Add equipment" onClick={openAddEquipment}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search by name, serial, or project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'ALL' | EquipmentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="TRUCK">Truck</SelectItem>
                  <SelectItem value="VAN">Van</SelectItem>
                  <SelectItem value="FORKLIFT">Forklift</SelectItem>
                  <SelectItem value="MANLIFT">Manlift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[220px]">
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All states ({contextRows.length})</SelectItem>
                  <SelectItem value="AVAILABLE">Available ({counts.AVAILABLE})</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned ({counts.ASSIGNED})</SelectItem>
                  <SelectItem value="SERVICE_SCHEDULED">Service scheduled ({counts.SERVICE_SCHEDULED})</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance ({counts.MAINTENANCE})</SelectItem>
                  <SelectItem value="MOVEMENT">Movement ({counts.MOVEMENT})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-slate-600">
        <div>
          Showing <span className="font-medium text-slate-900">{Math.min(visibleCount, filteredRows.length)}</span> of{' '}
          <span className="font-medium text-slate-900">{filteredRows.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {filteredRows.length > visibleCount && (
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + 24)}>
              Load more
            </Button>
          )}
          {filteredRows.length > 24 && visibleCount !== filteredRows.length && (
            <Button variant="outline" size="sm" onClick={() => setVisibleCount(filteredRows.length)}>
              Show all
            </Button>
          )}
          {visibleCount !== 24 && (
            <Button variant="outline" size="sm" onClick={() => setVisibleCount(24)}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
          <Card className="min-h-[420px]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-4 py-3 font-medium">Equipment</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">State</th>
                      <th className="px-4 py-3 font-medium">Assignment</th>
                      <th className="px-4 py-3 font-medium">Next service</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ equipment, state, assignmentProject, assignment, nextService }) => (
                      <tr
                        key={equipment.id}
                        className="border-b hover:bg-slate-50 cursor-pointer"
                        onClick={() => openDetails(equipment.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{equipment.name}</div>
                          <div className="text-xs text-slate-500">{equipment.serialCode || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{equipment.type}</td>
                        <td className="px-4 py-3">
                          <Badge variant={stateBadge[state].variant}>{stateBadge[state].label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {assignmentProject ? (
                            <div>
                              <div className="font-medium">{assignmentProject.name}</div>
                              <div className="text-xs text-slate-500">Since {new Date(assignment!.startDate).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                        )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {nextService ? (
                            <div>
                              <div className="font-medium">{nextService.type}</div>
                              <div className="text-xs text-slate-500">{formatRange(nextService.scheduledStart, nextService.scheduledEnd)}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openAssign(equipment.id)} className="gap-2">
                              <Briefcase className="h-4 w-4" />
                              Assign
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openService(equipment.id)} className="gap-2">
                              <Wrench className="h-4 w-4" />
                              Service
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMovement(equipment.id)} className="gap-2">
                              <ArrowRightLeft className="h-4 w-4" />
                              Move
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditEquipment(equipment)} className="h-9 w-9 p-0" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteEquipment(equipment)} className="h-9 w-9 p-0 text-rose-600 hover:text-rose-700" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleRows.map(({ equipment, state, assignmentProject, assignment, nextService }) => (
              <Card key={equipment.id} className="h-full hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetails(equipment.id)}>
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{equipment.name}</h3>
                      <p className="text-sm text-slate-600">{equipment.serialCode || '—'}</p>
                    </div>
                    <Badge variant={stateBadge[state].variant}>{stateBadge[state].label}</Badge>
                  </div>

                  <div className="text-sm text-slate-600 mb-3">Type: <span className="font-medium text-slate-900">{equipment.type}</span></div>

                  {assignmentProject && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-600">Assigned to:</p>
                      <p className="font-medium">{assignmentProject.name}</p>
                      {assignment?.startDate && (
                        <p className="text-xs text-slate-500">Since {new Date(assignment.startDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}

                  {nextService && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-600">Next service:</p>
                      <p className="font-medium">{nextService.type}</p>
                      <p className="text-xs text-slate-500">{formatRange(nextService.scheduledStart, nextService.scheduledEnd)}</p>
                    </div>
                  )}

                  <div className="mt-auto pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => openAssign(equipment.id)}>
                      <Briefcase className="h-4 w-4" />
                      Assign
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openService(equipment.id)}>
                      <Wrench className="h-4 w-4" />
                      Service
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openMovement(equipment.id)}>
                      <ArrowRightLeft className="h-4 w-4" />
                      Move
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => openEditEquipment(equipment)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-rose-600 hover:text-rose-700" onClick={() => deleteEquipment(equipment)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {filteredRows.length === 0 && (
        <div className="text-center py-10 text-sm text-slate-500">
          No equipment in this status.
        </div>
      )}

      {editEquipmentOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditEquipmentOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Edit equipment</div>
                  <div className="font-semibold text-slate-900">Equipment Details</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setEditEquipmentOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={editEquipmentName} onChange={(e) => setEditEquipmentName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={editEquipmentType} onValueChange={(v) => setEditEquipmentType(v as EquipmentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRUCK">Truck</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="FORKLIFT">Forklift</SelectItem>
                      <SelectItem value="MANLIFT">Manlift</SelectItem>
                      <SelectItem value="EXCAVATOR">Excavator</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Serial Code</Label>
                  <Input value={editEquipmentSerialCode} onChange={(e) => setEditEquipmentSerialCode(e.target.value)} placeholder="Optional" />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editEquipmentStatus} onValueChange={(v) => setEditEquipmentStatus(v as EquipmentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="OUT_OF_SERVICE">Out of service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditEquipmentOpen(false)}>Cancel</Button>
                <Button onClick={confirmEditEquipment} disabled={!canConfirmEditEquipment}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetContent className="w-full sm:w-[980px] sm:max-w-[980px] p-0" side="right">
          <div className="px-6 py-5 border-b border-slate-100">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center justify-between gap-3">
                <span>Fleet calendar</span>
                <Badge variant="outline">Month view</Badge>
              </SheetTitle>
              <div className="text-sm text-slate-500">Assignments and service windows across the fleet</div>
            </SheetHeader>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[220px] text-center font-semibold text-slate-900">
                  {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarMonth((prev) => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(startOfMonth(today))}>
                  Today
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={calendarShowAssignments}
                    onChange={(e) => setCalendarShowAssignments(e.target.checked)}
                  />
                  Assignments
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={calendarShowServices}
                    onChange={(e) => setCalendarShowServices(e.target.checked)}
                  />
                  Services / maintenance
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={calendarShowMovements}
                    onChange={(e) => setCalendarShowMovements(e.target.checked)}
                  />
                  Movements
                </label>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="bg-white px-3 py-2 text-xs font-medium text-slate-500">
                  {d}
                </div>
              ))}

              {calendarWindow.days.map((day) => {
                const dayIso = isoDate(day)
                const items = calendarItemsByDay.get(dayIso) || []
                const inMonth = isSameMonth(day, calendarMonth)
                const isToday = dayIso === isoDate(today)
                const visible = items.slice(0, 8)
                const remaining = items.length - visible.length

                return (
                  <div key={dayIso} className={`bg-white p-2 min-h-[140px] ${inMonth ? '' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-medium ${inMonth ? 'text-slate-700' : 'text-slate-400'}`}>{day.getDate()}</div>
                      {isToday && <div className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white">Today</div>}
                    </div>

                    <div className="mt-2 space-y-1">
                      {visible.map((it) => {
                        const chipClass = it.serviceKind === 'MAINTENANCE'
                          ? 'bg-rose-100 text-rose-900 border-rose-200'
                          : it.serviceKind === 'SERVICE'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : it.serviceKind === 'MOVEMENT'
                              ? 'bg-blue-100 text-blue-900 border-blue-200'
                            : it.assignmentProject
                              ? 'bg-slate-100 text-slate-900 border-slate-200'
                              : 'bg-white text-slate-600 border-slate-200'

                        const title = it.serviceKind
                          ? `${it.equipmentName} • ${it.serviceKind === 'MOVEMENT' ? 'Movement' : it.serviceKind === 'MAINTENANCE' ? 'Maintenance' : 'Service'} (${it.serviceLabel || ''})`
                          : it.assignmentProject
                            ? `${it.equipmentName} • ${it.assignmentProject}`
                            : it.equipmentName

                        return (
                          <button
                            key={`${dayIso}-${it.equipmentId}`}
                            className={`w-full text-left rounded border px-2 py-1 text-[11px] leading-tight ${chipClass}`}
                            title={title}
                            onClick={() => {
                              setCalendarOpen(false)
                              openDetails(it.equipmentId)
                            }}
                          >
                            <div className="truncate font-medium">{shortEquipmentLabel(it.equipmentName)}</div>
                          </button>
                        )
                      })}
                      {remaining > 0 && (
                        <div className="text-[11px] text-slate-500">+{remaining} more</div>
                      )}
                      {items.length === 0 && <div className="text-[11px] text-slate-300">—</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-100 border border-slate-200" />Project assignment</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-100 border border-amber-200" />Service</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-100 border border-rose-200" />Maintenance</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={requestsOpen} onOpenChange={setRequestsOpen}>
        <SheetContent className="w-full sm:w-[720px] sm:max-w-[720px] p-0" side="right">
          <div className="px-6 py-5 border-b border-slate-100">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center justify-between gap-3">
                <span>Equipment requests</span>
                <Badge variant="outline">{pendingRequests.length} pending</Badge>
              </SheetTitle>
              <div className="text-sm text-slate-500">Review and decide requests before they become assignments</div>
            </SheetHeader>
          </div>

          <div className="px-6 py-4">
            <Tabs value={requestsTab} onValueChange={(v) => setRequestsTab(v as 'pending' | 'history')}>
              <TabsList className="w-full">
                <TabsTrigger value="pending" className="flex-1">Pending</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4 space-y-3">
                {pendingRequests.length === 0 ? (
                  <div className="text-sm text-slate-500">No pending requests right now.</div>
                ) : (
                  pendingRequests.map((r) => {
                    const projectName = projectsById.get(r.projectId)?.name || `Project #${r.projectId}`
                    return (
                      <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">Pending</Badge>
                              <div className="font-medium text-slate-900">{r.type === 'MOVEMENT' ? 'Movement' : (r.requestedType || '—')}</div>
                              <div className="text-sm text-slate-600">{projectName}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{formatRange(r.startDate, r.endDate)}</div>
                            <div className="text-xs text-slate-500 mt-1">Requested by {r.requestedBy?.name || r.requestedBy?.username || '—'}</div>
                            {r.notes && <div className="text-sm text-slate-700 mt-2">{r.notes}</div>}
                          </div>
                          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openRequestReview(r.id)}>
                              Review
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => openQuickReject(r.id)}>
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-3">
                {historyRequests.length === 0 ? (
                  <div className="text-sm text-slate-500">No decisions yet.</div>
                ) : (
                  historyRequests.slice(0, 10).map((r) => {
                    const projectName = projectsById.get(r.projectId)?.name || `Project #${r.projectId}`
                    const statusBadge: { variant: 'success' | 'secondary' | 'warning' | 'outline'; label: string } =
                      r.status === 'APPROVED'
                        ? { variant: 'success', label: 'Approved' }
                        : r.status === 'REJECTED'
                          ? { variant: 'warning', label: 'Rejected' }
                          : { variant: 'outline', label: r.status }

                    return (
                      <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                              <div className="font-medium text-slate-900">{r.type === 'MOVEMENT' ? 'Movement' : (r.requestedType || '—')}</div>
                              <div className="text-sm text-slate-600">{projectName}</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{formatRange(r.startDate, r.endDate)}</div>
                            <div className="text-xs text-slate-500 mt-1">Requested by {r.requestedBy?.name || r.requestedBy?.username || '—'}</div>
                            {r.equipmentId && (
                              <div className="text-xs text-slate-500 mt-1">Assigned: {equipmentById.get(r.equipmentId)?.name || `Equipment #${r.equipmentId}`}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openRequestReview(r.id)}>
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Details Drawer */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="w-[520px] sm:max-w-[520px] p-0" side="right">
            <div className="px-6 py-5 border-b border-slate-100">
              <SheetHeader className="space-y-1">
                <SheetTitle className="flex items-center justify-between gap-3">
                  <span>{selectedEquipment?.name || 'Equipment'}</span>
                  {selectedEquipmentId && (
                    <Badge variant={stateBadge[getState(selectedEquipmentId)].variant}>{stateBadge[getState(selectedEquipmentId)].label}</Badge>
                  )}
                </SheetTitle>
                <div className="text-sm text-slate-500">{selectedEquipment?.serialCode || '—'}</div>
              </SheetHeader>
            </div>

            <div className="px-6 py-4">
              <Tabs defaultValue="overview">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {selectedEquipmentId && (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-xs text-slate-500 mb-2">Current assignment</div>
                        {getCurrentAssignment(selectedEquipmentId) ? (
                          (() => {
                            const a = getCurrentAssignment(selectedEquipmentId)!
                            const p = projectsById.get(a.projectId)
                            return (
                              <div>
                                <div className="font-medium">{p?.name || `Project #${a.projectId}`}</div>
                                <div className="text-sm text-slate-600">Since {new Date(a.startDate).toLocaleDateString()}</div>
                                {a.endDate && (
                                  <div className="text-xs text-slate-500">Ends {new Date(a.endDate).toLocaleDateString()}</div>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          <div className="text-sm text-slate-500">Not assigned</div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-xs text-slate-500 mb-2">Next service</div>
                        {getNextService(selectedEquipmentId) ? (
                          (() => {
                            const s = getNextService(selectedEquipmentId)!
                            return (
                              <div>
                                <div className="font-medium">{s.type}</div>
                                <div className="text-sm text-slate-600">{formatRange(s.scheduledStart, s.scheduledEnd)}</div>
                                {s.notes && <div className="text-xs text-slate-500 mt-1">{s.notes}</div>}
                              </div>
                            )
                          })()
                        ) : (
                          <div className="text-sm text-slate-500">No service scheduled</div>
                        )}
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-xs text-slate-500 mb-2">Movement</div>
                        {(() => {
                          const equipmentMovements = movements.filter(m => m.equipmentId === selectedEquipmentId)
                          const activeMovement = equipmentMovements.find(m => {
                            const start = parseISO(m.startDate)
                            return start.getTime() <= today.getTime()
                          })
                          const nextMovement = equipmentMovements
                            .filter(m => {
                              const start = parseISO(m.startDate)
                              return start.getTime() > today.getTime()
                            })
                            .sort((a: MovementEvent, b: MovementEvent) => 
                              parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
                            )[0]
                          
                          if (activeMovement) {
                            return (
                              <div>
                                <div className="font-medium">In Movement</div>
                                <div className="text-sm text-slate-600">
                                  {activeMovement.fromProjectId && projectsById.get(activeMovement.fromProjectId)?.name} → 
                                  {activeMovement.toProjectId && projectsById.get(activeMovement.toProjectId)?.name || 'Unknown destination'}
                                </div>
                                <div className="text-xs text-slate-500">Since {new Date(activeMovement.startDate).toLocaleDateString()}</div>
                                {activeMovement.notes && <div className="text-xs text-slate-500 mt-1">{activeMovement.notes}</div>}
                              </div>
                            )
                          }
                          
                          if (nextMovement) {
                            return (
                              <div>
                                <div className="font-medium">Scheduled Movement</div>
                                <div className="text-sm text-slate-600">
                                  {nextMovement.fromProjectId && projectsById.get(nextMovement.fromProjectId)?.name} → 
                                  {nextMovement.toProjectId && projectsById.get(nextMovement.toProjectId)?.name || 'Unknown destination'}
                                </div>
                                <div className="text-xs text-slate-500">On {new Date(nextMovement.startDate).toLocaleDateString()}</div>
                                {nextMovement.notes && <div className="text-xs text-slate-500 mt-1">{nextMovement.notes}</div>}
                              </div>
                            )
                          }
                          
                          return <div className="text-sm text-slate-500">No movement scheduled</div>
                        })()}
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2" onClick={() => openAssign(selectedEquipmentId)}>
                          <Briefcase className="h-4 w-4" />
                          Assign
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2" onClick={() => openService(selectedEquipmentId)}>
                          <Wrench className="h-4 w-4" />
                          Schedule service
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  {selectedEquipmentId ? (
                    (() => {
                      const events = [
                        ...assignments
                          .filter((a) => a.equipmentId === selectedEquipmentId)
                          .map((a) => ({
                            kind: 'ASSIGNMENT' as const,
                            date: a.startDate,
                            title: projectsById.get(a.projectId)?.name || `Project #${a.projectId}`,
                            subtitle: a.endDate ? `${new Date(a.startDate).toLocaleDateString()} → ${new Date(a.endDate).toLocaleDateString()}` : `Since ${new Date(a.startDate).toLocaleDateString()}`,
                          })),
                        ...services
                          .filter((s) => s.equipmentId === selectedEquipmentId)
                          .map((s) => ({
                            kind: 'SERVICE' as const,
                            date: s.scheduledStart,
                            title: `${s.type} service`,
                            subtitle: formatRange(s.scheduledStart, s.scheduledEnd),
                            notes: s.notes,
                          })),
                        ...movements
                          .filter((m) => m.equipmentId === selectedEquipmentId)
                          .map((m) => ({
                            kind: 'MOVEMENT' as const,
                            date: m.startDate,
                            title: 'Movement',
                            subtitle: (() => {
                              const from = m.fromProjectId ? projectsById.get(m.fromProjectId)?.name : 'Unknown'
                              const to = m.toProjectId ? projectsById.get(m.toProjectId)?.name : 'Unknown'
                              return `${from} → ${to}`
                            })(),
                            notes: m.notes,
                          })),
                      ].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

                      if (events.length === 0) {
                        return <div className="text-sm text-slate-500">No history yet</div>
                      }

                      return (
                        <div className="space-y-3">
                          {events.map((ev, idx) => (
                            <div key={idx} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                                ev.kind === 'SERVICE' ? 'bg-yellow-100 text-yellow-700' : 
                                ev.kind === 'MOVEMENT' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {ev.kind === 'SERVICE' ? <Wrench className="h-4 w-4" /> : 
                                 ev.kind === 'MOVEMENT' ? <ArrowRightLeft className="h-4 w-4" /> :
                                 <Briefcase className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium text-sm text-slate-900 truncate">{ev.title}</div>
                                  <Badge variant={
                                    ev.kind === 'SERVICE' ? 'warning' : 
                                    ev.kind === 'MOVEMENT' ? 'default' :
                                    'secondary'
                                  }>
                                    {ev.kind === 'SERVICE' ? 'Service' : 
                                     ev.kind === 'MOVEMENT' ? 'Movement' :
                                     'Assignment'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{ev.subtitle}</div>
                                {'notes' in ev && ev.notes && (
                                  <div className="text-xs text-slate-600 mt-2">{ev.notes}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
      </Sheet>

      <Sheet
        open={requestDrawerOpen}
        onOpenChange={(open) => {
          setRequestDrawerOpen(open)
          if (!open) {
            setSelectedRequestId(null)
          }
        }}
      >
        <SheetContent className="w-[560px] sm:max-w-[560px] p-0" side="right">
          <div className="px-6 py-5 border-b border-slate-100">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center justify-between gap-3">
                <span>Equipment request</span>
                {selectedRequest && (
                  <Badge variant={selectedRequest.status === 'APPROVED' ? 'success' : selectedRequest.status === 'REJECTED' ? 'warning' : 'outline'}>
                    {selectedRequest.status}
                  </Badge>
                )}
              </SheetTitle>
              {selectedRequest && (
                <div className="text-sm text-slate-500">
                  {projectsById.get(selectedRequest.projectId)?.name || `Project #${selectedRequest.projectId}`}
                </div>
              )}
            </SheetHeader>
          </div>

          <div className="px-6 py-4 space-y-4">
            {selectedRequest ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                  <div className="text-xs text-slate-500">Requested by</div>
                  <div className="font-medium text-slate-900">{selectedRequest.requestedBy?.name || selectedRequest.requestedBy?.username || '—'}</div>
                  <div className="text-xs text-slate-500 mt-2">Requested type</div>
                  <div className="font-medium text-slate-900">{selectedRequest.type === 'MOVEMENT' ? 'Movement' : (selectedRequest.requestedType || '—')}</div>
                  {selectedRequest.notes && (
                    <div className="text-sm text-slate-700 mt-2">{selectedRequest.notes}</div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={requestEditStart}
                      onChange={(e) => setRequestEditStart(e.target.value)}
                      disabled={selectedRequest.status !== 'PENDING'}
                    />
                  </div>
                  {selectedRequest.type === 'ASSIGNMENT' ? (
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <Input
                        type="date"
                        value={requestEditEnd}
                        onChange={(e) => setRequestEditEnd(e.target.value)}
                        disabled={selectedRequest.status !== 'PENDING'}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <Input type="date" value={''} disabled />
                      <div className="text-xs text-slate-500">Movement has no end date.</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Choose equipment (optional until approval)</Label>
                  <Select
                    value={requestEditEquipmentId}
                    onValueChange={setRequestEditEquipmentId}
                    disabled={selectedRequest.status !== 'PENDING'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {fleet
                        .filter((e) => (selectedRequest.type === 'ASSIGNMENT' ? e.type === selectedRequest.requestedType : true))
                        .map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-slate-500">
                    Field requests don’t need an equipment ID. Coordinator selects it when approving.
                  </div>
                </div>

                {selectedRequest.type === 'MOVEMENT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>From project</Label>
                      <Select
                        value={requestEditFromProjectId}
                        onValueChange={setRequestEditFromProjectId}
                        disabled={selectedRequest.status !== 'PENDING'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To project</Label>
                      <Select
                        value={requestEditToProjectId}
                        onValueChange={setRequestEditToProjectId}
                        disabled={selectedRequest.status !== 'PENDING'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedRequest.type === 'ASSIGNMENT' && selectedRequest.status === 'PENDING' && requestEditEquipmentId && requestEditStart && requestEditEnd && (() => {
                  const equipmentId = Number(requestEditEquipmentId)
                  const overlap = findOverlappingAssignment(equipmentId, requestEditStart, requestEditEnd)
                  const service = findOverlappingService(equipmentId, requestEditStart, requestEditEnd)
                  const projectName = overlap ? (projectsById.get(overlap.projectId)?.name || `Project #${overlap.projectId}`) : null
                  if (!overlap && !service) return null
                  if (service) {
                    return (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <div className="text-sm font-medium text-rose-900">Unavailable window</div>
                        <div className="text-xs text-rose-800 mt-1">Conflicts with {service.type} ({formatRange(service.scheduledStart, service.scheduledEnd)})</div>
                        <div className="text-xs text-rose-800 mt-1">Pick different equipment or adjust dates.</div>
                      </div>
                    )
                  }
                  return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-sm font-medium text-amber-900">Conflict detected</div>
                      <div className="text-xs text-amber-800 mt-1">Overlaps existing assignment for {projectName}.</div>
                      <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={requestAutoResolve}
                          onChange={(e) => setRequestAutoResolve(e.target.checked)}
                          className="mt-1"
                        />
                        <span>Auto-resolve by ending the overlapping assignment before this request starts (beta)</span>
                      </label>
                    </div>
                  )
                })()}

                <div className="space-y-2">
                  <Label>Decision note (optional)</Label>
                  <Input
                    value={requestDecisionNote}
                    onChange={(e) => setRequestDecisionNote(e.target.value)}
                    placeholder="Add a note for the field manager..."
                    disabled={selectedRequest.status !== 'PENDING'}
                  />
                </div>

                {selectedRequest.status !== 'PENDING' && selectedRequest.decisionNote && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Decision note</div>
                    <div className="text-sm text-slate-700 mt-1 whitespace-pre-line">{selectedRequest.decisionNote}</div>
                  </div>
                )}

                {selectedRequest.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="destructive" onClick={() => openQuickReject(selectedRequest.id, requestDecisionNote)} className="gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button onClick={approveSelectedRequest} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Approve & create assignment
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a request.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {quickRejectOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setQuickRejectOpen(false)
              setQuickRejectRequestId(null)
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Reject request</div>
                  <div className="font-semibold text-slate-900">Add a note for the field manager</div>
                </div>
                <button
                  className="p-2 rounded hover:bg-slate-100"
                  onClick={() => {
                    setQuickRejectOpen(false)
                    setQuickRejectRequestId(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="space-y-2">
                  <Label>Note</Label>
                  <textarea
                    value={quickRejectNote}
                    onChange={(e) => setQuickRejectNote(e.target.value)}
                    className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                    placeholder="Explain why you're rejecting (availability, different dates, different type, etc.)"
                  />
                </div>
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickRejectOpen(false)
                    setQuickRejectRequestId(null)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmQuickReject} className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Confirm reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAssignOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Assign equipment</div>
                  <div className="font-semibold text-slate-900">{selectedEquipment.name}</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setAssignOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.lifecycleStage || '—'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End date (optional)</Label>
                    <Input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} />
                  </div>
                </div>

                {selectedEquipmentId && (() => {
                  const ns = getNextService(selectedEquipmentId)
                  if (!ns) return null
                  const serviceStart = parseISO(ns.scheduledStart)
                  const end = assignEnd ? parseISO(assignEnd) : null
                  const wouldOverlap = serviceStart.getTime() > today.getTime() && (!end || serviceStart.getTime() <= end.getTime())
                  if (!wouldOverlap) return null

                  return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-sm font-medium text-amber-900">Heads up: service already scheduled</div>
                      <div className="text-xs text-amber-800 mt-1">{ns.type} • {formatRange(ns.scheduledStart, ns.scheduledEnd)}</div>
                      <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={assignAutoResolve}
                          onChange={(e) => setAssignAutoResolve(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Auto-end assignment the day before service starts (recommended for beta)
                        </span>
                      </label>
                    </div>
                  )
                })()}
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                <Button onClick={confirmAssign} className="gap-2" disabled={!canConfirmAssign}>
                  <Briefcase className="h-4 w-4" />
                  Confirm assignment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {serviceOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setServiceOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Schedule service</div>
                  <div className="font-semibold text-slate-900">{selectedEquipment.name}</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setServiceOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Service type</Label>
                    <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceEvent['type'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROUTINE">Routine</SelectItem>
                        <SelectItem value="INSPECTION">Inspection</SelectItem>
                        <SelectItem value="REPAIR">Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input type="date" value={serviceStart} onChange={(e) => setServiceStart(e.target.value)} />
                    <div className="text-xs text-slate-500">Defaults to two weeks out</div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium text-slate-900">Unavailable window</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {formatRange(serviceStart, isoDate(addDays(parseISO(serviceStart), 7)))} (7 days)
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} placeholder="e.g. oil change, inspection items..." />
                </div>

                {selectedEquipmentId && (() => {
                  const a = getCurrentAssignment(selectedEquipmentId)
                  if (!a) return null
                  const start = parseISO(serviceStart)
                  const aStart = parseISO(a.startDate)
                  const aEnd = a.endDate ? parseISO(a.endDate) : addDays(today, 3650)
                  const overlaps = start.getTime() >= aStart.getTime() && start.getTime() <= aEnd.getTime()
                  if (!overlaps) return null
                  const projectName = projectsById.get(a.projectId)?.name || `Project #${a.projectId}`

                  return (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <div className="text-sm font-medium text-rose-900">Conflict detected</div>
                      <div className="text-xs text-rose-800 mt-1">Currently assigned to {projectName}. Beta mode will auto-end the assignment.</div>
                      <label className="mt-3 flex items-start gap-2 text-sm text-rose-900">
                        <input
                          type="checkbox"
                          checked={serviceAutoResolve}
                          onChange={(e) => setServiceAutoResolve(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Auto-end assignment the day before service starts (recommended)
                        </span>
                      </label>
                    </div>
                  )
                })()}
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setServiceOpen(false)}>Cancel</Button>
                <Button onClick={confirmService} className="gap-2" disabled={!canConfirmService}>
                  <Wrench className="h-4 w-4" />
                  Confirm service
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {movementOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMovementOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Schedule movement</div>
                  <div className="font-semibold text-slate-900">{selectedEquipment.name}</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setMovementOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={movementStart} onChange={(e) => setMovementStart(e.target.value)} />
                  <div className="text-xs text-slate-500">No end date for movement (blocks future assignments/services)</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>From project</Label>
                    <Select value={movementFromProjectId} onValueChange={setMovementFromProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To project</Label>
                    <Select value={movementToProjectId} onValueChange={setMovementToProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={movementNotes} onChange={(e) => setMovementNotes(e.target.value)} placeholder="e.g. transfer, delivery, vendor trip..." />
                </div>

                {(() => {
                  const fromProjectId = movementFromProjectId ? Number(movementFromProjectId) : null
                  const toProjectId = Number(movementToProjectId)
                  const current = getCurrentAssignment(selectedEquipment.id)
                  const hasConflict = current && fromProjectId && fromProjectId === current.projectId && movementStart && current.startDate && movementStart >= current.startDate
                  const projectName = projects.find(p => p.id === current?.projectId)?.name || 'Current project'
                  return hasConflict ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <div className="text-sm font-medium text-rose-900">Conflict detected</div>
                      <div className="text-xs text-rose-800 mt-1">Currently assigned to {projectName}. Beta mode will auto-end the assignment.</div>
                      <label className="mt-3 flex items-start gap-2 text-sm text-rose-900">
                        <input
                          type="checkbox"
                          checked={movementAutoResolve}
                          onChange={(e) => setMovementAutoResolve(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Auto-end assignment the day before movement starts (recommended)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={movementAutoResolve}
                        onChange={(e) => setMovementAutoResolve(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        Auto-resolve conflicts if any (recommended)
                      </span>
                    </label>
                  )
                })()}
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMovementOpen(false)}>Cancel</Button>
                <Button onClick={confirmMovement} className="gap-2" disabled={!canConfirmMovement}>
                  <ArrowRightLeft className="h-4 w-4" />
                  Confirm movement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {addEquipmentOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddEquipmentOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Add new equipment</div>
                  <div className="font-semibold text-slate-900">Equipment Details</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setAddEquipmentOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Equipment Name *</Label>
                  <Input
                    value={addEquipmentName}
                    onChange={(e) => setAddEquipmentName(e.target.value)}
                    placeholder="e.g. CAT 320 Excavator"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipment Type *</Label>
                  <Select value={addEquipmentType} onValueChange={(v) => setAddEquipmentType(v as EquipmentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCAVATOR">Excavator</SelectItem>
                      <SelectItem value="TRUCK">Truck</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="FORKLIFT">Forklift</SelectItem>
                      <SelectItem value="MANLIFT">Manlift</SelectItem>
                      <SelectItem value="ROLLER">Roller</SelectItem>
                      <SelectItem value="DOZER">Dozer</SelectItem>
                      <SelectItem value="LOADER">Loader</SelectItem>
                      <SelectItem value="CRANE">Crane</SelectItem>
                      <SelectItem value="DRILL">Drill</SelectItem>
                      <SelectItem value="GENERATOR">Generator</SelectItem>
                      <SelectItem value="COMPRESSOR">Compressor</SelectItem>
                      <SelectItem value="WELDER">Welder</SelectItem>
                      <SelectItem value="PUMP">Pump</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Serial Code (optional)</Label>
                  <Input
                    value={addEquipmentSerialCode}
                    onChange={(e) => setAddEquipmentSerialCode(e.target.value)}
                    placeholder="e.g. SN123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={addEquipmentStatus} onValueChange={(v) => setAddEquipmentStatus(v as EquipmentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddEquipmentOpen(false)}>Cancel</Button>
                <Button onClick={confirmAddEquipment} className="gap-2" disabled={!canConfirmAddEquipment}>
                  <Plus className="h-4 w-4" />
                  Add Equipment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
