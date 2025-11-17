// User型
export interface User {
  id: number
  name: string
  age?: number
  email?: string
  phone?: string
  created_at: string
  updated_at: string
  status: 'active' | 'paused' | 'completed'
  progress_stage: string
  estimated_completion_date?: string
}

// Photo型
export interface Photo {
  id: number
  user_id: number
  filename: string
  file_path: string
  uploaded_at: string
  stage?: string
  description?: string
  ai_analysis?: string
}

// Question型
export interface Question {
  id: number
  stage: string
  order_num?: number
  template_text: string
  photo_id?: number
  user_id?: number
  created_at: string
}

// Response型
export interface Response {
  id: number
  user_id: number
  question_id?: number
  stage: string
  question_text: string
  response_text: string
  is_voice: boolean
  created_at: string
  photo_id?: number
}

// Timeline型
export interface Timeline {
  id: number
  user_id: number
  age?: number
  year?: number
  stage: string
  event_title: string
  event_description: string
  edited_content: string
  is_auto_generated: boolean
  created_at: string
}

// PDFVersion型
export interface PDFVersion {
  id: number
  user_id: number
  version: number
  html_content: string
  pdf_path: string
  generated_at: string
  status: 'draft' | 'ready_for_review' | 'finalized'
}

// API Response型
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
