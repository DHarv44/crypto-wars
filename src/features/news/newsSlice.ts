import { StateCreator } from 'zustand';
import { NewsArticle } from '../../engine/types';

export interface NewsSlice {
  articles: NewsArticle[];
  maxArticles: number;

  // Actions
  addArticle: (article: NewsArticle) => void;
  addArticles: (articles: NewsArticle[]) => void;
  debunkArticle: (articleId: string, day: number) => void;
  markImpactRealized: (articleId: string) => void;
  getRecentNews: (n: number) => NewsArticle[];
  getNewsByAsset: (assetId: string) => NewsArticle[];
  getNewsByDay: (day: number) => NewsArticle[];
  clearOldNews: (beforeDay: number) => void;
}

export const createNewsSlice: StateCreator<NewsSlice> = (set, get) => ({
  articles: [],
  maxArticles: 200,

  addArticle: (article: NewsArticle) => {
    set((state) => ({
      articles: [article, ...state.articles].slice(0, state.maxArticles),
    }));
  },

  addArticles: (articles: NewsArticle[]) => {
    set((state) => ({
      articles: [...articles, ...state.articles].slice(0, state.maxArticles),
    }));
  },

  debunkArticle: (articleId: string, day: number) => {
    set((state) => ({
      articles: state.articles.map((a) =>
        a.id === articleId ? { ...a, debunkedDay: day } : a
      ),
    }));
  },

  markImpactRealized: (articleId: string) => {
    set((state) => ({
      articles: state.articles.map((a) =>
        a.id === articleId ? { ...a, impactRealized: true } : a
      ),
    }));
  },

  getRecentNews: (n: number) => {
    return get().articles.slice(0, n);
  },

  getNewsByAsset: (assetId: string) => {
    return get().articles.filter((a) => a.assetId === assetId);
  },

  getNewsByDay: (day: number) => {
    return get().articles.filter((a) => a.day === day);
  },

  clearOldNews: (beforeDay: number) => {
    set((state) => ({
      articles: state.articles.filter((a) => a.day >= beforeDay),
    }));
  },
});
