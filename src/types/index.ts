export interface UserInfo {
  _id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'secret';
  age?: number;
  birthday?: string;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  sendCode: (phone: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
}

export type I18nLangType = 'zh-CN' | 'en-US';

export type ThemeType = 'light' | 'dark';

export interface ComponentProps {
  children?: React.ReactNode;
  style?: any;
}

// 场景类型
export type ScenarioType = 'travel' | 'movie' | 'outing' | 'food' | 'daily' | 'special';

// 心情类型
export type MoodType = 'happy' | 'sad' | 'normal' | 'excited' | 'angry' | 'relaxed' | 'touched';

// 天气类型
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy';

// 标签类型
export type TagType =
  | 'daily'
  | 'work'
  | 'study'
  | 'travel'
  | 'sports'
  | 'food'
  | 'mood'
  | 'family'
  | 'friends'
  | 'shopping';

// 媒体资源类型
export type MediaType = 'image' | 'livePhoto' | 'video';

// 上传状态
export type UploadStatus = 'loading' | 'success' | 'fail';

// 媒体资源
export interface MediaResource {
  type: MediaType;
  uri: string; // 云端 URL
  thumbnail?: string; // 缩略图 URI（视频用）
  duration?: number; // 时长（秒，视频用）
  size?: number; // 文件大小（字节）
  mimeType?: string; // MIME 类型
  uploadStatus?: UploadStatus; // 上传状态
  uploadError?: string; // 上传错误信息（失败时显示）
}

// 日记接口
export interface Diary {
  _id: string;
  userId?: string;
  notebookId?: string; // 所属日记本 ID
  title: string;
  content: string;
  date: string; // 用户选择的日记发生时间
  scenario: ScenarioType;
  mood: MoodType;
  weather: WeatherType;
  media?: MediaResource[]; // 新媒体资源（最多 9 个）
  location?: string;
  companions?: string[];
  rating?: number; // 1-5 星评分
  tags?: TagType[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  isPrivate?: boolean;
  isPublic?: boolean;
  likesCount?: number;
  likedUserIds?: string[]; // 记录点赞用户的 ID
  commentsCount?: number;
  authorInfo?: {
    nickname?: string;
    avatar?: string;
  };
  comments?: Array<{
    id: string;
    user: string;
    content: string;
    time: string;
    image?: string;
  }>;
}

// 日记列表响应
export interface DiaryListResponse {
  list: Diary[];
  total: number;
  page: number;
  pageSize: number;
}

// 场景模板
export interface ScenarioTemplate {
  id: string;
  type: ScenarioType;
  name: string;
  icon: string;
  color: string;
  placeholder: string;
  prompts: string[];
  fields: TemplateField[];
}

// 模板字段
export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'rating' | 'tags' | 'location' | 'people' | 'image';
  required: boolean;
  placeholder?: string;
}

// 时间轴项目
export interface TimelineItem {
  _id: string;
  type: 'diary' | 'photo' | 'milestone';
  title: string;
  description: string;
  date: string;
  media?: MediaResource[];
  scenario?: ScenarioType;
  mood?: MoodType;
  weather?: WeatherType;
  location?: string;
}

// 分类接口
export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
  scenario?: ScenarioType;
}

// 萌宠状态
export interface MascotState {
  currentMascot: string;
  expression: string;
  lastInteraction: string;
  streak: number;
  totalDiaries: number;
  level: number;
  experience: number;
}

// 萌宠接口
export interface Mascot {
  id: string;
  name: string;
  emoji: string;
  color: string;
  personalities: Personality[];
  expressions: Expression[];
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  triggerEvents: string[];
  responses: string[];
}

export interface Expression {
  id: string;
  name: string;
  emoji: string;
  color: string;
  animation: 'bounce' | 'shake' | 'pulse' | 'spin';
}
