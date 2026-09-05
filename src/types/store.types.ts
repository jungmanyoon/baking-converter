/**
 * Zustand 스토어 타입 정의
 * 글로벌 상태 관리를 위한 타입 시스템
 */

import { Recipe, Ingredient, PanConfig, BreadMethod } from './recipe.types';

// ===== 앱 상태 관련 타입 =====
export interface AppState {
  // UI 상태
  activeTab: TabType;
  isLoading: boolean;
  error: ErrorState | null;

  // 사용자 설정
  userPreferences: UserPreferences;

  // 히스토리
  history: HistoryItem[];
  maxHistorySize: number;
}

export type TabType =
  | 'home'
  | 'dashboard'
  | 'workspace'
  | 'calculator'
  | 'pan-calculator'
  | 'excel-calculator'
  | 'converter'
  | 'pan-converter'
  | 'method-converter'
  | 'recipes'
  | 'view'
  | 'editor'
  | 'settings'
  | 'help'
  | 'privacy'
  | 'terms'
  | 'guide'
  | 'contact';

export interface ErrorState {
  message: string;
  code?: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
}

export interface UserPreferences {
  language: 'ko' | 'en';
  theme: 'light' | 'dark' | 'auto';
  defaultUnit: {
    weight: 'g' | 'kg' | 'oz' | 'lb';
    temperature: 'C' | 'F';
  };
  showTips: boolean;
  autoSave: boolean;
  precisionLevel: 0 | 1 | 2; // 소수점 자리수
}

export interface HistoryItem {
  id: string;
  type: 'calculation' | 'conversion';
  timestamp: Date;
  data: any; // 실제 계산/변환 데이터
  isFavorite: boolean;
}

// ===== 레시피 스토어 타입 =====
export interface RecipeStore {
  // 레시피 데이터
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  draftRecipe: Partial<Recipe> | null;

  // 필터/정렬
  filters: RecipeFilters;
  sortBy: RecipeSortOption;

  // 선택/편집
  selectedRecipeIds: string[];
  isEditing: boolean;

  // 액션
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  saveDraft: (draft: Partial<Recipe>) => void;
  clearDraft: () => void;
  importRecipes: (recipes: Recipe[]) => Promise<{ added: number; skipped: number }>;
  exportRecipes: (ids?: string[]) => Promise<Blob>;

  // 필터 & 정렬 액션
  setFilters: (filters: RecipeFilters) => void;
  setSortBy: (sortBy: RecipeSortOption) => void;
  clearFilters: () => void;
  getActiveFilterCount: () => number;
  getAvailableTags: () => string[];

  // 샘플 레시피 관리
  resetToSampleRecipes: () => void;
}

export interface RecipeFilters {
  category?: string[];
  difficulty?: string[];
  productType?: ('bread' | 'pastry')[];  // 🆕 제품 타입 필터 (제빵/제과)
  searchQuery?: string;
  tags?: string[];
  timeRange?: {
    min: number;
    max: number;
  };
}

export type RecipeSortOption =
  | 'name'
  | 'category'
  | 'difficulty'
  | 'createdAt'
  | 'updatedAt'
  | 'totalTime';

// ===== 계산기 스토어 타입 =====
export interface CalculatorStore {
  // 베이커스 퍼센트 계산
  bakersPercentage: BakersPercentageState;

  // DDT 계산
  ddtCalculation: DDTState;

  // 수율 계산
  yieldCalculation: YieldState;

  // 팬 변환
  panConversion: PanConversionState;

  // 제법 변환
  methodConversion: MethodConversionState;

  // 액션
  updateBakersPercentage: (data: Partial<BakersPercentageState>) => void;
  updateDDT: (data: Partial<DDTState>) => void;
  updateYield: (data: Partial<YieldState>) => void;
  updatePanConversion: (data: Partial<PanConversionState>) => void;
  updateMethodConversion: (data: Partial<MethodConversionState>) => void;
  resetCalculator: (type: CalculatorType) => void;
}

export type CalculatorType =
  | 'bakersPercentage'
  | 'ddt'
  | 'yield'
  | 'pan'
  | 'method';

export interface BakersPercentageState {
  flourAmount: number;
  ingredients: CalculatorIngredient[];
  totalHydration: number;
  totalPercentage: number;
  results: BakersPercentageResult | null;
}

export interface CalculatorIngredient {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  isLiquid: boolean;
}

export interface BakersPercentageResult {
  ingredients: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  totalWeight: number;
  hydration: number;
  yield: number;
}

export interface DDTState {
  targetTemp: number;
  flourTemp: number;
  roomTemp: number;
  prefermentTemp?: number;
  frictionFactor: number;
  includePreferment: boolean;
  results: DDTResult | null;
}

export interface DDTResult {
  waterTemp: number;
  adjustedWaterTemp?: number;
  warnings?: string[];
  recommendations?: string[];
}

export interface YieldState {
  originalYield: number;
  targetYield: number;
  ingredients: Ingredient[];
  scaleFactor: number;
  results: YieldResult | null;
}

export interface YieldResult {
  scaledIngredients: Ingredient[];
  totalWeight: number;
  pieceWeight?: number;
}

export interface PanConversionState {
  originalPan: PanConfig | null;
  targetPan: PanConfig | null;
  recipe: Recipe | null;
  results: PanConversionResult | null;
}

export interface PanConversionResult {
  scaleFactor: number;
  convertedRecipe: Recipe;
  adjustments: {
    temperature?: number;
    time?: number;
    notes?: string[];
  };
}

export interface MethodConversionState {
  originalMethod: BreadMethod;
  targetMethod: BreadMethod;
  recipe: Recipe | null;
  results: MethodConversionResult | null;
}

export interface MethodConversionResult {
  convertedRecipe: Recipe;
  prefermentIngredients?: Ingredient[];
  mainDoughIngredients?: Ingredient[];
  timelineChanges: TimelineChange[];
  tips: string[];
}

export interface TimelineChange {
  step: string;
  original: string;
  converted: string;
}

// ===== 전역 스토어 타입 =====
export interface GlobalStore extends AppState, RecipeStore, CalculatorStore {
  // 초기화
  initialize: () => Promise<void>;

  // 데이터 저장/로드
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;

  // 데이터 내보내기/가져오기
  exportData: () => Promise<Blob>;
  importData: (file: File) => Promise<void>;

  // 설정 관리
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // 에러 처리
  setError: (error: ErrorState | null) => void;
  clearError: () => void;

  // 히스토리 관리
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  toggleFavorite: (id: string) => void;
}
