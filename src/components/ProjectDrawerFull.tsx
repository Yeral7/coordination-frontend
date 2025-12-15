import React, { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetPortal } from './ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './ui/select'
import { CheckCircle2, Clock, MapPin, Building2, Search, Plus, Image as ImageIcon, Send, Filter, Loader2, Trash2, X } from 'lucide-react'
import { Project, ProjectType } from './ProjectCard'
import { fetchProjectNotes, createProjectNote, deleteProjectNote, uploadNoteImage, fetchProjectEquipment, ProjectEquipmentItem, ProjectNote, NoteType as ApiNoteType } from '@/api/projects'

// Note types for filtering (includes ALL)
type NoteFilterType = 'ALL' | ApiNoteType

// Color mapping for note types (Tailwind color names)
const noteTypeColors: Record<string, { color: string; border: string; bg: string }> = {
  slate: { color: 'bg-slate-100 text-slate-700', border: 'border-slate-200', bg: 'bg-white' },
  blue: { color: 'bg-blue-100 text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50/50' },
  rose: { color: 'bg-rose-100 text-rose-700', border: 'border-rose-300', bg: 'bg-rose-50/50' },
  amber: { color: 'bg-amber-100 text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50/50' },
  orange: { color: 'bg-orange-100 text-orange-700', border: 'border-orange-300', bg: 'bg-orange-50/50' },
  purple: { color: 'bg-purple-100 text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50/50' },
  indigo: { color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50/50' },
  cyan: { color: 'bg-cyan-100 text-cyan-700', border: 'border-cyan-200', bg: 'bg-cyan-50/50' },
  teal: { color: 'bg-teal-100 text-teal-700', border: 'border-teal-200', bg: 'bg-teal-50/50' },
  emerald: { color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50/50' },
}

// Note type config for Coordination
const noteTypeConfig: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'General', color: 'slate' },
  UPDATE: { label: 'Update', color: 'blue' },
  SCHEDULE: { label: 'Schedule', color: 'cyan' },
  DELAY: { label: 'Delay', color: 'orange' },
  MATERIAL: { label: 'Material', color: 'teal' },
  ISSUE: { label: 'Issue', color: 'rose' },
}

const getNoteTypeStyle = (type: string) => {
  const config = noteTypeConfig[type] || { label: type, color: 'slate' }
  const colors = noteTypeColors[config.color] || noteTypeColors.slate
  return { ...colors, label: config.label }
}

// Max notes to display before scrolling
const MAX_VISIBLE_NOTES = 5

const projectTypeColors: Record<ProjectType, { bg: string; text: string }> = {
  PRIMED: { bg: 'bg-slate-100', text: 'text-slate-700' },
  COLORPLUS: { bg: 'bg-blue-100', text: 'text-blue-700' },
}

interface ProjectDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

// Temporary current user ID (will come from auth context later)
const CURRENT_USER_ID = 1

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({ open, onOpenChange, project }) => {
  const [noteContent, setNoteContent] = useState('')
  const [newNoteType, setNewNoteType] = useState<ApiNoteType>('GENERAL')
  const [filterType, setFilterType] = useState<NoteFilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [notes, setNotes] = useState<ProjectNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [equipmentItems, setEquipmentItems] = useState<ProjectEquipmentItem[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [noteImages, setNoteImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Fetch notes when drawer opens or filter changes
  useEffect(() => {
    if (open && project) {
      loadNotes()
    }
  }, [open, project?.id, filterType])

  useEffect(() => {
    if (open && project) {
      loadEquipment()
    }
  }, [open, project?.id])

  const loadNotes = async () => {
    if (!project) return
    setNotesLoading(true)
    try {
      const typeFilter = filterType === 'ALL' ? undefined : filterType
      const data = await fetchProjectNotes(project.id, typeFilter)
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  const loadEquipment = async () => {
    if (!project) return
    setEquipmentLoading(true)
    try {
      const data = await fetchProjectEquipment(project.id)
      setEquipmentItems(data)
    } catch (err) {
      console.error('Failed to load equipment:', err)
      setEquipmentItems([])
    } finally {
      setEquipmentLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (newFiles.length === 0) return
    
    setNoteImages(prev => [...prev, ...newFiles])
    
    // Create previews
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
    
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setNoteImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handlePostNote = async () => {
    if (!project || !noteContent.trim()) return
    setPosting(true)
    try {
      // Upload images first if any
      let imageUrls: string[] = []
      if (noteImages.length > 0) {
        setUploadingImages(true)
        try {
          imageUrls = await Promise.all(
            noteImages.map(file => uploadNoteImage(project.id, file))
          )
        } catch (err) {
          console.error('Failed to upload images:', err)
          alert('Failed to upload images. Note will be posted without images.')
        }
        setUploadingImages(false)
      }

      const newNote = await createProjectNote(project.id, {
        content: noteContent.trim(),
        type: newNoteType,
        imageUrls,
      })
      setNotes((prev) => [newNote, ...prev])
      setNoteContent('')
      setNoteImages([])
      setImagePreviews([])
      setIsComposing(false)
      setNewNoteType('GENERAL')
    } catch (err) {
      console.error('Failed to post note:', err)
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!project) return
    setDeletingId(noteId)
    try {
      await deleteProjectNote(project.id, noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.error('Failed to delete note:', err)
    } finally {
      setDeletingId(null)
    }
  }

  // Filter notes by search query
  const filteredNotes = notes.filter((note) =>
    searchQuery ? note.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Check if current user is the author
  const isOwnNote = (note: ProjectNote) => note.author?.id === CURRENT_USER_ID

  if (!project) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-auto w-[675px] sm:max-w-[675px] p-0" side="right">
        <SheetClose />
        
        {/* Header with proper padding */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <SheetHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-xl leading-tight">{project.name}</SheetTitle>
            {project.projectType && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${projectTypeColors[project.projectType].bg} ${projectTypeColors[project.projectType].text}`}>
                {project.projectType === 'COLORPLUS' ? 'ColorPlus' : 'Primed'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>{project.address}</span>
          </div>
            {project.lifecycleStage && (
              <Badge variant="outline" className="w-fit text-xs">
                {project.lifecycleStage}
              </Badge>
            )}
          </SheetHeader>
        </div>

        {/* Content area with proper padding */}
        <div className="px-6 py-4">
          <Tabs defaultValue="overview">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="logistics" className="flex-1">Logistics</TabsTrigger>
              <TabsTrigger value="equipment" className="flex-1">Equipment</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Builder Info */}
              {project.builder && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <Label className="text-slate-500">Builder</Label>
                  </div>
                  <div className="font-medium">{project.builder.name}</div>
                </div>
              )}

              {/* Team Section */}
              <div className="space-y-3">
                <Label className="text-slate-500">Team</Label>
                
                {/* Coordinator */}
                {project.coordinator && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {project.coordinator.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{project.coordinator.name}</div>
                      <div className="text-sm text-slate-500">Coordinator</div>
                    </div>
                  </div>
                )}

                {/* Field Manager */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {project.manager.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{project.manager.name}</div>
                    <div className="text-sm text-slate-500">Field Manager</div>
                  </div>
                </div>
              </div>

              {/* Project Details - Placeholder for Phase 2 API data */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Start Date</Label>
                    <div className="mt-1 font-medium">--</div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Est. Completion</Label>
                    <div className="mt-1 font-medium">--</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">Crew Size</Label>
                    <div className="mt-1 font-medium">--</div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Squares</Label>
                    <div className="mt-1 font-medium">--</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Logistics Tab */}
            <TabsContent value="logistics" className="space-y-4">
              <div className="space-y-6">
                {/* Timeline Steps */}
                <div className="relative pl-8 space-y-6">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute left-[-28px] top-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <div className="absolute left-[-21px] top-5 bottom-[-24px] w-0.5 bg-slate-200" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span>Material Ordered</span>
                        <Badge variant="success">Complete</Badge>
                      </div>
                      <p className="text-slate-500 mt-1">PO: #12345 - Oct 10, 2024</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute left-[-28px] top-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <div className="absolute left-[-21px] top-5 bottom-[-24px] w-0.5 bg-slate-200" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span>Shipped</span>
                        <Badge variant="success">Complete</Badge>
                      </div>
                      <p className="text-slate-500 mt-1">Tracking: TRACK123456</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute left-[-28px] top-0 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div className="absolute left-[-21px] top-5 bottom-[-24px] w-0.5 bg-slate-200" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span>Delivery Scheduled</span>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <p className="text-slate-500 mt-1">Oct 24, 2024 - 9:00 AM</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute left-[-28px] top-0 h-5 w-5 rounded-full bg-slate-300" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span>Received</span>
                        <Badge>Awaiting</Badge>
                      </div>
                      <p className="text-slate-500 mt-1">Pending field confirmation</p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-6">+ New Order</Button>
              </div>
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment">
              <div className="space-y-4">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Machine</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Serial #</th>
                        <th className="px-4 py-2 text-left">Delivery</th>
                        <th className="px-4 py-2 text-left">Pickup</th>
                        <th className="px-4 py-2 text-left">Next Service</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentLoading ? (
                        <tr className="border-t border-slate-200">
                          <td className="px-4 py-4 text-slate-500" colSpan={6}>Loading...</td>
                        </tr>
                      ) : equipmentItems.length === 0 ? (
                        <tr className="border-t border-slate-200">
                          <td className="px-4 py-4 text-slate-500" colSpan={6}>No equipment assigned.</td>
                        </tr>
                      ) : (
                        equipmentItems.map((it) => {
                          const delivery = it.deliveryDate ? new Date(it.deliveryDate).toLocaleDateString() : '—'
                          const pickup = it.pickupDate ? new Date(it.pickupDate).toLocaleDateString() : '—'
                          const nextService = it.nextService
                            ? `${it.nextService.type} • ${new Date(it.nextService.scheduledStart).toLocaleDateString()}`
                            : '—'
                          return (
                            <tr key={it.assignmentId} className="border-t border-slate-200">
                              <td className="px-4 py-3">{it.equipmentName}</td>
                              <td className="px-4 py-3 text-slate-600">{it.type}</td>
                              <td className="px-4 py-3 text-slate-600">{it.serialCode || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{delivery}</td>
                              <td className="px-4 py-3 text-slate-600">{pickup}</td>
                              <td className="px-4 py-3 text-slate-600">{nextService}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab - Fixed height layout */}
            <TabsContent value="notes" className="mt-4 flex flex-col" style={{ height: '420px' }}>
              {/* Search & Filter Bar - Fixed */}
              <div className="flex gap-2 mb-3 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search notes..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as NoteFilterType)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Filter className="h-4 w-4 mr-2 text-slate-400" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="SCHEDULE">Schedule</SelectItem>
                    <SelectItem value="DELAY">Delay</SelectItem>
                    <SelectItem value="MATERIAL">Material</SelectItem>
                    <SelectItem value="ISSUE">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes Feed - Scrollable with fixed height */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                {notesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No notes match your search' : 'No notes yet'}
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const style = getNoteTypeStyle(note.type)
                    return (
                      <div
                        key={note.id}
                        className={`${style.bg} border ${style.border} rounded-xl p-4 transition-all hover:shadow-sm group`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm flex-shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                              {note.author?.initials || note.author?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{note.author?.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.color}`}>
                                {style.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                            
                            {/* Image thumbnails */}
                            {note.imageUrls?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {note.imageUrls.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={url}
                                      alt="Attachment"
                                      className="h-20 w-20 object-cover rounded-lg border border-slate-200 hover:border-slate-400 transition-colors shadow-sm hover:shadow-md"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">{formatRelativeTime(note.createdAt)}</span>
                              {/* Only show delete for own notes */}
                              {isOwnNote(note) && (
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  disabled={deletingId === note.id}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1 rounded"
                                  title="Delete note"
                                >
                                  {deletingId === note.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Note Section - Inline Sophisticated Editor */}
              <div className="border-t border-slate-100 pt-3 mt-3 flex-shrink-0">
                {!isComposing ? (
                  <button
                    onClick={() => setIsComposing(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all group"
                  >
                    <div className="bg-white p-1 rounded-md border border-slate-200 group-hover:border-slate-300">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Add a note...</span>
                  </button>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-semibold text-sm text-slate-900">New Note</h3>
                      <button
                        onClick={() => {
                          setIsComposing(false)
                          setNoteContent('')
                          setNewNoteType('GENERAL')
                          setNoteImages([])
                          setImagePreviews([])
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Note Type Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Note Type</Label>
                        <Select value={newNoteType} onValueChange={(v) => setNewNoteType(v as ApiNoteType)}>
                          <SelectTrigger className="w-full h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GENERAL">General</SelectItem>
                            <SelectItem value="UPDATE">Update</SelectItem>
                            <SelectItem value="SCHEDULE">Schedule</SelectItem>
                            <SelectItem value="DELAY">Delay</SelectItem>
                            <SelectItem value="MATERIAL">Material</SelectItem>
                            <SelectItem value="ISSUE">Issue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Content Area */}
                      <div className="space-y-2">
                        <textarea
                          className="w-full border border-slate-200 rounded-lg p-3 min-h-[100px] text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none bg-slate-50/30 placeholder:text-slate-400 leading-relaxed"
                          placeholder="What's happening?"
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          maxLength={6000}
                          autoFocus
                        />
                        
                        {/* Image Previews */}
                        {imagePreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {imagePreviews.map((preview, idx) => (
                              <div key={idx} className="relative group">
                                <img 
                                  src={preview} 
                                  alt={`Preview ${idx + 1}`} 
                                  className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => removeImage(idx)}
                                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Attach Button - Below textarea */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <button 
                          onClick={() => imageInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 hover:border-slate-300" 
                          title="Attach image"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span>{noteImages.length > 0 ? `${noteImages.length} image(s)` : 'Add image'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {noteContent.length}/6000 chars
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsComposing(false)
                            setNoteContent('')
                            setNewNoteType('GENERAL')
                            setNoteImages([])
                            setImagePreviews([])
                          }}
                          className="text-slate-600 hover:text-slate-900 h-8"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!noteContent.trim() || posting}
                          onClick={handlePostNote}
                          className="bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 h-8"
                        >
                          {posting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
