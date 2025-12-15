import React from 'react'
import { Card, CardContent, CardFooter } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Truck, Package, FileText, FolderOpen } from 'lucide-react'
import { Button } from './ui/button'

export type ProjectType = 'PRIMED' | 'COLORPLUS'
export type LifecycleStage = 'ESTIMATION' | 'AWARDED' | 'ONGOING' | 'COMPLETED' | 'LOST'

export interface Project {
  id: string
  name: string
  address: string
  status: 'on-track' | 'issue' | 'pending'
  // New coordination fields
  projectType?: ProjectType | null
  lifecycleStage?: LifecycleStage
  builder?: { id: number; name: string } | null
  coordinator?: { name: string; initials: string } | null
  manager: {
    name: string
    initials: string
  }
  equipment: {
    active: boolean
    count?: number
  }
  delivery: {
    status: 'received' | 'scheduled' | 'none'
    date?: string
  }
  notes: {
    unread: number
  }
}

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onFilesClick?: (project: Project) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onFilesClick }) => {
  // Project type badge colors (FE-02)
  const projectTypeColors: Record<ProjectType, { bg: string; text: string }> = {
    PRIMED: { bg: 'bg-slate-100', text: 'text-slate-700' },
    COLORPLUS: { bg: 'bg-blue-100', text: 'text-blue-700' },
  }

  const projectTypeLabels: Record<ProjectType, string> = {
    PRIMED: 'Primed',
    COLORPLUS: 'ColorPlus',
  }

  const handleFilesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFilesClick) {
      onFilesClick(project)
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{project.name}</h3>
          {/* Project Type Badge (FE-02) */}
          {project.projectType && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${projectTypeColors[project.projectType].bg} ${projectTypeColors[project.projectType].text}`}>
              {projectTypeLabels[project.projectType]}
            </span>
          )}
        </div>

        <p className="text-slate-600 mb-3">{project.address}</p>
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {project.manager.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-slate-600">{project.manager.name}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <div className={project.equipment.active ? 'text-blue-600' : 'text-slate-400'} title={project.equipment.active ? `${project.equipment.count} equipment on site` : 'No equipment'}>
              <Truck className="h-4 w-4" />
            </div>

            <div className={
              project.delivery.status === 'received' 
                ? 'text-emerald-600' 
                : project.delivery.status === 'scheduled'
                ? 'text-amber-600'
                : 'text-slate-400'
            } title={
              project.delivery.status === 'received' 
                ? 'Delivery received' 
                : project.delivery.status === 'scheduled'
                ? `Arriving ${project.delivery.date}`
                : 'No delivery scheduled'
            }>
              <Package className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-1" title={`${project.notes.unread} unread notes`}>
              <FileText className="h-4 w-4 text-slate-400" />
              {project.notes.unread > 0 && (
                <span className="bg-rose-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">
                  {project.notes.unread}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFilesClick}
            className="gap-1.5"
          >
            <FolderOpen className="h-4 w-4" />
            Files
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
