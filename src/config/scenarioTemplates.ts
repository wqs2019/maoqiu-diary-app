// 场景化模板系统
import { ScenarioTemplate, ScenarioType } from '../types';

export const SCENARIO_TEMPLATES: Record<ScenarioType, ScenarioTemplate> = {
  daily: {
    id: 'daily',
    type: 'daily',
    name: '日常记录',
    icon: '📝',
    color: '#FF85A2',
    placeholder: '今天发生了什么？',
    prompts: [
      '今天过得怎么样？',
      '有什么开心或烦恼的事？',
      '遇到了什么人？',
      '学到了什么？',
      '想对自己说什么？',
    ],
    fields: [
      {
        id: 'content',
        label: '今日记录',
        type: 'text',
        required: true,
        placeholder: '记录今天的故事',
      },
      { id: 'mood', label: '心情', type: 'text', required: false, placeholder: '今天的心情' },
      { id: 'photos', label: '照片', type: 'image', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
  travel: {
    id: 'travel',
    type: 'travel',
    name: '旅行记录',
    icon: '✈️',
    color: '#5AC8FA',
    placeholder: '这次旅行去了哪里？有什么难忘的经历？',
    prompts: [
      '目的地是哪里？',
      '和谁一起去的？',
      '最印象深刻的景点',
      '尝到了什么美食？',
      '有什么有趣的故事？',
    ],
    fields: [
      {
        id: 'location',
        label: '目的地',
        type: 'location',
        required: true,
        placeholder: '添加旅行地点',
      },
      {
        id: 'companions',
        label: '同行人',
        type: 'people',
        required: false,
        placeholder: '和谁一起？',
      },
      {
        id: 'highlights',
        label: '亮点',
        type: 'text',
        required: false,
        placeholder: '最难忘的瞬间',
      },
      { id: 'rating', label: '推荐度', type: 'rating', required: false },
      { id: 'photos', label: '照片', type: 'image', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
  movie: {
    id: 'movie',
    type: 'movie',
    name: '观影记录',
    icon: '🎬',
    color: '#FF6B9D',
    placeholder: '看了什么电影？感受如何？',
    prompts: [
      '电影名称？',
      '和谁一起看的？',
      '最喜欢哪个角色？',
      '哪个情节最打动你？',
      '想对这部电影说什么？',
    ],
    fields: [
      { id: 'movieName', label: '电影名称', type: 'text', required: true, placeholder: '电影名称' },
      {
        id: 'companions',
        label: '同行人',
        type: 'people',
        required: false,
        placeholder: '和谁一起？',
      },
      { id: 'review', label: '观后感', type: 'text', required: false, placeholder: '写下你的感受' },
      { id: 'rating', label: '评分', type: 'rating', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
  outing: {
    id: 'outing',
    type: 'outing',
    name: '出行记录',
    icon: '🌳',
    color: '#34C759',
    placeholder: '今天去了哪里玩？',
    prompts: [
      '去了什么地方？',
      '天气怎么样？',
      '看到了什么风景？',
      '心情如何？',
      '有什么特别的发现？',
    ],
    fields: [
      { id: 'location', label: '地点', type: 'location', required: true, placeholder: '添加地点' },
      { id: 'weather', label: '天气', type: 'text', required: false, placeholder: '今天的天气' },
      { id: 'activities', label: '活动', type: 'text', required: false, placeholder: '做了什么？' },
      { id: 'photos', label: '照片', type: 'image', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
  food: {
    id: 'food',
    type: 'food',
    name: '美食记录',
    icon: '🍔',
    color: '#FF9500',
    placeholder: '今天吃了什么好吃的？',
    prompts: ['吃了什么？', '在哪里吃的？', '味道怎么样？', '和谁一起分享？', '会推荐给别人吗？'],
    fields: [
      {
        id: 'foodName',
        label: '美食名称',
        type: 'text',
        required: true,
        placeholder: '吃了什么？',
      },
      { id: 'location', label: '地点', type: 'location', required: false, placeholder: '餐厅名称' },
      { id: 'taste', label: '口味描述', type: 'text', required: false, placeholder: '味道如何？' },
      { id: 'rating', label: '推荐度', type: 'rating', required: false },
      { id: 'photos', label: '照片', type: 'image', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
  special: {
    id: 'special',
    type: 'special',
    name: '特别时刻',
    icon: '🎉',
    color: '#AF52DE',
    placeholder: '记录这个特别的时刻',
    prompts: [
      '是什么特别的日子？',
      '为什么重要？',
      '和谁一起度过？',
      '有什么仪式感？',
      '想对这个时刻说什么？',
    ],
    fields: [
      { id: 'title', label: '主题', type: 'text', required: true, placeholder: '特别的日子' },
      {
        id: 'occasion',
        label: '场合',
        type: 'text',
        required: false,
        placeholder: '生日/纪念日/节日...',
      },
      {
        id: 'companions',
        label: '同行人',
        type: 'people',
        required: false,
        placeholder: '和谁一起？',
      },
      {
        id: 'story',
        label: '故事',
        type: 'text',
        required: false,
        placeholder: '记录这个特别时刻',
      },
      { id: 'photos', label: '照片', type: 'image', required: false },
      { id: 'tags', label: '标签', type: 'tags', required: false },
    ],
  },
};

// 获取场景模板
export const getScenarioTemplate = (type: ScenarioType): ScenarioTemplate => {
  return SCENARIO_TEMPLATES[type];
};

// 获取所有场景类型
export const getAllScenarios = (): ScenarioType[] => {
  return Object.keys(SCENARIO_TEMPLATES) as ScenarioType[];
};

// 获取场景颜色
export const getScenarioColor = (type: ScenarioType): string => {
  return SCENARIO_TEMPLATES[type].color;
};

// 获取场景图标
export const getScenarioIcon = (type: ScenarioType): string => {
  return SCENARIO_TEMPLATES[type].icon;
};
