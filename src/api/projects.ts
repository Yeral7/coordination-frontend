const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

export type LifecycleStage = 'ESTIMATION' | 'AWARDED' | 'ONGOING' | 'COMPLETED' | 'LOST'

export interface DashboardProject {
  id: number
  name: string
  address?: string
  projectType?: 'PRIMED' | 'COLORPLUS' | null
  lifecycleStage: LifecycleStage
  fieldManager?: {
    id: number
    name: string
  } | null
  coordinator?: {
    id: number
    name: string
  } | null
  builder?: {
    id: number
    name: string
  } | null
}

export interface ProjectNote {
  id: number
  content: string
  type: 'GENERAL' | 'UPDATE' | 'SCHEDULE' | 'DELAY' | 'MATERIAL' | 'ISSUE'
  imageUrls: string[]
  author: {
    id: number
    name: string
    email?: string
    initials?: string
  }
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
}

export type NoteType = ProjectNote['type']

export interface ProjectFile {
  id: number
  projectId: number
  name: string
  url: string
  category: FileCategory
  fileType?: string
  size?: string
  uploadedAt: string
  uploadedBy?: {
    id: number
    name: string
  }
}

export type FileCategory = 'FULL_MATERIAL_LIST' | 'DRAWINGS_LINK' | 'SUBMITTALS' | 'SCOPE_OF_WORK_CONTRACT' | 'JOB_SHEETS' | 'CHANGE_ORDERS' | 'SCO'

export interface ProjectEquipmentItem {
  assignmentId: number
  equipmentId: number
  equipmentName: string
  serialCode: string | null
  type: string
  status: string
  deliveryDate: string
  pickupDate: string | null
  nextService: null | {
    id: number
    type: string
    status: string
    scheduledStart: string
    scheduledEnd: string
  }
}

export async function fetchDashboardProjects(stage?: string): Promise<DashboardProject[]> {
  const url = new URL(`${API_BASE_URL}/projects/dashboard`)
  if (stage) {
    url.searchParams.append('stage', stage)
  }

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`)
  }

  return response.json()
}

 export async function createProjectFile(projectId: string, payload: {
   name: string
   url: string
   category: FileCategory
   fileType?: string
 }): Promise<ProjectFile> {
   const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify(payload),
   })

   if (!response.ok) {
     throw new Error(`Failed to create file link: ${response.statusText}`)
   }

   return response.json()
 }

export async function fetchProjectNotes(projectId: string, type?: NoteType): Promise<ProjectNote[]> {
  const url = new URL(`${API_BASE_URL}/projects/${projectId}/notes`)
  if (type) {
    url.searchParams.append('type', type)
  }

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.statusText}`)
  }

  return response.json()
}

export async function createProjectNote(projectId: string, note: {
  content: string
  type: NoteType
  imageUrls?: string[]
}): Promise<ProjectNote> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  })

  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.statusText}`)
  }

  return response.json()
}

export async function deleteProjectNote(projectId: string, noteId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes/${noteId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.statusText}`)
  }
}

export async function uploadNoteImage(projectId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes/image`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`)
  }

  const result = await response.json()
  return result.imageUrl
}

export async function fetchProjectFiles(projectId: string, category?: FileCategory): Promise<ProjectFile[]> {
  const url = new URL(`${API_BASE_URL}/projects/${projectId}/files`)
  if (category) {
    url.searchParams.append('category', category)
  }

  const response = await fetch(url.toString())
  
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`)
  }

  return response.json()
}

export async function uploadProjectFile(projectId: string, file: File, category: FileCategory): Promise<ProjectFile> {
  const formData = new FormData()
  formData.append('file', file)

  const url = new URL(`${API_BASE_URL}/projects/${projectId}/files/upload`)
  url.searchParams.append('category', category)

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }

  return response.json()
}

export async function deleteProjectFile(projectId: string, fileId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/${fileId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`)
  }
}

export async function fetchProjectEquipment(projectId: string): Promise<ProjectEquipmentItem[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/equipment`)

  if (!response.ok) {
    throw new Error(`Failed to fetch project equipment: ${response.statusText}`)
  }

  return response.json()
}
