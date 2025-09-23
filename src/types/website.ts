export interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteSection {
  id: string;
  page_id?: string;
  section_type: 'hero' | 'statistics' | 'content' | 'gallery' | 'testimonials' | 'news' | 'features';
  title?: string;
  content?: string;
  image_url?: string;
  section_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  category: 'news' | 'events' | 'announcements';
  is_published: boolean;
  published_at?: string;
  event_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  category: 'facilities' | 'events' | 'activities' | 'general';
  alt_text?: string;
  is_featured: boolean;
  display_order: number;
  created_by: string;
  created_at: string;
}

export interface SchoolInfo {
  id: string;
  info_key: string;
  info_value: string;
  category: 'general' | 'contact' | 'social' | 'statistics';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: 'student' | 'parent' | 'alumni' | 'staff';
  content: string;
  rating?: number;
  image_url?: string;
  is_featured: boolean;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteSettings {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}