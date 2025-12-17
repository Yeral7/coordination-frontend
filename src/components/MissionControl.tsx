'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ProjectCard, Project } from './ProjectCard'
import { ProjectDrawer } from './ProjectDrawerFull'
import { FilesModal } from './FilesModalFull'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Pencil, Trash2, X } from 'lucide-react'
import { fetchDashboardProjects, DashboardProject, LifecycleStage } from '@/api/projects'
import { toast } from 'react-hot-toast'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// Transform API data to UI Project format
function transformProject(p: DashboardProject): Project {
  // Map lifecycle stage to status
  const statusMap: Record<LifecycleStage, 'on-track' | 'issue' | 'pending'> = {
    ONGOING: 'on-track',
    AWARDED: 'on-track',
    ESTIMATION: 'pending',
    COMPLETED: 'on-track',
    LOST: 'issue',
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return {
    id: String(p.id),
    name: p.name,
    address: p.address || 'No address',
    status: statusMap[p.lifecycleStage] || 'pending',
    projectType: p.projectType,
    lifecycleStage: p.lifecycleStage,
    manager: p.fieldManager 
      ? { name: p.fieldManager.name, initials: getInitials(p.fieldManager.name) }
      : { name: 'Unassigned', initials: 'UA' },
    coordinator: p.coordinator
      ? { name: p.coordinator.name, initials: getInitials(p.coordinator.name) }
      : null,
    builder: p.builder,
    equipment: { active: false }, // Will be populated in Phase 3
    delivery: { status: 'none' },  // Will be populated in Phase 3
    notes: { unread: 0 },          // Will be populated in Phase 2
  }
}

export const MissionControl: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filesModalOpen, setFilesModalOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectAddress, setNewProjectAddress] = useState('')
  const [newProjectLifecycleStage, setNewProjectLifecycleStage] = useState<LifecycleStage>('AWARDED')
  const [newProjectType, setNewProjectType] = useState<string>('')
  const [newProjectClientName, setNewProjectClientName] = useState('')
  const [newProjectNotes, setNewProjectNotes] = useState('')

  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [editProjectName, setEditProjectName] = useState('')

  const canCreateProject = useMemo(() => {
    if (!newProjectName.trim()) return false
    if (!newProjectAddress.trim()) return false
    if (newProjectLifecycleStage === 'ESTIMATION') return false
    return true
  }, [newProjectName, newProjectAddress, newProjectLifecycleStage])

  const visibleProjects = projects.filter((p) => {
    if (stageFilter === 'active') {
      return p.lifecycleStage === 'ONGOING' || p.lifecycleStage === 'AWARDED'
    }
    if (stageFilter === 'awarded') return p.lifecycleStage === 'AWARDED'
    if (stageFilter === 'completed') return p.lifecycleStage === 'COMPLETED'
    return true
  }).filter((p) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const hay = `${p.name} ${p.address}`.toLowerCase()
    return hay.includes(q)
  })

  // Fetch projects from API
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDashboardProjects(undefined)
        setProjects(data.map(transformProject))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
        // Fallback to empty array on error
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [stageFilter])

  const reloadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDashboardProjects(undefined)
      setProjects(data.map(transformProject))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setDrawerOpen(true)
  }

  const handleFilesClick = (project: Project) => {
    setSelectedProject(project)
    setFilesModalOpen(true)
  }

  const openEditProject = (project: Project) => {
    setEditProjectId(project.id)
    setEditProjectName(project.name)
    setEditProjectOpen(true)
  }

  const canSaveProjectEdit = useMemo(() => {
    return Boolean(editProjectId && editProjectName.trim().length >= 2)
  }, [editProjectId, editProjectName])

  const saveProjectEdit = async () => {
    if (!canSaveProjectEdit || !editProjectId) return

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${editProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName.trim() }),
      })
      if (!response.ok) {
        const msg = await response.text()
        throw new Error(msg || `Failed to update project: ${response.statusText}`)
      }
      await reloadProjects()
      setEditProjectOpen(false)
      toast.success('Project updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  const deleteProject = async (project: Project) => {
    const confirmed = window.confirm(`Delete project "${project.name}"?`)
    if (!confirmed) return

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const msg = await response.text()
        throw new Error(msg || `Failed to delete project: ${response.statusText}`)
      }
      if (selectedProject?.id === project.id) {
        setDrawerOpen(false)
        setFilesModalOpen(false)
        setSelectedProject(null)
      }
      await reloadProjects()
      toast.success('Project deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const openNewProject = () => {
    setNewProjectName('')
    setNewProjectAddress('')
    setNewProjectLifecycleStage('AWARDED')
    setNewProjectType('')
    setNewProjectClientName('')
    setNewProjectNotes('')
    setNewProjectOpen(true)
  }

  const createProject = async () => {
    if (!canCreateProject) return

    try {
      const response = await fetch(`${API_BASE_URL}/projects/coordination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          exactLocation: newProjectAddress.trim(),
          lifecycleStage: newProjectLifecycleStage,
          projectType: newProjectType || null,
          clientName: newProjectClientName || null,
          notes: newProjectNotes || null,
        }),
      })
      if (!response.ok) {
        const msg = await response.text()
        throw new Error(msg || `Failed to create project: ${response.statusText}`)
      }
      const data = await fetchDashboardProjects(undefined)
      setProjects(data.map(transformProject))
      setNewProjectOpen(false)
      toast.success('Project created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Controls */}
      <div className="border-b border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1>Projects</h1>
            {/* Lifecycle Stage Filter - Simple select for now */}
            <select 
              value={stageFilter} 
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-40 px-3 py-2 border border-slate-300 rounded-md text-sm"
            >
              <option value="all">All Projects</option>
              <option value="active">Active</option>
              <option value="awarded">Just Awarded</option>
              <option value="completed">Completed</option>
            </select>

            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-64"
            />
          </div>
          <Button onClick={openNewProject}>+ New Project</Button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">Loading projects...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-rose-500 mb-2">{error}</div>
              <div className="text-slate-500 text-sm">Make sure the backend is running on localhost:3000</div>
            </div>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">No projects found</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleProjects.map(project => (
              <div key={project.id} className="relative group">
                <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditProject(project)
                    }}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteProject(project)
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ProjectCard
                  project={project}
                  onClick={() => handleProjectClick(project)}
                  onFilesClick={handleFilesClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Drawer */}
      <ProjectDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        project={selectedProject}
      />

      {/* Files Modal */}
      <FilesModal
        open={filesModalOpen}
        onOpenChange={setFilesModalOpen}
        project={selectedProject}
      />

      {/* New Project Modal */}
      {newProjectOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNewProjectOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Create new project</div>
                  <div className="font-semibold text-slate-900">Project Details</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setNewProjectOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Downtown Office Tower"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    value={newProjectAddress}
                    onChange={(e) => setNewProjectAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, City, State"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lifecycle Stage</Label>
                  <Select value={newProjectLifecycleStage} onValueChange={(v) => setNewProjectLifecycleStage(v as LifecycleStage)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AWARDED">Awarded</SelectItem>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Project Type (optional)</Label>
                  <Select value={newProjectType || 'NONE'} onValueChange={(v) => setNewProjectType(v === 'NONE' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="PRIMED">Primed</SelectItem>
                      <SelectItem value="COLORPLUS">ColorPlus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Client Name (optional)</Label>
                  <Input
                    value={newProjectClientName}
                    onChange={(e) => setNewProjectClientName(e.target.value)}
                    placeholder="e.g. ABC Corporation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={newProjectNotes}
                    onChange={(e) => setNewProjectNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
                <Button onClick={createProject} disabled={!canCreateProject}>
                  Create Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProjectOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditProjectOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <div className="text-sm text-slate-500">Edit project</div>
                  <div className="font-semibold text-slate-900">Project Details</div>
                </div>
                <button className="p-2 rounded hover:bg-slate-100" onClick={() => setEditProjectOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="e.g. Downtown Office Tower"
                  />
                </div>
              </div>

              <div className="border-t px-5 py-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditProjectOpen(false)}>Cancel</Button>
                <Button onClick={saveProjectEdit} disabled={!canSaveProjectEdit}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
