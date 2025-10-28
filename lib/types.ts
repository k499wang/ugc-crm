export type UserRole = "company_admin" | "creator"
export type VideoStatus = "pending" | "approved" | "rejected"

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  base_pay: number | null
  default_cpm: number | null
  created_at: string
  updated_at: string
}

export interface Niche {
  id: string
  company_id: string
  name: string
  description: string | null
  cpm: number | null
  base_pay: number | null
  created_at: string
  updated_at: string
}

export interface PaymentTierConfig {
  id: string
  company_id: string
  niche_id: string | null
  creator_id: string | null
  tier_name: string
  view_count_threshold: number
  amount: number
  description: string | null
  cpm: number | null
  created_at: string
  updated_at: string
}

export interface Creator {
  id: string
  company_id: string
  user_id: string | null
  niche_id: string | null
  name: string
  email: string | null
  phone: string | null
  instagram_handle: string | null
  tiktok_handle: string | null
  notes: string | null
  is_active: boolean
  base_pay: number | null
  cpm: number | null
  invite_token: string | null
  invite_accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  company_id: string
  creator_id: string
  title: string
  description: string | null
  video_url: string | null
  thumbnail_url: string | null
  platform: string | null
  views: number
  likes: number
  comments: number
  status: VideoStatus
  base_cpm_paid: boolean
  base_cpm_paid_at: string | null
  base_payment_amount: number | null
  cpm_payment_amount: number | null
  submitted_at: string
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface VideoTierPayment {
  id: string
  video_id: string
  tier_id: string
  reached: boolean
  paid: boolean
  paid_at: string | null
  payment_amount: number | null
  created_at: string
  updated_at: string
}

export interface VideoWithCreator extends Video {
  creator: Creator
  tier_payments?: (VideoTierPayment & { tier: PaymentTierConfig })[]
}
