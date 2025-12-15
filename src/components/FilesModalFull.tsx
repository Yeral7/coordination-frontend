import React, { useState, useEffect } from 'react'
import { X, FileText, Download, ExternalLink, File, FileSpreadsheet, FileType, Folder, Search, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { Project } from './ProjectCard'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { 
  fetchProjectFiles, 
  createProjectFile,
  deleteProjectFile,
  ProjectFile, 
  FileCategory 
} from '@/api/projects'

interface FilesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

interface FileSection {
  id: FileCategory
  title: string
  description: string
  color: string
}

const FILE_SECTIONS: FileSection[] = [
  { id: 'FULL_MATERIAL_LIST', title: 'Material List', description: 'Complete project material inventories and specifications', color: 'blue' },
  { id: 'DRAWINGS_LINK', title: 'Drawings', description: 'Architectural plans, site layouts, and structural details', color: 'purple' },
  { id: 'SUBMITTALS', title: 'Submittals', description: 'Equipment and material approval packages', color: 'emerald' },
  { id: 'SCOPE_OF_WORK_CONTRACT', title: 'Contracts', description: 'Project agreements and scope documentation', color: 'amber' },
  { id: 'JOB_SHEETS', title: 'Job Sheets', description: 'Coordinator tracking sheets and templates', color: 'cyan' },
  { id: 'CHANGE_ORDERS', title: 'Change Orders', description: 'Scope changes and additional work orders', color: 'rose' },
  { id: 'SCO', title: 'SCO', description: 'Subcontractor change orders', color: 'orange' },
]

export const FilesModal: React.FC<FilesModalProps> = ({ open, onOpenChange, project }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | FileCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('JOB_SHEETS')
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  useEffect(() => {
    if (open && project) {
      loadFiles()
    }
  }, [open, project])

  useEffect(() => {
    if (selectedCategory !== 'all') {
      setUploadCategory(selectedCategory)
    }
  }, [selectedCategory])

  const loadFiles = async () => {
    if (!project) return
    setLoading(true)
    try {
      const data = await fetchProjectFiles(project.id)
      setFiles(data)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLink = async () => {
    if (!project) return
    const name = newLinkName.trim()
    const rawUrl = newLinkUrl.trim()
    if (!name || !rawUrl) return

    const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`

    setUploading(true)
    try {
      const created = await createProjectFile(project.id, {
        name,
        url,
        category: uploadCategory,
        fileType: 'link',
      })
      setFiles((prev) => [created, ...prev])
      setNewLinkName('')
      setNewLinkUrl('')
    } catch (err) {
      console.error('Failed to create link:', err)
      alert('Failed to add link. Make sure you are logged in.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: number) => {
    if (!project || !confirm('Delete this file?')) return
    try {
      await deleteProjectFile(project.id, fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch (err) {
      console.error('Failed to delete file:', err)
    }
  }

  const getFilesForSection = (category: FileCategory) => {
    return files.filter((f) => f.category === category)
  }

  const matchesSearch = (f: ProjectFile) => {
    if (!searchQuery) return true
    return f.name.toLowerCase().includes(searchQuery.toLowerCase())
  }

  const getVisibleFilesForSection = (category: FileCategory) => {
    return getFilesForSection(category).filter(matchesSearch)
  }

  const visibleFiles = files.filter(matchesSearch)

  if (!open || !project) return null

  const getFileIcon = (file: ProjectFile) => {
    // Determine icon based on fileType or file extension
    const fileType = file.fileType?.toLowerCase() || ''
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    
    // Check fileType first
    if (fileType === 'pdf' || ext === 'pdf') {
      return <FileText className="h-4 w-4" />
    }
    if (fileType === 'excel' || ['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="h-4 w-4" />
    }
    if (fileType === 'doc' || ['doc', 'docx'].includes(ext)) {
      return <FileType className="h-4 w-4" />
    }
    if (fileType === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (fileType === 'link' || file.url?.startsWith('http')) {
      return <ExternalLink className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const getCategoryIconBg = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      amber: 'bg-amber-100 text-amber-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      rose: 'bg-rose-100 text-rose-600',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const totalFiles = files.length

  const currentSection = selectedCategory === 'all' 
    ? null 
    : FILE_SECTIONS.find(s => s.id === selectedCategory)

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="h-full w-full flex items-center justify-center p-8">
          <div 
            className="bg-white rounded-lg shadow-2xl pointer-events-auto"
            style={{ width: '1400px', maxWidth: '95vw', height: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-[140px] px-6 py-5 border-b border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-slate-900">Project Files</h2>
                  <p className="text-slate-600 text-sm mt-1">{project.name} • {totalFiles} files</p>
                </div>
                <button 
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded hover:bg-slate-100 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as FileCategory)}
                  className="h-9 px-3 rounded-md border border-slate-200 text-sm"
                >
                  {FILE_SECTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <Input
                  placeholder="Link title"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  className="h-9 max-w-[220px]"
                />
                <Input
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="h-9 max-w-[320px]"
                />
                <Button 
                  size="sm" 
                  className="gap-2 h-9"
                  onClick={handleAddLink}
                  disabled={uploading || !newLinkName.trim() || !newLinkUrl.trim()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {uploading ? 'Saving...' : 'Add link'}
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="h-[calc(100%-140px)] flex">
              {/* Sidebar */}
              <div className="w-[260px] border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-2 transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="text-sm">All Files</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{totalFiles}</Badge>
                  </div>
                </button>

                <div className="h-px bg-slate-200 my-3" />

                {FILE_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedCategory(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      selectedCategory === section.id
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{section.title}</span>
                      <Badge variant="secondary" className="text-xs">{getFilesForSection(section.id).length}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{section.description}</p>
                  </button>
                ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-6">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : selectedCategory === 'all' ? (
                    <div className="space-y-8">
                      {FILE_SECTIONS.map((section) => {
                        const sectionFiles = getVisibleFilesForSection(section.id)
                        if (sectionFiles.length === 0) return null
                        return (
                          <div key={section.id}>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-slate-900">{section.title}</h3>
                                <p className="text-slate-600 text-sm mt-0.5">{section.description}</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedCategory(section.id)}
                              >
                                View All
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              {sectionFiles.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                  <div className={`p-2 rounded ${getCategoryIconBg(section.color)}`}>
                                    {getFileIcon(file)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-900 text-sm truncate hover:text-blue-600 transition-colors"
                                    >
                                      {file.name}
                                    </a>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                      {file.size && <span>{file.size}</span>}
                                      {file.uploadedAt && (
                                        <>
                                          <span>•</span>
                                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                        </>
                                      )}
                                      {file.uploadedBy && (
                                        <>
                                          <span>•</span>
                                          <span>{file.uploadedBy.name}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleDelete(file.id)}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {files.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <File className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                          <p>No files uploaded yet</p>
                          <p className="text-sm mt-1">Upload files using the button above</p>
                        </div>
                      ) : visibleFiles.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <File className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                          <p>No files match your search</p>
                        </div>
                      )}
                    </div>
                  ) : currentSection && (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-slate-900">{currentSection.title}</h2>
                        <p className="text-slate-600 text-sm mt-1">{currentSection.description}</p>
                      </div>

                      <div className="space-y-2">
                        {getVisibleFilesForSection(currentSection.id).map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            <div className={`p-2 rounded ${getCategoryIconBg(currentSection.color)}`}>
                              {getFileIcon(file)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-900 text-sm truncate hover:text-blue-600 transition-colors"
                              >
                                {file.name}
                              </a>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                {file.size && <span>{file.size}</span>}
                                {file.uploadedAt && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                  </>
                                )}
                                {file.uploadedBy && (
                                  <>
                                    <span>•</span>
                                    <span>{file.uploadedBy.name}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(file.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {getFilesForSection(currentSection.id).length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <File className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                            <p>No files in this category</p>
                          </div>
                        ) : getVisibleFilesForSection(currentSection.id).length === 0 && (
                          <div className="text-center py-12 text-slate-500">
                            <File className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                            <p>No files match your search</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
