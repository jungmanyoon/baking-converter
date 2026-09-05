/**
 * AdvancedDashboard - 제과제빵 전문가용 통합 레시피 변환 대시보드 v2
 *
 * 페르소나: --persona-frontend (UI/UX) + --persona-backend (데이터) + 제과제빵 도메인 전문가
 *
 * v2 개선사항:
 * - 팬 설정 변경 → 배수 자동 연동
 * - 동적 크기 최적화 (20-25개 재료 기준)
 * - 메모/공정 별도 하단 패널
 * - 사이드바 너비 확대
 * - 레시피 테이블 컴팩트화
 */

import { captureConversionGroups, recipeForConversion, conversionName } from '@/utils/recipeConversion';
import { useAppStore } from '@/stores/useAppStore';
import { syncRecipePhases } from '@/utils/recipeEditing';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecipeStore, useRecipeStorageStatus } from '@/stores/useRecipeStore';
import { useToastStore } from '@/stores/useToastStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLayoutSettings } from '@/hooks/useLayoutSettings';
import { useLocalization } from '@/hooks/useLocalization';
import ResizeHandle from '@/components/common/ResizeHandle';
import AutocompleteInput from '@/components/common/AutocompleteInput';
import BulkIngredientInput from '@/components/common/BulkIngredientInput';
import YieldLossCalculator from '@/components/common/YieldLossCalculator';
import { ProcessStageSelection, DEFAULT_STAGE_SELECTION } from '@/utils/calculations/yieldLoss';
import { findIngredientInfo } from '@/data/ingredientDatabase';
import {
  ChevronDown, ChevronRight, ChevronUp, Plus, Minus, X,
  Save, Flame, Scale, Wheat, Droplets, TrendingDown,
  Cookie, Layers, ThermometerSun, Link, Unlink,
  Clock, ListOrdered, RotateCcw, GripVertical, Copy, FileText, Pin, Info,
  Printer, CheckSquare, Square, Timer, Play,
  Soup, FlaskConical, Hourglass, Sparkles, CakeSlice, Brush, Droplet, Package,
  ClipboardList, Hash, Target, Snowflake, Moon,
  type LucideIcon
} from 'lucide-react';
import TimerManager from '@/components/pwa/TimerManager.jsx';
import BakingMode from '@/components/pwa/BakingMode';
import { SourceType } from '@/types/recipe.types';

// ============================================
// 타입 정의
// ============================================

interface PanEntry {
  id: string;
  mode: 'pan' | 'count';  // 팬 모드 / 개수 모드
  // 팬 모드 필드
  category: string;
  type: string;
  quantity: number;
  divisionCount: number;
  panWeight: number;
  divisionWeight: number;
  // 개수 모드 필드 (모닝빵 등)
  unitCount?: number;    // 개수
  unitWeight?: number;   // 개당 중량(g)
}

interface OvenSettings {
  type: 'convection' | 'deck' | 'airfryer';
  level: string;
  firstBake: { topTemp: number; bottomTemp: number; time: number };
  secondBake: { topTemp: number; bottomTemp: number; time: number };
}

interface MethodSettings {
  type: 'straight' | 'sponge' | 'poolish' | 'biga' | 'tangzhong' | 'autolyse' | 'levain' | 'coldFerment' | 'retard';
  flourRatio: number;
  waterRatio: number;
  yeastAdjustment: number;      // 전체 이스트 조정 계수 (1.0 = 100%)
  prefermentYeastRatio: number; // 사전반죽에 들어가는 이스트 비율 (0.0~1.0)
}

interface IngredientEntry {
  id: string;
  order: number;
  category: 'flour' | 'liquid' | 'wetOther' | 'other';
  subCategory: string;
  name: string;
  ratio: number;
  amount: number;
  note: string;
  moistureContent?: number;
  phase?: string;  // 'tangzhong', 'preferment', 'main', 'topping' 등
  phaseId?: string;
  phaseOrder?: number;  // 단계 내 순서
}

interface ProcessStep {
  id: string;
  order: number;
  description: string;
  time?: number;
  temp?: number;
  phase?: string;  // H4: 공정-단계 타임라인 그룹핑 ('tangzhong','preferment','main','topping' 등)
}

// ============================================
// 상수 데이터
// ============================================

// 팬 데이터는 컴포넌트 내부에서 useSettingsStore를 통해 동적으로 생성됨
// (PAN_DATA는 AdvancedDashboard 컴포넌트 내 useMemo로 관리)

// 제빵용 비용적 (cm³/g) - 학술 기준 참조
// 비용적이 높을수록 가볍고 에어리, 낮을수록 조밀함
const BREAD_SPECIFIC_VOLUMES: Record<string, number> = {
  '풀먼식빵': 3.4,      // 뚜껑 덮어 구움 → 조밀 (제과기능장 기준)
  '산형식빵': 4.2,      // 자유롭게 부풀음 → 에어리 (4.0~4.5)
  '버터톱식빵': 4.0,    // 산형 계열
  '옥수수식빵': 3.8,    // 중간
  '우유식빵': 4.0,      // 산형 계열
  '모닝빵': 3.2,        // 소형빵
  '베이글': 2.5,        // 매우 조밀 (삶는 공정)
  '브리오슈': 3.5,      // 버터 풍부, 중간 밀도
  '치아바타': 5.0,      // 고수화율 80%, 큰 기공
  '바게트': 5.5,        // 크러스트 비율 높음, 에어리
};

// 제과용 반죽 비중 (Specific Gravity) - 국내 제과제빵 기준
// 반죽 비중 = 반죽 무게 ÷ 물 무게 (같은 컵 사용), 낮을수록 공기 많음
const CAKE_BATTER_SPECIFIC_GRAVITY: Record<string, number> = {
  '파운드케이크': 0.83,     // 대한제과협회: 0.80-0.85 범위 중간값
  '레이어케이크': 0.83,     // 반죽형 케이크: 0.80-0.85
  '스펀지케이크': 0.55,     // 버터 스펀지(제누와즈): 0.50-0.60
  '시폰케이크': 0.45,       // 시폰/롤케이크: 0.40-0.50
  '엔젤푸드케이크': 0.40,   // 가장 가벼운 반죽 (추정)
  '무스케이크': 0.90,       // 무거운 반죽 (추정)
};

// 제과용 구운 후 비용적 (cm³/g) - 팬 계산용
// 반죽 비중 → 구운 후 비용적 변환 (대략적 추정)
const CAKE_SPECIFIC_VOLUMES: Record<string, number> = {
  '파운드케이크': 2.5,      // ScienceDirect 2025: 2.1-2.8 범위
  '레이어케이크': 2.5,      // 에멀전 케이크: 2.2-2.3
  '스펀지케이크': 2.3,      // 반죽비중 0.55 기준 추정
  '시폰케이크': 3.2,        // 반죽비중 0.45 기준 추정
  '엔젤푸드케이크': 4.5,    // 가장 가벼운 케이크
  '무스케이크': 1.8,        // 매우 조밀함
};

// 현재 화면은 제빵용 - 동적 비용적은 컴포넌트 내부에서 useMemo로 생성됨
// (기본값 BREAD_SPECIFIC_VOLUMES + 설정 스토어의 오버라이드)

// 팬 카테고리/타입 유효성 검증 헬퍼 함수는 컴포넌트 내부에서 동적 PAN_DATA와 함께 정의됨

// 제법 비율 (ChainBaker, Weekend Bakery 참조)
// flour: 전체 밀가루 중 사전반죽에 사용할 비율
// water: 사전반죽 밀가루 대비 수분 비율 (베이커스 퍼센트)
const METHOD_RATIOS: Record<string, { flour: number; water: number }> = {
  straight: { flour: 0, water: 0 },
  sponge: { flour: 0.5, water: 0.6 },       // 중종법: 밀가루 50%, 수분 60% (50-80%)
  poolish: { flour: 0.3, water: 1.0 },      // 폴리쉬: 밀가루 30%, 수분 100% (1:1 액종)
  biga: { flour: 0.3, water: 0.55 },        // 비가: 밀가루 30%, 수분 55% (건조한 반죽)
  tangzhong: { flour: 0.1, water: 5.0 },    // 탕종법: 밀가루 10%, 물 500% (1:5 호화)
  autolyse: { flour: 1.0, water: 0.65 },    // 오토리즈: 전체 밀가루, 수분 65%
  levain: { flour: 0.2, water: 1.0 },       // 르방: 밀가루 20%, 수분 100% (1:1 사워도우)
  coldFerment: { flour: 0, water: 0 },      // 저온발효: 사전반죽 없음 (냉장 발효)
  retard: { flour: 0, water: 0 },           // 저온숙성: 사전반죽 없음 (성형 후 냉장)
};

// 제법별 이스트 조정 기본값 (설정 스토어 fallback용)
// yeastAdjustment: 전체 이스트 조정 계수
// prefermentYeastRatio: 사전반죽에 들어가는 이스트 비율
const DEFAULT_METHOD_YEAST: Record<string, { yeastAdjustment: number; prefermentYeastRatio: number }> = {
  straight: { yeastAdjustment: 1.0, prefermentYeastRatio: 0 },
  sponge: { yeastAdjustment: 0.75, prefermentYeastRatio: 1.0 },    // 중종법: 이스트 75%, 전량 사전반죽
  poolish: { yeastAdjustment: 0.66, prefermentYeastRatio: 0.15 },  // 폴리쉬: 이스트 66% (SFBI 권장), 15% 사전반죽
  biga: { yeastAdjustment: 0.50, prefermentYeastRatio: 0.1 },      // 비가: 이스트 50% (SFBI 권장), 10% 사전반죽
  tangzhong: { yeastAdjustment: 1.0, prefermentYeastRatio: 0 },    // 탕종: 이스트 동일, 사전반죽 없음
  autolyse: { yeastAdjustment: 1.0, prefermentYeastRatio: 0 },     // 오토리즈: 이스트 동일, 사전반죽 없음
  levain: { yeastAdjustment: 0, prefermentYeastRatio: 0 },         // 르방: 상업 이스트 미사용
  coldFerment: { yeastAdjustment: 0.4, prefermentYeastRatio: 0 },  // 저온발효: 이스트 40% (장시간 발효로 감량)
  retard: { yeastAdjustment: 1.0, prefermentYeastRatio: 0 },       // 저온숙성: 성형 후 숙성이라 이스트 동일
};

// Translation keys for method labels (used with t() function)
const METHOD_KEYS: Record<string, string> = {
  straight: 'method.straight', sponge: 'method.sponge', poolish: 'method.poolish',
  biga: 'method.biga', tangzhong: 'method.tangzhong', autolyse: 'method.autolyse', levain: 'method.levain',
  coldFerment: 'method.coldFerment', retard: 'method.retard',
};

// 단계(Phase) 메타데이터 - 구분선 표시용 (labelKey for translation)
const PHASE_META: Record<string, { icon: LucideIcon; labelKey: string; bgColor: string; textColor: string; borderColor: string }> = {
  tangzhong: { icon: Soup, labelKey: 'phase.tangzhong', bgColor: 'bg-pink-50', textColor: 'text-pink-700', borderColor: 'border-pink-200' },
  preferment: { icon: FlaskConical, labelKey: 'phase.preferment', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  poolish: { icon: FlaskConical, labelKey: 'phase.poolish', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  biga: { icon: FlaskConical, labelKey: 'phase.biga', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  sponge: { icon: FlaskConical, labelKey: 'phase.sponge', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  levain: { icon: FlaskConical, labelKey: 'phase.levain', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  autolyse: { icon: Hourglass, labelKey: 'phase.autolyse', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  main: { icon: Wheat, labelKey: 'phase.mainDough', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  topping: { icon: Sparkles, labelKey: 'phase.topping', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  filling: { icon: CakeSlice, labelKey: 'phase.filling', bgColor: 'bg-rose-50', textColor: 'text-rose-700', borderColor: 'border-rose-200' },
  frosting: { icon: Brush, labelKey: 'phase.frosting', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' },
  glaze: { icon: Droplet, labelKey: 'phase.glaze', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-200' },
  other: { icon: Package, labelKey: 'ingredientCategory.other', bgColor: 'bg-surface-muted', textColor: 'text-ink-muted', borderColor: 'border-line' },
};

// 동적 크기 계산 (20-25개 재료 기준) - v2.2: 컴팩트 버전
const getDynamicStyles = (ingredientCount: number) => {
  const count = Math.max(ingredientCount, 6);
  const rowHeight = count > 15 ? 'py-0.5' : count > 10 ? 'py-1' : 'py-1';
  const fontSize = count > 20 ? 'text-xs' : count > 15 ? 'text-xs' : 'text-sm';
  return { rowHeight, fontSize };
};

// ============================================
// 접을 수 있는 섹션 컴포넌트
// ============================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
  onReset?: () => void;  // 초기화 콜백
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, icon, defaultOpen = true, badge, badgeColor = 'bg-surface-muted text-ink-muted', onReset, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-center justify-between px-3 py-2 hover:bg-surface-muted">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex-1 flex items-center gap-2 text-sm font-semibold text-ink-muted text-left"
        >
          {icon}
          <span>{title}</span>
          {badge && (
            <span className={`px-1.5 py-0.5 text-xs rounded ${badgeColor}`}>
              {badge}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          {onReset && (
            <button
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="p-1 text-ink-disabled hover:text-ink-muted hover:bg-surface-muted rounded transition-colors"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button aria-label={title} aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} className="p-1">
            {isOpen ? <ChevronDown className="w-4 h-4 text-ink-disabled" /> : <ChevronRight className="w-4 h-4 text-ink-disabled" />}
          </button>
        </div>
      </div>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
};

// ============================================
// 새 레시피 기본값 / 예시 데이터
// ============================================

// 새 레시피는 빈 재료 1행으로 시작 (예시는 "예시 불러오기"로만 주입)
const createStarterIngredients = (): IngredientEntry[] => [
  { id: 'ing-1', order: 1, category: 'flour', subCategory: '가루', name: '', ratio: 0, amount: 0, note: '' },
];

// 예시 데이터: 기본 식빵(강력분 기준). "예시 불러오기" 버튼으로만 주입됨.
const SAMPLE_INGREDIENTS: IngredientEntry[] = [
  { id: '1', order: 1, category: 'flour', subCategory: '가루', name: '강력분', ratio: 100, amount: 500, note: '' },
  { id: '2', order: 2, category: 'liquid', subCategory: '수분', name: '물', ratio: 70, amount: 350, note: '' },
  { id: '3', order: 3, category: 'other', subCategory: '기타', name: '소금', ratio: 2, amount: 10, note: '' },
  { id: '4', order: 4, category: 'other', subCategory: '기타', name: '이스트', ratio: 1, amount: 5, note: '' },
  { id: '5', order: 5, category: 'other', subCategory: '기타', name: '설탕', ratio: 6, amount: 30, note: '' },
  { id: '6', order: 6, category: 'wetOther', subCategory: '유지', name: '버터', ratio: 10, amount: 50, note: '' },
];

const SAMPLE_PROCESSES: ProcessStep[] = [
  { id: '1', order: 1, description: '재료 계량', time: 10 },
  { id: '2', order: 2, description: '1차 믹싱 (저속 3분 → 중속 5분)', time: 8 },
  { id: '3', order: 3, description: '1차 발효 (27°C, 75%)', time: 60, temp: 27 },
  { id: '4', order: 4, description: '분할 및 둥글리기' },
  { id: '5', order: 5, description: '중간 발효', time: 15 },
  { id: '6', order: 6, description: '성형 및 패닝' },
  { id: '7', order: 7, description: '2차 발효 (35°C, 85%)', time: 50, temp: 35 },
  { id: '8', order: 8, description: '굽기', time: 24, temp: 200 },
];

// ============================================
// 메인 컴포넌트
// ============================================

const AdvancedDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { translateIngredient, translateProcessStep, getLocalizedPanCategory, getLocalizedPanName, getLocalizedProductName } = useLocalization();
  const { addRecipe, updateRecipe, currentRecipe, recipes } = useRecipeStore();
  const { addToast } = useToastStore();
  const { pan: panSettings, product: productSettings, method: methodSettings } = useSettingsStore();

  // 설정에서 비용적 데이터를 동적으로 생성 (기본값 + 오버라이드)
  const SPECIFIC_VOLUMES = useMemo(() => {
    // 기본값을 복사하고 설정 스토어의 오버라이드 적용
    return {
      ...BREAD_SPECIFIC_VOLUMES,
      ...CAKE_SPECIFIC_VOLUMES,  // 제과 비용적 추가
      ...productSettings.breadVolumes,
      ...productSettings.cakeVolumes,  // [C-6 수정] 케이크 비용적 오버라이드 병합
      // 커스텀 제품 추가 (bread/cake/pastry/other 4종 모두 반영)
      ...productSettings.customProducts
        .reduce((acc, p) => ({ ...acc, [p.name]: p.specificVolume }), {} as Record<string, number>)
    };
  }, [productSettings.breadVolumes, productSettings.cakeVolumes, productSettings.customProducts]);

  // 설정에서 팬 데이터를 동적으로 생성 (카테고리별 그룹화)
  const PAN_DATA = useMemo(() => {
    const grouped: Record<string, { name: string; volume: number }[]> = {};

    // 설정의 모든 팬을 카테고리별로 그룹화
    panSettings.myPans.forEach(pan => {
      const category = pan.category || '기타';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        name: pan.name,
        volume: pan.volume
      });
    });

    // 빈 카테고리 방지: 최소 하나의 기본 카테고리 보장
    if (Object.keys(grouped).length === 0) {
      grouped['식빵틀'] = [{ name: '기본 식빵틀', volume: 2350 }];
    }

    return grouped;
  }, [panSettings.myPans]);

  // 번역된 카테고리 라벨 (동적으로 생성)
  const CATEGORY_LABELS = useMemo(() => ({
    flour: t('dashboard.flour'),
    liquid: t('dashboard.liquid'),
    wetOther: t('dashboard.fat'),
    other: t('dashboard.other'),
  }), [t]);

  // 번역된 제법 라벨 (동적으로 생성)
  const METHOD_LABELS = useMemo(() => ({
    straight: t('method.straight'),
    sponge: t('method.sponge'),
    poolish: t('method.poolish'),
    biga: t('method.biga'),
    tangzhong: t('method.tangzhong'),
    autolyse: t('method.autolyse'),
    levain: t('method.levain'),
    coldFerment: t('method.coldFerment'),
    retard: t('method.retard'),
  }), [t]);

  // 팬 카테고리 목록 (동적으로 생성)
  const panCategories = useMemo(() => Object.keys(PAN_DATA), [PAN_DATA]);

  // 기본 카테고리 및 팬 타입
  const defaultCategory = panCategories[0] || '식빵틀';
  const defaultPanType = PAN_DATA[defaultCategory]?.[0]?.name || '옥수수 식빵틀 (22.5cm)';
  const defaultPanVolume = PAN_DATA[defaultCategory]?.[0]?.volume || 2350;

  // 팬 카테고리 유효성 검증 헬퍼 함수 (동적 PAN_DATA 사용)
  const getValidPanCategory = useCallback((category: string | undefined): string => {
    if (category && panCategories.includes(category)) {
      return category;
    }
    return defaultCategory;
  }, [panCategories, defaultCategory]);

  // 팬 타입 유효성 검증 헬퍼 함수 (동적 PAN_DATA 사용)
  const getValidPanType = useCallback((category: string, type: string | undefined): string => {
    const panList = PAN_DATA[category];
    if (panList && type) {
      const found = panList.find((p: { name: string; volume: number }) => p.name === type);
      if (found) return type;
    }
    return panList?.[0]?.name || defaultPanType;
  }, [PAN_DATA, defaultPanType]);

  // 레이아웃 설정 (localStorage 자동 저장)
  const {
    settings: layoutSettings,
    setSidebarWidth,
    setProcessPanelHeight,
    setProcessItemSize,
    getProcessItemSize,
    setConversionMode,
    resetSettings: resetLayoutSettings,
  } = useLayoutSettings();

  // 변환기 표시 모드 (간단/전문가) — persist는 useLayoutSettings(localStorage)가 담당.
  // 순수 조건부 렌더용 값: 상태 강제변이 없이 표시만 토글(저위험).
  const conversionMode = layoutSettings.conversionMode;
  const isExpertMode = conversionMode === 'expert';
  const [mobileSection, setMobileSection] = useState('ingredients');

  // 제품 정보
  const [productName, setProductName] = useState(t('advDashboard.defaultRecipeName'));
  const [productType, setProductType] = useState<'bread' | 'pastry'>('bread');

  // 출처 정보
  const [source, setSource] = useState<{
    name: string;
    type: SourceType;
    url?: string;
    author?: string;
  }>({
    name: '',
    type: 'personal',
    url: '',
    author: ''
  });

  // 원래 팬 설정 (레시피 원본) - 비용적으로 계산된 초기값 사용
  // 기본 팬 용량 및 무게 계산 (동적 설정에서 가져옴)
  const initialPanVolume = defaultPanVolume || 2350;
  const defaultPanWeight = Math.round(initialPanVolume / 3.4);  // 비용적 3.4 기준
  const [originalPan, setOriginalPan] = useState({
    mode: 'pan' as 'pan' | 'count',
    category: defaultCategory, type: defaultPanType, quantity: 1, panWeight: defaultPanWeight,
    divisionCount: 1, divisionWeight: defaultPanWeight,  // 분할 정보
    unitCount: 10, unitWeight: 50,  // 개수 모드용
  });

  // 변환 팬 설정 (목표)
  const [pans, setPans] = useState<PanEntry[]>([
    { id: '1', mode: 'pan', category: defaultCategory, type: defaultPanType, quantity: 1, divisionCount: 1, panWeight: defaultPanWeight, divisionWeight: defaultPanWeight, unitCount: 10, unitWeight: 50 }
  ]);

  // 비용적 설정
  const [originalProduct, setOriginalProduct] = useState('산형식빵');
  const [convertedProduct, setConvertedProduct] = useState('산형식빵');

  // 오븐 설정
  const [oven, setOven] = useState<OvenSettings>({
    type: 'convection',
    level: '',  // 빈 값으로 초기화
    firstBake: { topTemp: 200, bottomTemp: 170, time: 24 },
    secondBake: { topTemp: 0, bottomTemp: 0, time: 0 },
  });

  // 제법 설정
  const [method, setMethod] = useState<MethodSettings>({
    type: 'straight',
    flourRatio: 0,
    waterRatio: 0,
    yeastAdjustment: 1.0,
    prefermentYeastRatio: 0
  });
  const [usePreferment, setUsePreferment] = useState(false);

  // 재료 (새 레시피는 빈 1행으로 시작, 예시는 "예시 불러오기"로 주입)
  const [ingredients, setIngredients] = useState<IngredientEntry[]>(createStarterIngredients);

  // 공정 (새 레시피는 비어서 시작)
  const [processes, setProcesses] = useState<ProcessStep[]>([]);

  // 메모
  const [memo, setMemo] = useState('');

  // 예시 데이터 로드 여부 (상단 "예시 데이터" 배지 표시용). 실제 레시피 로드 시 해제.
  const [exampleLoaded, setExampleLoaded] = useState(false);

  // 현재 편집 중인 공정 ID (편집 중일 때는 원본 표시, 아닐 때는 번역 표시)
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

  // 데스크톱(lg, 1024px+) 여부 추적
  // 사이드바/공정 패널의 인라인 고정폭/높이(style)는 모바일에서 가로 스크롤을 유발하므로
  // lg 이상에서만 인라인 style을 적용하고, 모바일에서는 Tailwind 반응형 클래스(w-full 등)에 맡긴다.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    // 초기 동기화 + 변경 구독 (구형 Safari 호환 위해 addListener 폴백)
    setIsDesktop(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, []);

  // 수율 예측 공정 선택 상태
  const [yieldStageSelection, setYieldStageSelection] = useState<ProcessStageSelection>({
    ...DEFAULT_STAGE_SELECTION
  });

  // 중복 로드 방지를 위한 ref (ID + updatedAt으로 변경 감지)
  const lastLoadedRecipeKey = useRef<string | null>(null);

  // ============================================
  // currentRecipe 로드
  // ============================================
  useEffect(() => {
    if (currentRecipe) {
      const loadedRecipe = recipeForConversion(currentRecipe);
      // ID + updatedAt으로 고유 키 생성 (저장 후 변경사항 반영)
      const recipeKey = `${currentRecipe.id}-${currentRecipe.updatedAt?.toString() || ''}`;

      if (recipeKey === lastLoadedRecipeKey.current) {
        return; // 이미 로드된 동일한 레시피
      }
      lastLoadedRecipeKey.current = recipeKey;

      // 레시피 이름 로드
      setProductName(loadedRecipe.name || t('advDashboard.defaultRecipeName'));

      // 제품 타입 로드 (기본값: bread)
      setProductType(loadedRecipe.productType || 'bread');

      // 출처 정보 로드
      if (loadedRecipe.source) {
        setSource({
          name: loadedRecipe.source.name || '',
          type: loadedRecipe.source.type || 'personal',
          url: loadedRecipe.source.url || '',
          author: loadedRecipe.source.author || ''
        });
      } else {
        setSource({ name: '', type: 'personal', url: '', author: '' });
      }

      // 재료 로드 (phases가 있으면 phases에서, 없으면 ingredients에서)
      const loadedIngredients: IngredientEntry[] = [];

      // phases가 있는 레시피 (탕종, 사전반죽 등)
      if (loadedRecipe.phases && Array.isArray(loadedRecipe.phases) && loadedRecipe.phases.length > 0) {
        let globalOrder = 1;
        loadedRecipe.phases.forEach((phase: any) => {
          if (phase.ingredients && Array.isArray(phase.ingredients)) {
            phase.ingredients.forEach((ing: any, ingIdx: number) => {
              const cat = ing.category || 'other';
              let dashboardCategory: 'flour' | 'liquid' | 'wetOther' | 'other' = 'other';
              let subCat = '기타';

              if (cat === 'flour' || ing.isFlour) {
                dashboardCategory = 'flour';
                subCat = '가루';
              } else if (cat === 'liquid') {
                dashboardCategory = 'liquid';
                subCat = '수분';
              } else if (cat === 'fat') {
                dashboardCategory = 'wetOther';
                subCat = '유지';
              }

              loadedIngredients.push({
                id: ing.id || `${Date.now()}-${phase.id}-${ingIdx}`,
                order: globalOrder++,
                category: dashboardCategory,
                subCategory: subCat,
                name: ing.name || '',
                ratio: ing.percentage || 0,
                amount: parseFloat(ing.amount) || 0,
                note: ing.note || '',
                moistureContent: ing.moistureContent,
                phaseId: phase.id,
                phase: phase.type || phase.id || 'main',  // 단계 타입
                phaseOrder: phase.order || 0,  // 단계 순서
              });
            });
          }
        });
      }
      // phases가 없는 레시피 (일반 레시피)
      else if (loadedRecipe.ingredients && Array.isArray(loadedRecipe.ingredients)) {
        loadedRecipe.ingredients.forEach((ing: any, idx: number) => {
          const cat = ing.category || ing.type || 'other';
          let dashboardCategory: 'flour' | 'liquid' | 'wetOther' | 'other' = 'other';
          let subCat = '기타';

          if (cat === 'flour' || ing.isFlour) {
            dashboardCategory = 'flour';
            subCat = '가루';
          } else if (cat === 'liquid') {
            dashboardCategory = 'liquid';
            subCat = '수분';
          } else if (cat === 'fat') {
            dashboardCategory = 'wetOther';
            subCat = '유지';
          }

          loadedIngredients.push({
            id: ing.id || `${Date.now()}-${idx}`,
            order: idx + 1,
            category: dashboardCategory,
            subCategory: subCat,
            name: ing.name || '',
            ratio: ing.percentage || 0,
            amount: parseFloat(ing.amount) || 0,
            note: ing.note || '',
            moistureContent: ing.moistureContent,
            phaseId: ing.phaseId,
            phase: ing.phase || 'main',  // 저장된 phase 값 로드, 없으면 기본값: 본반죽
            phaseOrder: ing.phaseOrder || 0,
          });
        });
      }

      if (loadedIngredients.length > 0) {
        setIngredients(loadedIngredients);
      } else {
        // 빈(새) 레시피: 예시 자동주입 금지 -> 빈 재료 1행 + 공정/메모 초기화
        setIngredients(createStarterIngredients());
        setProcesses([]);
        setMemo('');
      }
      // 실제 레시피를 로드했으므로 예시 배지 해제
      setExampleLoaded(false);

      // 공정 로드
      if (loadedRecipe.steps && Array.isArray(loadedRecipe.steps)) {
        const loadedProcesses: ProcessStep[] = loadedRecipe.steps.map((step: any, idx: number) => ({
          id: step.id || `${Date.now()}-${idx}`,
          order: step.order || idx + 1,
          description: step.instruction || step.action || step.description || '',
          time: step.duration?.target || step.time,
          temp: step.temperature?.target || step.temp,
          phase: step.phase || 'main',  // H4: 공정 단계(미지정 시 본반죽)
        }));
        if (loadedProcesses.length > 0) {
          setProcesses(loadedProcesses);
        }
      }

      // 오븐 설정 로드
      if (loadedRecipe.ovenSettings) {
        const ovenData = loadedRecipe.ovenSettings as any;
        const secondBakeData = ovenData.secondBake;
        setOven({
          type: ovenData.mode === 'deck' ? 'deck' :
                ovenData.mode === 'airfryer' ? 'airfryer' : 'convection',
          level: ovenData.deck || '',
          firstBake: {
            topTemp: ovenData.temperature || 200,
            bottomTemp: ovenData.bottomTemperature || ovenData.temperature || 170,  // 하부 온도 로드
            time: ovenData.duration || 24,  // 저장된 굽기 시간 로드
          },
          secondBake: secondBakeData ? {
            topTemp: secondBakeData.topTemp || 0,
            bottomTemp: secondBakeData.bottomTemp || 0,
            time: secondBakeData.time || 0,
          } : { topTemp: 0, bottomTemp: 0, time: 0 },
        });
      }

      // 제법 설정 로드
      if (loadedRecipe.method) {
        const methodData = loadedRecipe.method as any;
        let methodType = typeof methodData === 'string' ? methodData : methodData.method || methodData.type || 'straight';
        // sourdough는 levain으로 매핑 (동일한 개념)
        if (methodType === 'sourdough') methodType = 'levain';
        // 유효한 제법 타입으로 제한
        const validMethods = ['straight', 'sponge', 'poolish', 'biga', 'tangzhong', 'autolyse', 'levain', 'coldFerment', 'retard'];
        if (!validMethods.includes(methodType)) methodType = 'straight';

        // 설정 스토어에서 해당 제법의 이스트 조정값 가져오기 (없으면 로컬 기본값 사용)
        const methodConfig = methodSettings?.methods?.[methodType];
        const defaultYeast = DEFAULT_METHOD_YEAST[methodType] || { yeastAdjustment: 1.0, prefermentYeastRatio: 0 };
        setMethod({
          type: methodType as 'straight' | 'sponge' | 'poolish' | 'biga' | 'tangzhong' | 'autolyse' | 'levain' | 'coldFerment' | 'retard',
          flourRatio: methodData.prefermentRatio || 0,
          waterRatio: methodData.waterRatio || 0,
          yeastAdjustment: methodData.yeastAdjustment ?? methodConfig?.yeastAdjustment ?? defaultYeast.yeastAdjustment,
          prefermentYeastRatio: methodData.prefermentYeastRatio ?? methodConfig?.prefermentYeastRatio ?? defaultYeast.prefermentYeastRatio,
        });
        // 중종법, 폴리쉬법 등이면 발효종 사용 활성화
        setUsePreferment(methodData.usePreferment ?? methodType !== 'straight');
      }

      // 팬 설정 로드
      if (loadedRecipe.panConfig) {
        const panData = loadedRecipe.panConfig as any;
        // 카테고리 유효성 검증 - PAN_DATA에 없는 카테고리는 기본값으로 fallback
        const rawCategory = panData.name || panData.category || defaultCategory;
        const panCategory = getValidPanCategory(rawCategory);
        // 팬 타입 유효성 검증 - 해당 카테고리에 없는 타입은 첫 번째 팬으로 fallback
        const rawType = panData.type || defaultPanType;
        const panType = getValidPanType(panCategory, rawType);
        const panQuantity = panData.quantity || 1;
        const panMode = panData.mode || 'pan';

        // 저장된 팬 무게가 있으면 사용, 없으면 계산
        let panWeight = panData.panWeight;
        if (!panWeight) {
          // 팬 볼륨 찾기
          let panVolume = defaultPanVolume; // 설정의 기본 팬 볼륨
          for (const [, panList] of Object.entries(PAN_DATA)) {
            const found = (panList as any[]).find(p => p.name === panType);
            if (found) {
              panVolume = found.volume;
              break;
            }
          }
          // 비용적 기반 팬 무게 계산 (산형식빵 기준: 4.2)
          const specificVolume = SPECIFIC_VOLUMES[convertedProduct] || 4.2;
          panWeight = Math.round(panVolume / specificVolume);
        }

        // 원래 팬 설정 (저장된 originalPan이 있으면 사용) + 유효성 검증
        if (panData.originalPan) {
          const op = panData.originalPan;
          const unitCount = Math.max(1, op.unitCount || 10);
          const unitWeight = Math.max(1, op.unitWeight || 50);

          // 카테고리/타입 유효성 검증
          const opCategory = getValidPanCategory(op.category);
          const opType = getValidPanType(opCategory, op.type);

          // count 모드일 때 panWeight를 unitCount × unitWeight로 재계산
          let calculatedPanWeight = Math.abs(op.panWeight || 500);
          if (op.mode === 'count') {
            calculatedPanWeight = unitCount * unitWeight;
          }

          setOriginalPan({
            ...op,
            category: opCategory,
            type: opType,
            panWeight: calculatedPanWeight,
            quantity: Math.max(1, Math.abs(op.quantity || 1)),
            divisionCount: Math.max(1, op.divisionCount || 1),
            divisionWeight: Math.abs(op.divisionWeight || calculatedPanWeight || 500),
            unitCount: unitCount,
            unitWeight: unitWeight,
          });
        } else {
          setOriginalPan(prev => ({
            ...prev,
            mode: panMode as 'pan' | 'count',
            category: panCategory,
            type: panType,
            quantity: Math.max(1, panQuantity),
            panWeight: Math.abs(panWeight || 500),
            divisionWeight: Math.abs(panWeight || 500),
          }));
        }

        // 변환 팬 설정 (저장된 전체 팬 배열이 있으면 사용)
        if (panData.pans && Array.isArray(panData.pans) && panData.pans.length > 0) {
          // 저장된 팬 배열 복원 + 유효성 검증 (음수 방지 + 카테고리/타입 검증)
          const validatedPans = panData.pans.map((p: any) => {
            const pUnitCount = Math.max(1, p.unitCount || 10);
            const pUnitWeight = Math.max(1, p.unitWeight || 50);
            // 카테고리/타입 유효성 검증
            const pCategory = getValidPanCategory(p.category);
            const pType = getValidPanType(pCategory, p.type);
            // count 모드일 때 panWeight를 unitCount × unitWeight로 재계산
            let pPanWeight = Math.abs(p.panWeight || 500);
            if (p.mode === 'count') {
              pPanWeight = pUnitCount * pUnitWeight;
            }
            return {
              ...p,
              category: pCategory,
              type: pType,
              panWeight: pPanWeight,
              quantity: Math.max(1, Math.abs(p.quantity || 1)),
              divisionCount: Math.max(1, p.divisionCount || 1),
              divisionWeight: Math.abs(p.divisionWeight || pPanWeight || 500),
              unitCount: pUnitCount,
              unitWeight: pUnitWeight,
            };
          });
          setPans(validatedPans);
        } else {
          // 이전 형식 호환: 단일 팬으로 복원
          setPans([{
            id: '1',
            mode: panMode as 'pan' | 'count',
            category: panCategory,
            type: panType,
            quantity: Math.max(1, panQuantity),
            divisionCount: 1,
            panWeight: Math.abs(panWeight || 500),
            divisionWeight: Math.abs(panWeight || 500),
            unitCount: 10,
            unitWeight: 50,
          }]);
        }
      }

      // 비용적 설정 로드
      if (loadedRecipe.specificVolume) {
        const svData = loadedRecipe.specificVolume;
        if (svData.original) setOriginalProduct(svData.original);
        if (svData.converted) setConvertedProduct(svData.converted);
      } else if (loadedRecipe.tags && Array.isArray(loadedRecipe.tags)) {
        // 이전 형식: tags에서 비용적 추출 시도
        const svFromTags = loadedRecipe.tags.find((t: string) =>
          SPECIFIC_VOLUMES[t] !== undefined
        );
        if (svFromTags) {
          setOriginalProduct(svFromTags);
          setConvertedProduct(svFromTags);
        }
      }

      // 배수 설정 로드 + 유효성 검증 (음수/0 방지)
      if (loadedRecipe.multiplierConfig) {
        const mcData = loadedRecipe.multiplierConfig;
        if (typeof mcData.multiplier === 'number') {
          // 배수는 최소 0.01 이상 보장
          setMultiplier(Math.max(0.01, Math.abs(mcData.multiplier) || 1));
          setMultiplierInput(String(Math.max(0.01, Math.abs(mcData.multiplier) || 1)));
        }
        if (typeof mcData.isPanLinked === 'boolean') setIsPanLinked(mcData.isPanLinked);
      }

      // 메모 로드
      if (loadedRecipe.notes) {
        setMemo(loadedRecipe.notes);
      }

      // 수율 예측 공정 선택 상태 로드
      if (loadedRecipe.yieldStageSelection) {
        setYieldStageSelection({
          ...DEFAULT_STAGE_SELECTION,
          ...loadedRecipe.yieldStageSelection
        });
      } else {
        // 저장된 상태가 없으면 기본값으로 리셋
        setYieldStageSelection({ ...DEFAULT_STAGE_SELECTION });
      }


    }
  }, [currentRecipe]);

  // 배수 및 연동 설정
  const [multiplier, setMultiplier] = useState(1);
  const [isPanLinked, setIsPanLinked] = useState(true); // 팬-배수 연동 여부
  const [multiplierInput, setMultiplierInput] = useState('1'); // 배수 입력 필드

  /**
   * 배수 입력 파싱 (다양한 형식 지원)
   * x2, 2x, 2배, ×2, *2 → 2
   * /2, 1/2, ÷2 → 0.5
   * 0.5, .5 → 0.5
   */
  const parseMultiplierInput = useCallback((input: string): number | null => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    // x2, 2x, ×2, *2, 2배 형식
    let match = trimmed.match(/^[x×*]?\s*(\d+\.?\d*)\s*[x×배]?$/);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return val;
    }

    // /2, ÷2 형식 (나누기)
    match = trimmed.match(/^[/÷]\s*(\d+\.?\d*)$/);
    if (match) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) return 1 / val;
    }

    // 1/2, 1/3 분수 형식
    match = trimmed.match(/^(\d+)\s*[/÷]\s*(\d+)$/);
    if (match) {
      const num = parseFloat(match[1]);
      const den = parseFloat(match[2]);
      if (!isNaN(num) && !isNaN(den) && den > 0) return num / den;
    }

    // 순수 숫자
    const numVal = parseFloat(trimmed);
    if (!isNaN(numVal) && numVal > 0) return numVal;

    return null;
  }, []);

  // 배수 입력 처리
  const handleMultiplierInputChange = useCallback((value: string) => {
    setMultiplierInput(value);
  }, []);

  // 배수 입력 확정 (Enter 또는 blur)
  const handleMultiplierInputConfirm = useCallback(() => {
    const parsed = parseMultiplierInput(multiplierInput);
    if (parsed !== null) {
      const clamped = Math.max(0.01, Math.min(100, parsed));
      setMultiplier(Math.round(clamped * 100) / 100);
      setMultiplierInput(String(Math.round(clamped * 100) / 100));
    } else {
      // 파싱 실패 시 현재 값으로 복원
      setMultiplierInput(String(multiplier));
    }
  }, [multiplierInput, multiplier, parseMultiplierInput]);

  // 빠른 배수 클릭
  const handleQuickMultiplier = useCallback((value: number) => {
    setMultiplier(value);
    setMultiplierInput(String(value));
  }, []);

  // ============================================
  // 계산 함수
  // ============================================

  const flourTotal = useMemo(() =>
    ingredients.filter(i => i.category === 'flour').reduce((sum, i) => sum + i.amount, 0),
    [ingredients]
  );

  const liquidTotal = useMemo(() =>
    ingredients.filter(i => i.category === 'liquid').reduce((sum, i) => sum + i.amount, 0),
    [ingredients]
  );

  const wetOtherMoisture = useMemo(() =>
    ingredients.filter(i => i.category === 'wetOther' && i.moistureContent)
      .reduce((sum, i) => sum + (i.amount * (i.moistureContent || 0)), 0),
    [ingredients]
  );

  const totalWeight = useMemo(() =>
    ingredients.reduce((sum, i) => sum + i.amount, 0),
    [ingredients]
  );

  // 재료를 단계(phase)별로 그룹화 - 구분선 표시용
  const ingredientsByPhase = useMemo(() => {
    // 단계 순서 정의 (사전반죽 계열 먼저, 본반죽, 그 다음 토핑 등)
    const phaseOrder: Record<string, number> = {
      tangzhong: 0, preferment: 1, poolish: 1, biga: 1, sponge: 1, levain: 1, autolyse: 2,
      main: 10, topping: 20, filling: 21, frosting: 22, glaze: 23, other: 99
    };

    // 카테고리 순서 정의 (밀가루 → 수분 → 유지 → 기타)
    const categoryOrder: Record<string, number> = {
      flour: 0, liquid: 1, wetOther: 2, other: 3
    };

    // 재료를 단계별로 그룹화
    const grouped = ingredients.reduce((acc, ing) => {
      const phase = ing.phase || 'main';
      if (!acc[phase]) {
        acc[phase] = [];
      }
      acc[phase].push(ing);
      return acc;
    }, {} as Record<string, IngredientEntry[]>);

    // 단계 순서대로 정렬하여 배열로 변환 (각 단계 내에서 카테고리별 정렬)
    const sortedPhases = Object.entries(grouped)
      .sort(([a], [b]) => (phaseOrder[a] ?? 50) - (phaseOrder[b] ?? 50))
      .map(([phase, items]) => ({
        phase,
        items: items.sort((a, b) =>
          (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
        )
      }));

    return sortedPhases;
  }, [ingredients]);

  // 단계가 2개 이상인지 (구분선 표시 여부 결정)
  const hasMultiplePhases = ingredientsByPhase.length > 1;

  // H4: 공정(steps)을 재료와 동일한 phase 축으로 그룹화 - 타임라인 표시용.
  // 재료 phaseOrder 와 동일 순서라 재료표/공정 패널이 같은 흐름으로 정렬된다.
  const processesByPhase = useMemo(() => {
    const phaseOrder: Record<string, number> = {
      tangzhong: 0, preferment: 1, poolish: 1, biga: 1, sponge: 1, levain: 1, autolyse: 2,
      main: 10, topping: 20, filling: 21, frosting: 22, glaze: 23, other: 99
    };
    const grouped = processes.reduce((acc, p) => {
      const phase = p.phase || 'main';
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(p);
      return acc;
    }, {} as Record<string, ProcessStep[]>);
    return Object.entries(grouped)
      .sort(([a], [b]) => (phaseOrder[a] ?? 50) - (phaseOrder[b] ?? 50))
      .map(([phase, items]) => ({ phase, items }));
  }, [processes]);

  // 공정 단계가 2개 이상일 때만 타임라인 구분선 노출 (단일 단계 = 기존 flat 동작 유지)
  const hasMultipleProcessPhases = processesByPhase.length > 1;

  const hydration = useMemo(() =>
    flourTotal === 0 ? 0 : Math.round(((liquidTotal + wetOtherMoisture) / flourTotal) * 1000) / 10,
    [flourTotal, liquidTotal, wetOtherMoisture]
  );

  // 원래 팬 합계 (레시피 원본 기준) - 음수 방지
  const originalPanTotalWeight = useMemo(() => {
    // count 모드일 때는 unitCount × unitWeight로 직접 계산
    if (originalPan.mode === 'count') {
      return Math.max((originalPan.unitCount || 10) * (originalPan.unitWeight || 50), 1);
    }
    // 팬 모드일 때는 panWeight × quantity
    const weight = Math.abs(originalPan.panWeight || 500);
    const qty = Math.max(1, Math.abs(originalPan.quantity || 1));
    return Math.max(weight * qty, 1);  // 최소 1g
  }, [originalPan.panWeight, originalPan.quantity, originalPan.mode, originalPan.unitCount, originalPan.unitWeight]);

  // 변환 팬 합계 (목표) - 음수 방지
  const panTotalWeight = useMemo(() => {
    const total = pans.reduce((sum, p) => {
      // count 모드일 때는 unitCount × unitWeight로 직접 계산
      if (p.mode === 'count') {
        return sum + ((p.unitCount || 10) * (p.unitWeight || 50));
      }
      // 팬 모드일 때는 panWeight × quantity
      const weight = Math.abs(p.panWeight || 0);
      const qty = Math.abs(p.quantity || 1);
      return sum + (weight * qty);
    }, 0);
    return Math.max(total, 0);
  }, [pans]);

  // 자동 계산된 배수 (팬 연동 시 사용)
  // 핵심: 원래팬 → 변환팬의 비율이 배수가 됨
  // 안전장치: 배수는 항상 양수 (최소 0.01)
  const autoMultiplier = useMemo(() => {
    // 0 또는 음수 방지
    const origWeight = Math.abs(originalPanTotalWeight) || 1;
    const targetWeight = Math.abs(panTotalWeight) || 1;
    if (origWeight === 0) return 1;
    const ratio = targetWeight / origWeight;
    // 최소 0.01, 최대 제한 없음
    return Math.max(0.01, Math.round(ratio * 100) / 100);
  }, [panTotalWeight, originalPanTotalWeight]);

  // 실제 사용할 배수: 연동 시 자동계산, 비연동 시 수동입력
  const effectiveMultiplier = isPanLinked ? autoMultiplier : multiplier;

  // 재료가 사실상 비어있는지(새 레시피) — 안내 배너/예시 버튼 노출 판단
  const isEmptyRecipe = useMemo(
    () => ingredients.every(i => !i.name?.trim() && !i.amount),
    [ingredients]
  );

  // 비용적(convertedProduct) 변경 시 팬 모드인 팬만 panWeight 재계산
  useEffect(() => {
    setPans(prev => prev.map(pan => {
      // 개수 모드는 비용적 영향 없음
      if (pan.mode === 'count') return pan;

      const panInfo = PAN_DATA[pan.category as keyof typeof PAN_DATA]?.find(p => p.name === pan.type);
      if (panInfo) {
        const newWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));
        return {
          ...pan,
          panWeight: newWeight,
          divisionWeight: Math.round(newWeight / pan.divisionCount)
        };
      }
      return pan;
    }));
  }, [convertedProduct]);

  // 원래 팬 비용적(originalProduct) 변경 시 originalPan의 panWeight 재계산
  useEffect(() => {
    // 개수 모드는 비용적 영향 없음
    if (originalPan.mode === 'count') return;

    const panInfo = PAN_DATA[originalPan.category as keyof typeof PAN_DATA]?.find(p => p.name === originalPan.type);
    if (panInfo) {
      const newWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[originalProduct] || 3.4));
      setOriginalPan(prev => ({
        ...prev,
        panWeight: newWeight,
        divisionWeight: Math.round(newWeight / prev.divisionCount)
      }));
    }
  }, [originalProduct, originalPan.mode, originalPan.category, originalPan.type]);

  // 원래 팬 모드 변경 시 변환 팬도 같은 모드로 변경
  useEffect(() => {
    setPans(prev => prev.map(pan => {
      if (pan.mode === originalPan.mode) return pan;

      const updated = { ...pan, mode: originalPan.mode };

      if (originalPan.mode === 'count') {
        // 개수 모드로 변경: unitCount * unitWeight
        updated.panWeight = (updated.unitCount || 10) * (updated.unitWeight || 50);
        updated.divisionCount = 1;
        updated.divisionWeight = updated.panWeight;
      } else {
        // 팬 모드로 변경: 팬 볼륨 / 비용적
        const panInfo = PAN_DATA[updated.category as keyof typeof PAN_DATA]?.find(p => p.name === updated.type);
        if (panInfo) {
          updated.panWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));
          updated.divisionWeight = Math.round(updated.panWeight / updated.divisionCount);
        }
      }

      return updated;
    }));
  }, [originalPan.mode, convertedProduct]);

  // 제품 타입 변경 시 원제품/변경제품을 해당 카테고리 기본값으로 재설정
  useEffect(() => {
    if (productType === 'bread') {
      const breadProducts = Object.keys(BREAD_SPECIFIC_VOLUMES);
      if (!breadProducts.includes(originalProduct)) {
        setOriginalProduct(breadProducts[0] || '산형식빵');
      }
      if (!breadProducts.includes(convertedProduct)) {
        setConvertedProduct(breadProducts[0] || '산형식빵');
      }
    } else {
      const pastryProducts = Object.keys(CAKE_BATTER_SPECIFIC_GRAVITY);
      if (!pastryProducts.includes(originalProduct)) {
        setOriginalProduct(pastryProducts[0] || '파운드케이크');
      }
      if (!pastryProducts.includes(convertedProduct)) {
        setConvertedProduct(pastryProducts[0] || '파운드케이크');
      }
    }
  }, [productType]);


  // 변환표 베이커스 % 파생용 밀가루 총량 (배수는 균일 적용이라 원본 비율과 동일한 값이 나옴)
  const convertedFlourTotal = useMemo(() => flourTotal * effectiveMultiplier, [flourTotal, effectiveMultiplier]);

  // 계량표, 저장본, 복사본이 모두 같은 0.1g 정밀도를 사용한다.
  const formatWeight = (g: number) => Math.round(g * 10) / 10;

  // 변환된 재료
  const convertedIngredients = useMemo(() =>
    ingredients.map(ing => ({
      ...ing,
      convertedAmount: Math.round(ing.amount * effectiveMultiplier * 10) / 10,
    })),
    [ingredients, effectiveMultiplier]
  );

  // 사전반죽 재료
  // 핵심: 각 밀가루를 개별적으로 처리하여 비율대로 분배
  const prefermentIngredients = useMemo(() => {
    if (!usePreferment || method.type === 'straight') return [];
    const result: any[] = [];

    // 1. 각 밀가루를 개별적으로 처리 (강력분, 옥수수전분 등 각각)
    const flourItems = ingredients.filter(i => i.category === 'flour');

    if (flourItems.length === 0) return [];

    // 2. 각 밀가루에 flourRatio 적용하여 사전반죽 밀가루 생성
    flourItems.forEach(flour => {
      const prefermentFlourAmount = Math.round(flour.amount * method.flourRatio * effectiveMultiplier * 10) / 10;
      if (prefermentFlourAmount > 0) {
        result.push({
          id: `pref-${flour.id}`,
          name: flour.name,
          category: 'flour',
          convertedAmount: prefermentFlourAmount,
        });
      }
    });

    // 3. 사전반죽 수분 = 사전반죽 밀가루(배수적용전) × waterRatio (단일 항목)
    const totalFlour = flourItems.reduce((sum, flour) => sum + flour.amount, 0);
    const prefermentFlourBase = totalFlour * method.flourRatio;
    const prefermentWaterAmount = Math.round(prefermentFlourBase * method.waterRatio * effectiveMultiplier * 10) / 10;
    if (prefermentWaterAmount > 0) {
      result.push({
        id: 'pref-water',
        name: '물',
        category: 'liquid',
        convertedAmount: prefermentWaterAmount,
      });
    }

    // 4. 이스트 - 제법별 설정 사용 (prefermentYeastRatio)
    // - 오토리즈, 탕종, 르방: 사전반죽에 이스트 없음 (prefermentYeastRatio = 0)
    // - 중종법: 전량(100%) 사전반죽에 (prefermentYeastRatio = 1.0)
    // - 폴리쉬/비가: 극소량(10-15%) 사전반죽에
    const totalYeast = ingredients
      .filter(i => i.name.includes('이스트'))
      .reduce((sum, ing) => sum + ing.amount, 0);

    // 제법별 사전반죽 이스트 비율 (method.prefermentYeastRatio 사용)
    const prefermentYeastRatio = method.prefermentYeastRatio ?? 0;

    if (totalYeast > 0 && prefermentYeastRatio > 0) {
      const yeast = ingredients.find(i => i.name.includes('이스트'));
      // 1) 전체 이스트 조정 (yeastAdjustment 적용)
      const adjustedTotalYeast = totalYeast * (method.yeastAdjustment ?? 1.0);
      // 2) 사전반죽에 들어가는 양
      const prefermentYeastAmount = adjustedTotalYeast * prefermentYeastRatio;

      result.push({
        id: 'pref-yeast',
        name: yeast?.name || '인스턴트 드라이이스트',
        category: 'other',
        convertedAmount: Math.round(prefermentYeastAmount * effectiveMultiplier * 10) / 10,
      });
    }

    return result;
  }, [ingredients, method, usePreferment, effectiveMultiplier]);

  // 본반죽 재료
  // 핵심: 같은 카테고리 재료를 합산 후 사전반죽 차감량 계산 (중복 방지)
  const mainDoughIngredients = useMemo(() => {
    if (!usePreferment || method.type === 'straight') return convertedIngredients;

    const result: any[] = [];

    // 1. 총량 계산
    const totalFlour = ingredients.filter(i => i.category === 'flour').reduce((sum, ing) => sum + ing.amount, 0);
    const totalWater = ingredients.filter(i => i.category === 'liquid' && i.name === '물').reduce((sum, ing) => sum + ing.amount, 0);
    const totalYeast = ingredients.filter(i => i.name.includes('이스트')).reduce((sum, ing) => sum + ing.amount, 0);

    // 2. 사전반죽에 들어간 양 계산
    const prefermentFlour = totalFlour * method.flourRatio;
    const prefermentWater = prefermentFlour * method.waterRatio;

    // 제법별 이스트 조정 적용
    const yeastAdjustment = method.yeastAdjustment ?? 1.0;
    const prefermentYeastRatio = method.prefermentYeastRatio ?? 0;
    // 조정된 전체 이스트량
    const adjustedTotalYeast = totalYeast * yeastAdjustment;
    // 사전반죽에 들어간 이스트
    const prefermentYeast = adjustedTotalYeast * prefermentYeastRatio;

    // 3. 본반죽 밀가루 - 각 밀가루를 개별적으로 처리 (강력분, 옥수수전분 등)
    const flourItems = ingredients.filter(i => i.category === 'flour');
    flourItems.forEach(flour => {
      const prefermentAmount = flour.amount * method.flourRatio;
      const mainFlourAmount = Math.round((flour.amount - prefermentAmount) * 10) / 10;
      if (mainFlourAmount > 0) {
        result.push({
          id: `main-${flour.id}`,
          name: flour.name,
          category: 'flour',
          amount: mainFlourAmount,
          convertedAmount: Math.round(mainFlourAmount * effectiveMultiplier * 10) / 10,
        });
      }
    });

    // 4. 본반죽 물 (총량 - 사전반죽) = 단일 항목
    const mainWaterAmount = Math.round((totalWater - Math.min(totalWater, prefermentWater)) * 10) / 10;
    if (mainWaterAmount > 0) {
      result.push({
        id: 'main-water',
        name: '물',
        category: 'liquid',
        amount: mainWaterAmount,
        convertedAmount: Math.round(mainWaterAmount * effectiveMultiplier * 10) / 10,
      });
    }

    // 5. 나머지 수분(우유 등) - 그대로 포함
    ingredients.filter(i => i.category === 'liquid' && i.name !== '물').forEach(ing => {
      result.push({
        ...ing,
        id: `main-${ing.id}`,
        convertedAmount: Math.round(ing.amount * effectiveMultiplier * 10) / 10,
      });
    });

    // 6. 나머지 재료 (밀가루, 물, 이스트 제외)
    ingredients.filter(i =>
      i.category !== 'flour' &&
      !(i.category === 'liquid' && i.name === '물') &&
      !i.name.includes('이스트')
    ).filter(i => i.category !== 'liquid').forEach(ing => {
      result.push({
        ...ing,
        id: `main-${ing.id}`,
        convertedAmount: Math.round(ing.amount * effectiveMultiplier * 10) / 10,
      });
    });

    // 7. 본반죽 이스트 = 조정된 전체 이스트 - 사전반죽 이스트
    // 예: 폴리쉬 (yeastAdjustment=0.55, prefermentYeastRatio=0.15)
    //     → 본반죽 = 원래이스트 × 0.55 × (1 - 0.15) = 46.75%
    const mainYeastAmount = Math.round((adjustedTotalYeast - prefermentYeast) * 10) / 10;
    if (mainYeastAmount > 0) {
      const yeast = ingredients.find(i => i.name.includes('이스트'));
      result.push({
        id: 'main-yeast',
        name: yeast?.name || '인스턴트 드라이이스트',
        category: 'other',
        amount: mainYeastAmount,
        convertedAmount: Math.round(mainYeastAmount * effectiveMultiplier * 10) / 10,
      });
    }

    return result;
  }, [ingredients, method, usePreferment, effectiveMultiplier, convertedIngredients]);

  // 원본 레시피의 제법 타입 감지 (phase 속성 기반)
  const originalMethodType = useMemo(() => {
    const prefermentPhases = ['tangzhong', 'poolish', 'biga', 'sponge', 'levain', 'autolyse', 'preferment'];
    const foundPhase = ingredients.find(ing => ing.phase && prefermentPhases.includes(ing.phase));
    return foundPhase?.phase || 'straight';
  }, [ingredients]);

  // 레시피에 여러 단계가 있는지 확인 (제빵, 제과 모두 포함)
  const hasMultipleIngredientPhases = useMemo(() => {
    const phases = new Set(ingredients.map(ing => ing.phase || 'main'));
    return phases.size > 1 || (phases.size === 1 && !phases.has('main'));
  }, [ingredients]);

  // 원본 제법과 선택 제법이 같은지 확인
  const isSameMethod = originalMethodType === method.type ||
    (originalMethodType === 'straight' && method.type === 'straight');

  // 배수가 같아도 제법이 달라지면 별도의 계량 결과를 보여준다.
  const isConverted = Math.abs(effectiveMultiplier - 1) >= 0.0001 ||
    (usePreferment && !isSameMethod);

  // 변환 재료를 단계별로 그룹화 (사전반죽 + 본반죽을 하나의 테이블에 표시)
  const convertedIngredientsByPhase = useMemo(() => {
    const phaseOrder: Record<string, number> = {
      tangzhong: 0, preferment: 1, poolish: 1, biga: 1, sponge: 1, levain: 1, autolyse: 2,
      main: 10, topping: 20, filling: 21, frosting: 22, glaze: 23, other: 99
    };

    // 카테고리 순서 정의 (밀가루 → 수분 → 유지 → 기타)
    const categoryOrder: Record<string, number> = {
      flour: 0, liquid: 1, wetOther: 2, other: 3
    };

    // ★ 우선순위 1: 여러 단계가 있고 사전반죽 미사용 시 → 원본 단계 유지 (제빵/제과 모두)
    if (hasMultipleIngredientPhases && !usePreferment) {
      const grouped = convertedIngredients.reduce((acc, ing) => {
        const phase = ing.phase || 'main';
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(ing);
        return acc;
      }, {} as Record<string, typeof convertedIngredients>);

      return Object.entries(grouped)
        .sort(([a], [b]) => (phaseOrder[a] ?? 50) - (phaseOrder[b] ?? 50))
        .map(([phase, items]) => ({
          phase,
          items: items.sort((a, b) =>
            (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
          )
        }));
    }

    // 스트레이트법: 모든 재료를 합산하여 'main' 하나로 통합
    if (!usePreferment || method.type === 'straight') {
      const combinedItems: any[] = [];

      // 밀가루 개별 표시 (합산하지 않음 - 강력분, 옥수수전분 등 각각 표시)
      const flourItems = convertedIngredients.filter(i => i.category === 'flour');
      flourItems.forEach(flour => {
        if (flour.convertedAmount > 0) {
          combinedItems.push({
            id: `straight-${flour.id}`,
            name: flour.name,
            category: 'flour',
            convertedAmount: Math.round(flour.convertedAmount * 10) / 10,
          });
        }
      });

      // 수분 합산 (물 / 우유 / 기타 각각)
      const liquidNames = [...new Set(convertedIngredients.filter(i => i.category === 'liquid').map(i => i.name))];
      liquidNames.forEach(name => {
        const total = convertedIngredients
          .filter(i => i.category === 'liquid' && i.name === name)
          .reduce((sum, ing) => sum + ing.convertedAmount, 0);
        if (total > 0) {
          combinedItems.push({
            id: `straight-${name}`,
            name,
            category: 'liquid',
            convertedAmount: Math.round(total * 10) / 10,
          });
        }
      });

      // 나머지 재료 - 같은 이름끼리 합산
      const otherNames = [...new Set(convertedIngredients
        .filter(i => i.category !== 'flour' && i.category !== 'liquid')
        .map(i => i.name))];
      otherNames.forEach(name => {
        const items = convertedIngredients.filter(i => i.name === name && i.category !== 'flour' && i.category !== 'liquid');
        const total = items.reduce((sum, ing) => sum + ing.convertedAmount, 0);
        if (total > 0) {
          combinedItems.push({
            id: `straight-${name}`,
            name,
            category: items[0]?.category || 'other',
            convertedAmount: Math.round(total * 10) / 10,
          });
        }
      });

      // 카테고리별로 정렬
      combinedItems.sort((a, b) =>
        (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
      );

      return [{ phase: 'main', items: combinedItems }];
    }

    // ★ 핵심: 원본 제법과 선택 제법이 같으면 원본 그대로 유지
    if (isSameMethod && originalMethodType !== 'straight') {
      // convertedIngredients를 원본 phase 기준으로 그룹화 (값은 이미 effectiveMultiplier 적용됨)
      const grouped = convertedIngredients.reduce((acc, ing) => {
        const phase = ing.phase || 'main';
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(ing);
        return acc;
      }, {} as Record<string, typeof convertedIngredients>);

      return Object.entries(grouped)
        .sort(([a], [b]) => (phaseOrder[a] ?? 50) - (phaseOrder[b] ?? 50))
        .map(([phase, items]) => ({
          phase,
          items: items.sort((a, b) =>
            (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
          )
        }));
    }

    // 제법이 다를 때: prefermentIngredients + mainDoughIngredients 사용
    const result: { phase: string; items: any[] }[] = [];

    if (prefermentIngredients.length > 0) {
      const sortedPreferment = [...prefermentIngredients].sort((a, b) =>
        (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
      );
      result.push({
        phase: method.type,
        items: sortedPreferment.map(ing => ({ ...ing, phase: method.type }))
      });
    }

    const mainItems = mainDoughIngredients.filter(ing => (ing.convertedAmount || 0) > 0);
    if (mainItems.length > 0) {
      const sortedMain = mainItems.sort((a, b) =>
        (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
      );
      result.push({
        phase: 'main',
        items: sortedMain.map(ing => ({ ...ing, phase: 'main' }))
      });
    }

    return result;
  }, [convertedIngredients, prefermentIngredients, mainDoughIngredients, usePreferment, method.type, isSameMethod, originalMethodType, hasMultipleIngredientPhases]);

  const convertedTotal = useMemo(() => Math.round(convertedIngredientsByPhase.reduce((sum, group) =>
    sum + group.items.reduce((subtotal, ingredient) => subtotal + ingredient.convertedAmount, 0), 0) * 10) / 10,
    [convertedIngredientsByPhase]);
  const panFillRate = panTotalWeight > 0 ? Math.round(convertedTotal / panTotalWeight * 1000) / 10 : 0;

  // 변환 재료에 단계가 2개 이상인지
  const convertedHasMultiplePhases = convertedIngredientsByPhase.length > 1;

  // 동적 스타일
  const dynamicStyles = useMemo(() => getDynamicStyles(ingredients.length), [ingredients.length]);

  // ============================================
  // 이벤트 핸들러
  // ============================================

  const handleMethodChange = useCallback((type: string) => {
    const ratios = METHOD_RATIOS[type] || { flour: 0, water: 0 };
    // 설정 스토어에서 해당 제법의 이스트 조정값 가져오기 (없으면 로컬 기본값 사용)
    const methodConfig = methodSettings?.methods?.[type];
    const defaultYeast = DEFAULT_METHOD_YEAST[type] || { yeastAdjustment: 1.0, prefermentYeastRatio: 0 };
    const yeastAdjustment = methodConfig?.yeastAdjustment ?? defaultYeast.yeastAdjustment;
    const prefermentYeastRatio = methodConfig?.prefermentYeastRatio ?? defaultYeast.prefermentYeastRatio;

    setMethod({
      type: type as MethodSettings['type'],
      flourRatio: ratios.flour,
      waterRatio: ratios.water,
      yeastAdjustment,
      prefermentYeastRatio
    });
    setUsePreferment(type !== 'straight');
    // 원본 레시피(ingredients)는 수정하지 않음
    // 변환 레시피는 prefermentIngredients와 mainDoughIngredients useMemo에서 자동 계산
  }, [methodSettings]);

  // 원래 팬 업데이트
  const updateOriginalPan = useCallback((field: string, value: any) => {
    setOriginalPan(prev => {
      const updated = { ...prev, [field]: value };

      // 모드 변경 시 panWeight 재계산
      if (field === 'mode') {
        if (value === 'count') {
          // 개수 모드: unitCount * unitWeight
          updated.panWeight = (updated.unitCount || 10) * (updated.unitWeight || 50);
        } else {
          // 팬 모드: 팬 볼륨 / 비용적
          const panInfo = PAN_DATA[updated.category as keyof typeof PAN_DATA]?.find(pan => pan.name === updated.type);
          if (panInfo) {
            updated.panWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[originalProduct] || 3.4));
          }
        }
      }

      // 팬 타입 변경 시 panWeight 자동 계산 (팬 모드일 때만)
      if (field === 'type' && updated.mode === 'pan') {
        const panInfo = PAN_DATA[updated.category as keyof typeof PAN_DATA]?.find(pan => pan.name === value);
        if (panInfo) {
          updated.panWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[originalProduct] || 3.4));
        }
      }

      // 카테고리 변경 시 첫 번째 타입으로 설정 (팬 모드일 때만)
      if (field === 'category' && updated.mode === 'pan') {
        const types = PAN_DATA[value as keyof typeof PAN_DATA];
        if (types?.length > 0) {
          updated.type = types[0].name;
          updated.panWeight = Math.round(types[0].volume / (SPECIFIC_VOLUMES[originalProduct] || 3.4));
        }
      }

      // 개수 모드: unitCount 또는 unitWeight 변경 시 panWeight 재계산
      if (updated.mode === 'count' && (field === 'unitCount' || field === 'unitWeight')) {
        updated.panWeight = (updated.unitCount || 0) * (updated.unitWeight || 0);
      }

      // 팬 모드: divisionWeight 계산 (panWeight / divisionCount)
      if (updated.mode === 'pan' && updated.divisionCount > 0) {
        updated.divisionWeight = Math.round(updated.panWeight / updated.divisionCount);
      }

      return updated;
    });
  }, [originalProduct]);

  const addPan = useCallback(() => {
    // 설정의 첫 번째 팬 볼륨 사용, 변환 대상 제품 비용적으로 계산
    const newPanVolume = PAN_DATA[defaultCategory]?.[0]?.volume || 2350;
    const calculatedWeight = Math.round(newPanVolume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));

    setPans(prev => [...prev, {
      id: Date.now().toString(),
      mode: 'pan',
      category: defaultCategory, type: defaultPanType,
      quantity: 1, divisionCount: 1, panWeight: calculatedWeight, divisionWeight: calculatedWeight,
      unitCount: 10, unitWeight: 50,
    }]);
  }, [convertedProduct, defaultCategory, defaultPanType, PAN_DATA]);

  const removePan = useCallback((id: string) => {
    setPans(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  }, []);

  // ===== 초기화 함수들 =====
  // [C-7] 초기화 직후 되돌리기(Undo) 토스트를 띄우는 공통 헬퍼
  // 스냅샷을 클로저에 보관해 두고, 사용자가 '되돌리기'를 누르면 그대로 복원한다.
  const showUndoToast = useCallback((restore: () => void, message: string = '변환 설정을 초기화했습니다') => {
    addToast({
      type: 'info',
      message,
      duration: 6000,  // 5~7초 제공
      action: { label: '되돌리기', onClick: restore },
    });
  }, [addToast]);

  // 팬 설정 초기화: 변환 팬을 원래 팬과 동일하게
  // showUndo=false면 토스트를 띄우지 않는다 (전체 초기화에서 중복 방지용)
  const resetPanSettings = useCallback((showUndo: boolean = true) => {
    // 초기화 직전 스냅샷 보관 (resetPanSettings가 건드리는 상태: pans, isPanLinked)
    const prevPans = pans;
    const prevIsPanLinked = isPanLinked;
    setPans([{
      id: '1',
      mode: originalPan.mode,
      category: originalPan.category,
      type: originalPan.type,
      quantity: originalPan.quantity,
      divisionCount: originalPan.divisionCount,
      panWeight: originalPan.panWeight,
      divisionWeight: originalPan.divisionWeight,
      unitCount: originalPan.unitCount,
      unitWeight: originalPan.unitWeight,
    }]);
    setIsPanLinked(true);
    if (showUndo) {
      showUndoToast(() => {
        setPans(prevPans);
        setIsPanLinked(prevIsPanLinked);
      });
    }
  }, [originalPan, pans, isPanLinked, showUndoToast]);

  // 비용적 초기화: 변환 비용적을 원래 비용적과 동일하게
  const resetSpecificVolume = useCallback((showUndo: boolean = true) => {
    const prevConvertedProduct = convertedProduct;
    // 이미 기본값과 동일하면 변화 없음 -> 토스트 생략
    if (prevConvertedProduct === originalProduct) {
      setConvertedProduct(originalProduct);
      return;
    }
    setConvertedProduct(originalProduct);
    if (showUndo) {
      showUndoToast(() => setConvertedProduct(prevConvertedProduct));
    }
  }, [originalProduct, convertedProduct, showUndoToast]);

  // 오븐 초기화: 기본값으로
  const resetOvenSettings = useCallback((showUndo: boolean = true) => {
    const prevOven = oven;
    setOven({
      type: 'convection',
      level: '',
      firstBake: { topTemp: 200, bottomTemp: 170, time: 24 },
      secondBake: { topTemp: 0, bottomTemp: 0, time: 0 },
    });
    if (showUndo) {
      showUndoToast(() => setOven(prevOven));
    }
  }, [oven, showUndoToast]);

  // 전체 변환 초기화
  const resetAllConversion = useCallback(() => {
    // 초기화 직전 스냅샷 보관 (reset이 건드리는 전체 상태)
    const prevPans = pans;
    const prevIsPanLinked = isPanLinked;
    const prevConvertedProduct = convertedProduct;
    const prevOven = oven;
    const prevMultiplier = multiplier;
    const prevMultiplierInput = multiplierInput;
    const prevMethod = method;
    const prevUsePreferment = usePreferment;
    const prevMobileSection = mobileSection;

    // 개별 reset은 토스트를 띄우지 않도록 호출 (전체용 단일 토스트로 통합)
    resetPanSettings(false);
    resetSpecificVolume(false);
    resetOvenSettings(false);
    setMultiplier(1);
    setMultiplierInput('1');
    // 팬 비용적의 후속 재계산과 무관하게 원본의 1배 중량으로 고정한다.
    setIsPanLinked(false);
    setMethod({
      type: (originalMethodType === 'preferment' ? 'sponge' : originalMethodType) as MethodSettings['type'],
      flourRatio: 0,
      waterRatio: 0,
      yeastAdjustment: 1,
      prefermentYeastRatio: 0,
    });
    // 원본에 이미 있는 폴리시·탕종 등의 재료 단계는 그대로 사용한다.
    setUsePreferment(false);
    setMobileSection('ingredients');

    showUndoToast(() => {
      setPans(prevPans);
      setIsPanLinked(prevIsPanLinked);
      setConvertedProduct(prevConvertedProduct);
      setOven(prevOven);
      setMultiplier(prevMultiplier);
      setMultiplierInput(prevMultiplierInput);
      setMethod(prevMethod);
      setUsePreferment(prevUsePreferment);
      setMobileSection(prevMobileSection);
    });
  }, [resetPanSettings, resetSpecificVolume, resetOvenSettings, pans, isPanLinked, convertedProduct, oven, multiplier, multiplierInput, method, usePreferment, mobileSection, originalMethodType, showUndoToast]);

  // 레시피 저장 (실제 저장 로직)
  // options.asCopy: '사본으로 저장' - currentRecipe 폴백을 끊어 강제로 신규 생성(원본 보존)
  const createConvertedRecipe = useCallback((options?: { asCopy?: boolean }) => {
    // 변환을 다시 편집하기 위한 입력 사본이다. 저장 레시피 본문은 아래에서 실제 결과로 교체한다.
    const ingredientsToSave = ingredients.map((ing, idx) => ({
      id: ing.id || `ing-${Date.now()}-${idx}`,
      name: ing.name,
      amount: ing.amount,
      percentage: ing.ratio,  // 베이커스 퍼센트 저장
      unit: 'g',
      category: ing.category === 'flour' ? 'flour' :
                ing.category === 'liquid' ? 'liquid' :
                ing.category === 'wetOther' ? 'fat' : 'other',
      isFlour: ing.category === 'flour',
      note: ing.note || '',  // 메모 저장
      moistureContent: ing.moistureContent,  // 수분 함량 저장
      phaseId: ing.phaseId,
      phase: ing.phase || 'main',  // 공정 단계 저장
    }));

    // 저장할 공정 데이터 (로드 형식과 일치하도록)
    const stepsToSave = processes.map((p, idx) => ({
      id: p.id || `step-${Date.now()}-${idx}`,
      order: p.order || idx + 1,
      instruction: p.description,
      time: p.time,
      temp: p.temp,
      phase: p.phase || 'main',  // H4: 공정 단계 왕복 보존
    }));

    // 저장할 오븐 설정 (로드 형식과 일치하도록)
    const ovenSettingsToSave = {
      temperature: oven.firstBake.topTemp,
      bottomTemperature: oven.firstBake.bottomTemp,  // 하부 온도 추가
      mode: oven.type === 'deck' ? 'deck' : oven.type === 'airfryer' ? 'airfryer' : 'conventional',
      preheating: true,
      deck: oven.level || 'middle',
      duration: oven.firstBake.time,
      // 2차 굽기 설정 추가
      secondBake: oven.secondBake.time > 0 ? {
        topTemp: oven.secondBake.topTemp,
        bottomTemp: oven.secondBake.bottomTemp,
        time: oven.secondBake.time,
      } : null,
    };

    const recipeData = {
      name: productName || t('advDashboard.defaultRecipeName'),
      nameKo: productName,
      productType: productType,  // 🆕 제품 타입 (제빵/제과)
      category: currentRecipe?.category || productType,
      difficulty: 'intermediate' as const,
      servings: pans.reduce((s, p) => s + p.quantity, 0),
      prepTime: 30,
      totalTime: 60 + oven.firstBake.time + oven.secondBake.time,
      ingredients: ingredientsToSave,
      phases: syncRecipePhases(currentRecipe ? recipeForConversion(currentRecipe).phases : undefined, ingredientsToSave),
      steps: stepsToSave,
      ovenSettings: ovenSettingsToSave,
      method: {
        method: method.type,
        prefermentRatio: method.flourRatio,
        waterRatio: method.waterRatio,
        yeastAdjustment: method.yeastAdjustment,
        prefermentYeastRatio: method.prefermentYeastRatio,
        usePreferment,
      },
      panConfig: {
        type: pans[0]?.type || defaultPanType,
        name: pans[0]?.category || defaultCategory,  // 카테고리 저장
        quantity: pans.reduce((s, p) => s + p.quantity, 0),
        panWeight: pans[0]?.panWeight,  // 팬 무게 저장
        mode: pans[0]?.mode || 'pan',  // 모드 저장 (pan/count)
        originalPan: originalPan,  // 원래 팬 설정 저장
        pans: pans,  // 전체 팬 배열 저장 (개별 팬 수량 유지)
      },
      // 비용적 설정 저장
      specificVolume: {
        original: originalProduct,
        converted: convertedProduct,
      },
      // 배수 설정 저장
      multiplierConfig: {
        multiplier: multiplier,
        isPanLinked: isPanLinked,
      },
      // 출처 정보
      source: source.name ? {
        name: source.name,
        type: source.type,
        url: source.url || undefined,
        author: source.author || undefined,
      } : undefined,
      tags: [convertedProduct, METHOD_LABELS[method.type]].filter(Boolean),
      notes: memo,
      // 수율 예측 공정 선택 상태
      yieldStageSelection: yieldStageSelection,
      updatedAt: new Date(),
    };

    let result;
    try {
      result = captureConversionGroups(convertedIngredientsByPhase, ingredientsToSave);
    } catch {
      addToast({ type: 'error', message: t('savedRecipe.invalidResult') });
      return;
    }
    // 원본 ID는 저장 대상으로 사용하지 않는다. 변환본만 갱신하거나 별도 사본을 만든다.
    const targetId = !options?.asCopy && currentRecipe?.conversion ? currentRecipe.id : undefined;
    const label = productType === 'pastry' && !usePreferment ? t('savedRecipe.scaling') : METHOD_LABELS[method.type];
    const baseName = conversionName(recipeData.name, effectiveMultiplier, label);
    let name = baseName;
    let suffix = 2;
    while (recipes.some(recipe => recipe.id !== targetId && recipe.name === name)) name = `${baseName} (${suffix++})`;
    const { conversion: ignoredConversion, ...base } = currentRecipe || {};
    const savedRecipe = {
      ...base, ...recipeData, ...result, name, nameKo: name,
      id: targetId || `recipe-${crypto.randomUUID()}`,
      createdAt: targetId ? currentRecipe!.createdAt : new Date(),
      // 결과 재료에 배수를 다시 적용하지 않는다. 설정 복원은 conversion.workspace에서 한다.
      multiplierConfig: { multiplier: 1, isPanLinked: false },
      conversion: {
        version: 1 as const,
        sourceRecipeId: currentRecipe?.conversion ? currentRecipe.conversion.sourceRecipeId : currentRecipe?.id,
        sourceRecipeName: currentRecipe?.conversion?.sourceRecipeName || recipeData.name,
        multiplier: effectiveMultiplier, methodLabel: label,
        workspace: { ...base, ...recipeData },
      },
    };
    return savedRecipe;
  }, [productName, productType, source, pans, oven, ingredients, processes, memo, convertedProduct, originalProduct, method, originalPan, multiplier, isPanLinked, yieldStageSelection, currentRecipe, defaultPanType, defaultCategory, addToast, t, convertedIngredientsByPhase, effectiveMultiplier, usePreferment, recipes]);

  const saveRecipeData = useCallback((options?: { asCopy?: boolean }) => {
    const savedRecipe = createConvertedRecipe(options);
    if (!savedRecipe) return;
    if (recipes.some(recipe => recipe.id === savedRecipe.id)) updateRecipe(savedRecipe.id, savedRecipe as any);
    else addRecipe(savedRecipe as any);
    if (useRecipeStorageStatus.getState().failed) {
      addToast({ type: 'error', message: t('workspace.saveFailed'), duration: 0 });
      return;
    }
    addToast({ type: 'success', message: t('savedRecipe.saved') });
    useAppStore.getState().setActiveTab('view');
    window.scrollTo({ top: 0 });
  }, [createConvertedRecipe, recipes, updateRecipe, addRecipe, addToast, t]);

  const handleSaveRecipe = useCallback(() => saveRecipeData(), [saveRecipeData]);

  // 레시피 내보내기 (JSON)
  const handleExportRecipe = useCallback(() => {
    const exportedRecipe = createConvertedRecipe({ asCopy: true });
    if (!exportedRecipe) return;
    const exportData = [exportedRecipe];

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName || 'recipe'}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({ type: 'success', message: t('advDashboard.recipeExported') });
  }, [createConvertedRecipe, productName, addToast, t]);

  // 텍스트로 복사 (일반 사용자용)
  const handleCopyAsText = useCallback(async () => {
    let text = `🍞 ${productName}\n`;
    text += `${'─'.repeat(30)}\n\n`;

    // 기본 정보
    text += `📊 ${t('advDashboard.basicInfo')}\n`;
    text += `• ${t('advDashboard.multiplier')}: ×${effectiveMultiplier}\n`;
    text += `• ${t('advDashboard.original')}: ${totalWeight}g → ${t('advDashboard.converted')}: ${convertedTotal}g\n`;
    text += `• ${t('advDashboard.pan')}: ${pans.map(p => `${p.type} ${p.quantity}`).join(', ')}\n`;
    text += `• ${t('advDashboard.method')}: ${METHOD_LABELS[method.type]}\n\n`;

    // 화면에 표시한 단계별 계량량을 그대로 복사한다.
    convertedIngredientsByPhase.forEach(({ phase, items }) => {
      const meta = PHASE_META[phase] || PHASE_META.other;
      text += `${t(meta.labelKey)}\n`;
      items.forEach(ing => { text += `• ${translateIngredient(ing.name)}: ${ing.convertedAmount}g\n`; });
      text += '\n';
    });

    // 오븐 설정
    text += `🔥 ${t('advDashboard.ovenSettings')}\n`;
    const ovenType = t(`advDashboard.ovenTypes.${oven.type}`);
    if (oven.type === 'deck') {
      text += `• ${ovenType}: ${t('advDashboard.topHeat')} ${oven.firstBake.topTemp}°C / ${t('advDashboard.bottomHeat')} ${oven.firstBake.bottomTemp}°C, ${oven.firstBake.time}${t('units.minute')}\n`;
    } else {
      text += `• ${ovenType}: ${oven.firstBake.topTemp}°C, ${oven.firstBake.time}${t('units.minute')}\n`;
    }
    if (oven.secondBake.time > 0) {
      text += `• ${t('advDashboard.secondBake')}: ${oven.secondBake.topTemp}°C, ${oven.secondBake.time}${t('units.minute')}\n`;
    }
    text += `\n`;

    // 공정
    text += `📝 ${t('advDashboard.processSteps')}\n`;
    processes.forEach((p, i) => {
      let step = `${i + 1}. ${translateProcessStep(p.description)}`;
      if (p.time) step += ` (${p.time}${t('units.minute')})`;
      if (p.temp) step += ` [${p.temp}°C]`;
      text += `${step}\n`;
    });

    // 메모 (있는 경우)
    if (memo) {
      text += `\n📌 ${t('advDashboard.memo')}\n${memo}\n`;
    }

    text += `\n${'─'.repeat(30)}\n`;
    text += `${t('advDashboard.createdDate')}: ${new Date().toLocaleDateString()}\n`;

    try {
      await navigator.clipboard.writeText(text);
      addToast({ type: 'success', message: t('advDashboard.recipeCopied') });
    } catch (err) {
      // 클립보드 실패 시 다운로드
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName || 'recipe'}_${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: t('advDashboard.recipeSavedAsText') });
    }
  }, [productName, effectiveMultiplier, totalWeight, convertedTotal, pans, method, usePreferment, prefermentIngredients, mainDoughIngredients, convertedIngredients, oven, processes, memo, addToast, convertedIngredientsByPhase, translateIngredient, translateProcessStep, t]);

  const updatePan = useCallback((id: string, field: keyof PanEntry, value: any) => {
    setPans(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };

      // 모드 변경 시 panWeight 재계산
      if (field === 'mode') {
        if (value === 'count') {
          // 개수 모드: unitCount * unitWeight
          updated.panWeight = (updated.unitCount || 10) * (updated.unitWeight || 50);
          updated.divisionCount = 1;
          updated.divisionWeight = updated.panWeight;
        } else {
          // 팬 모드: 팬 볼륨 / 비용적
          const panInfo = PAN_DATA[updated.category as keyof typeof PAN_DATA]?.find(pan => pan.name === updated.type);
          if (panInfo) {
            updated.panWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));
          }
        }
      }

      // 팬 타입 변경 시 panWeight 자동 계산 (변환 대상 비용적 사용)
      if (field === 'type' && updated.mode === 'pan') {
        const panInfo = PAN_DATA[updated.category as keyof typeof PAN_DATA]?.find(pan => pan.name === value);
        if (panInfo) {
          updated.panWeight = Math.round(panInfo.volume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));
        }
      }

      // 카테고리 변경 시 첫 번째 타입으로 설정
      if (field === 'category' && updated.mode === 'pan') {
        const types = PAN_DATA[value as keyof typeof PAN_DATA];
        if (types?.length > 0) {
          updated.type = types[0].name;
          updated.panWeight = Math.round(types[0].volume / (SPECIFIC_VOLUMES[convertedProduct] || 3.4));
        }
      }

      // 개수 모드: unitCount 또는 unitWeight 변경 시 panWeight 재계산
      if (updated.mode === 'count' && (field === 'unitCount' || field === 'unitWeight')) {
        updated.panWeight = (updated.unitCount || 0) * (updated.unitWeight || 0);
        updated.divisionWeight = updated.panWeight;
      }

      // 팬 모드: divisionWeight는 항상 panWeight / divisionCount로 계산
      if (updated.mode === 'pan' && updated.divisionCount > 0) {
        updated.divisionWeight = Math.round(updated.panWeight / updated.divisionCount);
      }

      return updated;
    }));
  }, [convertedProduct]);

  // 일괄 입력 모달 상태
  const [isBulkInputOpen, setIsBulkInputOpen] = useState(false);
  // H5: 중복 이름 저장 확인 모달 (덮어쓰기/사본으로/취소)
  // 실행 모드(굽기) 상태 - 레시피에 저장하지 않는 ephemeral UI 상태
  const [isTimerOpen, setIsTimerOpen] = useState(false);            // C3 타이머 모달
  const [isBakingMode, setIsBakingMode] = useState(false);          // H1 전용 베이킹 모드(전체화면 단계뷰)
  const [timerSeed, setTimerSeed] = useState<{ name: string; minutes: number } | null>(null); // C3 공정칩 -> 타이머 프리필
  const [completedProcesses, setCompletedProcesses] = useState<Set<string>>(new Set()); // C1 공정 완료 체크
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());  // C2 계량 체크리스트

  // C1: 공정 완료 토글 (칩 탭=편집과 충돌하지 않도록 별도 체크 버튼에서 호출)
  const toggleProcessDone = useCallback((id: string) => {
    setCompletedProcesses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // C2: 계량(미장플라스) 체크 토글 (복합키 phase-cat-id-idx)
  const toggleIngredientChecked = useCallback((key: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // C3: 공정칩 시간 -> 타이머 프리필 후 모달 열기
  const startTimerFromProcess = useCallback((name: string, minutes: number) => {
    setTimerSeed({ name: name || '공정 타이머', minutes });
    setIsTimerOpen(true);
  }, []);

  // C2: 배수/팬이 바뀌면 변환량이 달라지므로 계량 체크를 초기화
  useEffect(() => {
    setCheckedIngredients(new Set());
  }, [effectiveMultiplier]);

  const addIngredient = useCallback(() => {
    const newOrder = Math.max(...ingredients.map(i => i.order), 0) + 1;
    setIngredients(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // ✅ 고유 ID 보장 (타임스탬프 + 랜덤)
      order: newOrder, category: 'other', subCategory: '기타',
      name: '', ratio: 0, amount: 0, note: '',
    }]);
  }, [ingredients]);

  // 일괄 입력으로 재료 추가
  const handleBulkImport = useCallback((importedIngredients: Array<{ name: string; amount: number; category: string }>) => {
    const startOrder = Math.max(...ingredients.map(i => i.order), 0) + 1;
    const newIngredients = importedIngredients.map((ing, idx) => ({
      id: `bulk-${Date.now()}-${idx}`,
      order: startOrder + idx,
      category: ing.category as any,
      subCategory: '',
      name: ing.name,
      ratio: 0,
      amount: ing.amount,
      note: ''
    }));
    setIngredients(prev => [...prev, ...newIngredients]);
    addToast({ type: 'success', message: t('advDashboard.ingredientsAdded', { count: newIngredients.length }) });
  }, [ingredients, addToast]);

  const removeIngredient = useCallback((id: string) => {
    const snapshot = ingredients;
    setIngredients(prev => prev.filter(i => i.id !== id));
    showUndoToast(() => setIngredients(snapshot), t('advDashboard.ingredientRemoved', { defaultValue: '재료를 삭제했습니다' }));
  }, [ingredients, showUndoToast, t]);

  // 예시 데이터(기본 식빵) 불러오기 — 새 레시피 빈 상태에서 사용자가 명시적으로 호출
  const loadExample = useCallback(() => {
    setIngredients(SAMPLE_INGREDIENTS.map(i => ({ ...i })));
    setProcesses(SAMPLE_PROCESSES.map(p => ({ ...p })));
    setProductName('기본 식빵 (예시)');
    setUsePreferment(false);
    setExampleLoaded(true);
    addToast({ type: 'success', message: t('advDashboard.exampleLoaded', { defaultValue: '예시 레시피를 불러왔습니다.' }) });
  }, [addToast, t]);

  const updateIngredient = useCallback((id: string, field: keyof IngredientEntry, value: any) => {
    setIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;
      const updated = { ...ing, [field]: value };
      if (field === 'phase') updated.phaseId = undefined;
      if (field === 'category') updated.subCategory = CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] || '기타';
      // 무게 변경 시 비율 자동 계산
      if (field === 'amount') {
        const flour = prev.filter(i => i.category === 'flour').reduce((s, i) => s + (i.id === id ? value : i.amount), 0);
        if (flour > 0 && ing.category !== 'flour') {
          updated.ratio = Math.round((value / flour) * 1000) / 10;
        }
      }
      return updated;
    }));
  }, []);

  const addProcess = useCallback(() => {
    const newOrder = Math.max(...processes.map(p => p.order), 0) + 1;
    setProcesses(prev => [...prev, { id: Date.now().toString(), order: newOrder, description: '' }]);
  }, [processes]);

  const removeProcess = useCallback((id: string) => {
    const snapshot = processes;
    setProcesses(prev => prev.filter(p => p.id !== id));
    showUndoToast(() => setProcesses(snapshot), t('advDashboard.processRemoved', { defaultValue: '공정 단계를 삭제했습니다' }));
  }, [processes, showUndoToast, t]);

  const updateProcess = useCallback((id: string, field: keyof ProcessStep, value: any) => {
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, []);

  // 공정 순서 이동
  const moveProcess = useCallback((id: string, direction: 'up' | 'down') => {
    setProcesses(prev => {
      const index = prev.findIndex(p => p.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newArr = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];

      // order 값 재정렬
      return newArr.map((p, i) => ({ ...p, order: i + 1 }));
    });
  }, []);

  // ============================================
  // 렌더링
  // ============================================

  return (
    // 재료 표의 모든 행을 펼치고 모바일에서는 작업별로 화면을 전환한다.
    <div className="recipe-workspace flex flex-col bg-surface-muted text-sm" data-mobile-section={mobileSection}>
      <div className="workspace-heading">
        <div>
          <p className="text-xs font-semibold text-brand-700 mb-1">{t('workspace.eyebrow')}</p>
          <h1 className="text-xl font-bold">{t('nav.converter')}</h1>
        </div>
        <button onClick={handleSaveRecipe} className="btn-primary inline-flex items-center gap-2">
          <Save size={18} />{t('savedRecipe.save')}
        </button>
      </div>
      <p className="conversion-save-hint">{t(currentRecipe?.conversion ? 'savedRecipe.editHint' : 'savedRecipe.saveHint')}</p>
      <nav className="workspace-tabs print-hide" aria-label={t('workspace.navigation')}>
        {(['ingredients', 'settings', 'result', 'process'] as const).map((section, index) => (
          <button key={section} aria-pressed={mobileSection === section}
            onClick={() => { setMobileSection(section); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
            <span className="workspace-step">{index + 1}</span>{t(`workspace.${section}`)}
          </button>
        ))}
      </nav>
      {/* ===== 상단 헤더 ===== */}
      {/* 모바일: 세로 정렬(flex-col)로 컨트롤 줄바꿈 / 데스크톱(lg): 기존 가로 정렬 보존 */}
      <div className="workspace-toolbar bg-surface-paper border-b px-3 sm:px-4 py-3 flex flex-col gap-3 flex-shrink-0">
        {/* 1줄: 제품 정보(좌) + 배수 조절(우) — 설정 입력 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
        {/* 좌측: 제품 정보 + 출처 */}
        <div className="flex items-center flex-wrap gap-2 lg:gap-3 min-w-0">
          <Cookie className="w-5 h-5 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            aria-label={t('advDashboard.productName')}
            className="workspace-name text-lg font-bold w-36 min-h-[44px] lg:min-h-0 border-b border-transparent hover:border-line focus:border-brand-500 focus:outline-none"
            placeholder={t('advDashboard.productName')}
          />
          {exampleLoaded && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-brand-100 text-brand-700 font-medium flex-shrink-0">
              {t('advDashboard.exampleBadge', { defaultValue: '예시 데이터' })}
            </span>
          )}
          {/* 제품 타입 선택 */}
          <div className="flex items-center gap-1 border-l pl-3">
            <button
              onClick={() => setProductType('bread')}
              className={`px-3 py-1 min-h-[44px] lg:min-h-0 text-xs rounded-l ${
                productType === 'bread'
                  ? 'bg-brand-500 text-white font-medium'
                  : 'bg-surface-muted text-ink-muted hover:bg-line'
              }`}
              title={t('advDashboard.productTypeBread')}
            >
              {t('advDashboard.productTypeBread')}
            </button>
            <button
              onClick={() => setProductType('pastry')}
              className={`px-3 py-1 min-h-[44px] lg:min-h-0 text-xs rounded-r ${
                productType === 'pastry'
                  ? 'bg-brand-500 text-white font-medium'
                  : 'bg-surface-muted text-ink-muted hover:bg-line'
              }`}
              title={t('advDashboard.productTypePastry')}
            >
              {t('advDashboard.productTypePastry')}
            </button>
          </div>
          {/* 출처(source): 메타데이터 — 전문가 모드에서만 노출 */}
          {isExpertMode && (
          <div className="workspace-source flex items-center gap-1 text-xs border-l pl-3">
            <select
              value={source.type}
              onChange={(e) => setSource({ ...source, type: e.target.value as SourceType })}
              className="bg-surface-muted border border-line rounded px-1.5 py-1 text-xs focus:outline-none focus:border-brand-400"
              title={t('advDashboard.sourceType')}
            >
              <option value="youtube">{t('advDashboard.sourceTypes.youtube')}</option>
              <option value="blog">{t('advDashboard.sourceTypes.blog')}</option>
              <option value="book">{t('advDashboard.sourceTypes.book')}</option>
              <option value="website">{t('advDashboard.sourceTypes.website')}</option>
              <option value="personal">{t('advDashboard.sourceTypes.personal')}</option>
              <option value="school">{t('advDashboard.sourceTypes.school')}</option>
              <option value="other">{t('advDashboard.sourceTypes.other')}</option>
            </select>
            <input
              type="text"
              value={source.name}
              onChange={(e) => setSource({ ...source, name: e.target.value })}
              className="w-24 bg-surface-muted border border-line rounded px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
              placeholder={t('advDashboard.sourceName')}
              title={t('advDashboard.sourceNamePlaceholder')}
            />
          </div>
          )}
        </div>

        {/* 우측 그룹: 배수 조절 + 표시 모드 토글 (한 묶음으로 우측 정렬) */}
        <div className="workspace-controls flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3">
        {/* 중앙: 배수 조절 (모바일: 줄바꿈 허용, 데스크톱: 기존 한 줄) */}
        <div className="flex items-center flex-wrap gap-2 lg:gap-3">
          <button
            onClick={() => setIsPanLinked(!isPanLinked)}
            className={`p-1.5 min-h-[44px] lg:min-h-0 rounded flex items-center gap-1 ${isPanLinked ? 'bg-success-100 text-success-600' : 'bg-surface-muted text-ink-disabled'}`}
            title={isPanLinked ? t('advDashboard.multiplierLinked') : t('advDashboard.multiplierUnlinked')}
          >
            {isPanLinked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
            <span className="text-xs">{isPanLinked ? t('advDashboard.auto') : t('advDashboard.manual')}</span>
          </button>
          <span className="text-xs text-ink-subtle">{t('advDashboard.multiplier')}:</span>
          {isPanLinked ? (
            /* 연동 모드: 자동 계산된 배수 표시 (읽기 전용) */
            <div className="flex items-center border border-success-100 rounded overflow-hidden bg-success-50">
              <div className="px-4 py-1 font-bold text-sm text-success-700 w-20 text-center tnum">
                ×{effectiveMultiplier}
              </div>
            </div>
          ) : (
            /* 수동 모드: 배수 입력 가능 (x2, /2, 1/2 등 다양한 형식) */
            <div className="flex items-center border rounded overflow-hidden bg-surface-paper">
              <button onClick={() => handleQuickMultiplier(Math.max(0.1, multiplier - 0.5))} className="px-2 py-1 hover:bg-surface-muted border-r">
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={multiplierInput}
                onChange={(e) => handleMultiplierInputChange(e.target.value)}
                onBlur={handleMultiplierInputConfirm}
                onKeyDown={(e) => e.key === 'Enter' && handleMultiplierInputConfirm()}
                className="w-20 text-center py-1 font-bold text-sm tnum"
                placeholder={t('advDashboard.multiplierPlaceholder')}
                title={t('advDashboard.multiplierHint')}
              />
              <button onClick={() => handleQuickMultiplier(Math.min(20, multiplier + 0.5))} className="px-2 py-1 hover:bg-surface-muted border-l">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          {!isPanLinked && (
            <div className="flex gap-1 flex-wrap print-hide">
              {[0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map(m => (
                <button
                  key={m}
                  onClick={() => handleQuickMultiplier(m)}
                  className={`px-2.5 py-1.5 lg:px-1.5 lg:py-0.5 min-h-[44px] lg:min-h-0 text-xs rounded transition-colors tnum ${
                    multiplier === m
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-muted hover:bg-line text-ink-muted'
                  }`}
                >
                  {m < 1 ? `1/${Math.round(1/m)}` : `×${m}`}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 표시 모드 토글 (간단/전문가) — 간단 모드는 사이드바를 숨기므로 항상 보이는 헤더에 상주. 순수 표시 토글이라 계산/상태 변이 없음. */}
        <div className="flex items-center rounded-md bg-surface-muted p-0.5 print-hide flex-shrink-0 self-start sm:self-auto" role="group" aria-label={t('advDashboard.modeGroupLabel', { defaultValue: '표시 모드' })}>
          <button
            onClick={() => setConversionMode('simple')}
            className={`px-2.5 py-1 min-h-[44px] lg:min-h-0 text-xs rounded transition-colors ${conversionMode === 'simple' ? 'bg-brand-500 text-white font-medium' : 'text-ink-muted hover:text-ink'}`}
            title={t('advDashboard.modeSimpleTitle', { defaultValue: '간단 모드' })}
            aria-pressed={conversionMode === 'simple'}
          >
            {t('advDashboard.modeSimple', { defaultValue: '간단' })}
          </button>
          <button
            onClick={() => setConversionMode('expert')}
            className={`px-2.5 py-1 min-h-[44px] lg:min-h-0 text-xs rounded transition-colors ${conversionMode === 'expert' ? 'bg-brand-500 text-white font-medium' : 'text-ink-muted hover:text-ink'}`}
            title={t('advDashboard.modeExpertTitle', { defaultValue: '전문가 모드' })}
            aria-pressed={conversionMode === 'expert'}
          >
            {t('advDashboard.modeExpert', { defaultValue: '전문가' })}
          </button>
        </div>
        </div>
        </div>

        {/* 2줄: 요약 지표(좌) + 액션 버튼(우) — 결과 + 저장/내보내기 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle bg-surface-muted px-3 py-1.5 rounded">
            <span className="inline-flex items-baseline gap-1 cursor-help" title="원본 레시피의 총 반죽량">{t('advDashboard.original')}<b className="text-ink tnum">{totalWeight}g</b></span>
            <span className="text-line-strong">→</span>
            <span className="inline-flex items-baseline gap-1 cursor-help" title="변환(배수·팬 반영) 후 총 반죽량">{t('advDashboard.converted')}<b className="text-brand-600 tnum">{convertedTotal}g</b></span>
            {/* 고급 지표(수화율·팬권장량·팬충전율): 제빵 전문 지표 — 전문가 모드에서만 노출 */}
            {isExpertMode && (
            <>
            <span className="inline-flex items-baseline gap-1 cursor-help" title="밀가루 대비 수분 비율입니다 (60~80% 권장)">{t('advDashboard.hydration')}<b className="text-ink tnum">{hydration}%</b></span>
            <span className="inline-flex items-baseline gap-1 cursor-help" title="팬 부피를 기준으로 권장되는 반죽량">{t('advDashboard.pan')}<b className="text-ink tnum">{panTotalWeight}g</b></span>
            <span className="inline-flex items-baseline gap-1 cursor-help" title="반죽량 ÷ 팬 권장량 (100%≈적정 충전, 110%↑ 과충전 주의)">{t('advDashboard.panFillRate')}<b className={`tnum ${panFillRate > 110 ? 'text-danger' : panFillRate < 85 ? 'text-warning' : 'text-success'}`}>{panFillRate}%</b></span>
            </>
            )}
          </div>
          <div className="workspace-tools print-hide">
          <button onClick={handleSaveRecipe} className="btn-primary"><Save size={18} />{t('savedRecipe.save')}</button>
          {currentRecipe?.conversion && <button className="btn-secondary" onClick={() => saveRecipeData({ asCopy: true })}>{t('advDashboard.saveAsCopy')}</button>}
          <details className="workspace-actions print-hide"><summary>{t('workspace.moreActions')}</summary><div className="flex flex-wrap gap-2 py-2">
            {/* 초기화: 부가 기능 — 전문가 모드에서만 노출 */}
            {isExpertMode && (
            <button
              onClick={resetAllConversion}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs bg-surface-muted text-ink-muted rounded hover:bg-line border border-line"
              title={t('advDashboard.resetConversion')}
            >
              <RotateCcw className="w-4 h-4" />{t('advDashboard.reset')}
            </button>
            )}
            <button
              onClick={handleSaveRecipe}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
              title={t('advDashboard.saveRecipe')}
            >
              <Save className="w-4 h-4" />{t('savedRecipe.save')}
            </button>
            <button
              onClick={handleCopyAsText}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs bg-surface-paper text-ink-muted border border-line rounded hover:bg-surface-muted"
              title={t('advDashboard.copyAsText')}
            >
              <Copy className="w-4 h-4" />{t('advDashboard.copy')}
            </button>
            {/* JSON 내보내기: 부가 기능 — 전문가 모드에서만 노출 */}
            {isExpertMode && (
            <button
              onClick={handleExportRecipe}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs text-ink-disabled rounded hover:bg-surface-muted hover:text-ink-muted"
              title={t('advDashboard.exportJson')}
            >
              <FileText className="w-4 h-4" />{t('advDashboard.json')}
            </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs bg-surface-paper text-ink-muted border border-line rounded hover:bg-surface-muted"
              title={t('advDashboard.print', { defaultValue: '인쇄 / PDF 저장' })}
            >
              <Printer className="w-4 h-4" />{t('advDashboard.printShort', { defaultValue: '인쇄' })}
            </button>
            {/* 타이머: 공정칩 Play·베이킹모드로도 도달 가능 — 헤더 버튼은 전문가 모드에서만 노출 */}
            {isExpertMode && (
            <button
              onClick={() => { setTimerSeed(null); setIsTimerOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] lg:min-h-0 text-xs bg-surface-paper text-ink-muted border border-line rounded hover:bg-surface-muted"
              title={t('advDashboard.timer', { defaultValue: '타이머' })}
            >
              <Timer className="w-4 h-4" />{t('advDashboard.timer', { defaultValue: '타이머' })}
            </button>
            )}
          </div></details>
          </div>
        </div>
      </div>

      {/* ===== 메인 콘텐츠 ===== */}
      {/* 모바일: 세로 스택(flex-col)으로 사이드바→본문 순서 흐름 / 데스크톱(lg): 기존 가로 분할 보존 */}
      <div className="workspace-body flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row">
        {/* 좌측 사이드바 + 리사이즈 핸들: 전문가 전용. 간단 모드는 전체 숨김 → 중앙 표가 전체폭.
            팬/오븐/제법 등 도메인 state는 언마운트돼도 컴포넌트에 유지되어 전문가 복귀 시 그대로 복원(리셋 없음). */}
        {(isExpertMode || !isDesktop) && (
        <>
        {/* ===== 좌측 사이드바 (리사이즈 가능) ===== */}
        {/* 모바일: 전체 너비(w-full)로 상단 배치 / 데스크톱(lg): 인라인 고정폭 적용 (isDesktop일 때만 width 지정해 가로 스크롤 방지) */}
        <div
          className="workspace-settings bg-surface-paper border-r flex-shrink-0 w-full lg:w-auto overflow-y-auto"
          style={isDesktop ? { width: layoutSettings.sidebarWidth } : undefined}
        >

          {/* 팬/틀 설정 */}
          <CollapsibleSection
            title={t('advDashboard.panSettings')}
            icon={<Layers className="w-4 h-4" />}
            badge={`${originalPan.quantity}${t('advDashboard.pan')}→${pans.reduce((s, p) => s + p.quantity, 0)}${t('advDashboard.pan')}`}
            badgeColor="bg-surface-muted text-ink-muted"
            onReset={resetPanSettings}
          >
            <div className="space-y-3">
              {/* 원래 팬 (레시피 원본) */}
              <div className="bg-surface-muted rounded p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted"><ClipboardList className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.originalPan')}</span>
                  {/* 팬/개수 모드 토글 */}
                  <div className="flex text-xs">
                    <button
                      onClick={() => updateOriginalPan('mode', 'pan')}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-l border ${originalPan.mode === 'pan' ? 'bg-ink-subtle text-white border-ink-subtle' : 'bg-surface-paper text-ink-muted border-line'}`}
                    ><Wheat className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.panMode')}</button>
                    <button
                      onClick={() => updateOriginalPan('mode', 'count')}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-r border-l-0 border ${originalPan.mode === 'count' ? 'bg-ink-subtle text-white border-ink-subtle' : 'bg-surface-paper text-ink-muted border-line'}`}
                    ><Hash className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.countMode')}</button>
                  </div>
                </div>

                {/* 팬 모드 */}
                {originalPan.mode === 'pan' && (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <select value={originalPan.category} onChange={(e) => updateOriginalPan('category', e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-surface-paper">
                        {Object.keys(PAN_DATA).map(cat => <option key={cat} value={cat}>{getLocalizedPanCategory(cat)}</option>)}
                      </select>
                      <select value={originalPan.type} onChange={(e) => updateOriginalPan('type', e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-surface-paper">
                        {PAN_DATA[originalPan.category as keyof typeof PAN_DATA]?.map(p =>
                          <option key={p.name} value={p.name}>{getLocalizedPanName(p)}</option>
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      <div>
                        <label className="text-xs text-ink-subtle block">{t('advDashboard.quantity')}</label>
                        <input type="number" value={originalPan.quantity}
                          onChange={(e) => updateOriginalPan('quantity', parseInt(e.target.value) || 1)}
                          className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                      </div>
                      <div>
                        <label className="text-xs text-ink-subtle block">{t('advDashboard.division')}</label>
                        <input type="number" value={originalPan.divisionCount}
                          onChange={(e) => updateOriginalPan('divisionCount', parseInt(e.target.value) || 1)}
                          className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                      </div>
                      <div>
                        <label className="text-xs text-ink-subtle block">{t('advDashboard.panWeight')}</label>
                        <input type="number" value={originalPan.panWeight}
                          onChange={(e) => updateOriginalPan('panWeight', parseInt(e.target.value) || 0)}
                          className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                      </div>
                      <div>
                        <label className="text-xs text-ink-subtle block">{t('advDashboard.divisionWeight')}</label>
                        <div className="text-center py-1 font-mono bg-surface-paper rounded border">{originalPan.divisionWeight}</div>
                      </div>
                    </div>
                  </>
                )}

                {/* 개수 모드 */}
                {originalPan.mode === 'count' && (
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div>
                      <label className="text-xs text-ink-subtle block">{t('advDashboard.count')}</label>
                      <input type="number" value={originalPan.unitCount || 10}
                        onChange={(e) => updateOriginalPan('unitCount', parseInt(e.target.value) || 0)}
                        className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                    </div>
                    <div>
                      <label className="text-xs text-ink-subtle block">{t('advDashboard.weightPerPiece')}</label>
                      <input type="number" value={originalPan.unitWeight || 50}
                        onChange={(e) => updateOriginalPan('unitWeight', parseInt(e.target.value) || 0)}
                        className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                    </div>
                    <div>
                      <label className="text-xs text-ink-subtle block">{t('advDashboard.total')}</label>
                      <div className="text-center py-1 font-mono bg-surface-paper rounded border font-semibold">
                        {(originalPan.unitCount || 10) * (originalPan.unitWeight || 50)}g
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-ink-subtle mt-1 text-right">
                  {t('advDashboard.total')}: <b>{originalPan.mode === 'count'
                    ? (originalPan.unitCount || 10) * (originalPan.unitWeight || 50)
                    : originalPan.panWeight * originalPan.quantity}g</b>
                </div>
              </div>

              {/* 화살표 */}
              <div className="flex justify-center text-ink-disabled">
                <ChevronDown className="w-5 h-5" />
              </div>

              {/* 변환 팬 (목표) */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-xs font-medium text-info-600"><Target className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.convertedPan')}</div>
                {pans.map((pan, idx) => (
                  <div key={pan.id} className="bg-info-50 rounded p-2 border border-info-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-info-700">{t('advDashboard.pan')} {idx + 1}</span>
                        {/* 팬/개수 모드 토글 */}
                        <div className="flex text-xs">
                          <button
                            onClick={() => updatePan(pan.id, 'mode', 'pan')}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-l border ${pan.mode === 'pan' ? 'bg-info-600 text-white border-info-600' : 'bg-surface-paper text-ink-muted border-line'}`}
                          ><Wheat className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.panMode')}</button>
                          <button
                            onClick={() => updatePan(pan.id, 'mode', 'count')}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-r border-l-0 border ${pan.mode === 'count' ? 'bg-info-600 text-white border-info-600' : 'bg-surface-paper text-ink-muted border-line'}`}
                          ><Hash className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.countMode')}</button>
                        </div>
                      </div>
                      {pans.length > 1 && (
                        <button onClick={() => removePan(pan.id)} className="text-ink-subtle hover:text-danger">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* 팬 모드 */}
                    {pan.mode === 'pan' && (
                      <>
                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                          <select value={pan.category} onChange={(e) => updatePan(pan.id, 'category', e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-surface-paper">
                            {Object.keys(PAN_DATA).map(cat => <option key={cat} value={cat}>{getLocalizedPanCategory(cat)}</option>)}
                          </select>
                          <select value={pan.type} onChange={(e) => updatePan(pan.id, 'type', e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-surface-paper">
                            {PAN_DATA[pan.category as keyof typeof PAN_DATA]?.map(p =>
                              <option key={p.name} value={p.name}>{getLocalizedPanName(p)}</option>
                            )}
                          </select>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-xs">
                          <div>
                            <label className="text-xs text-ink-subtle block">{t('advDashboard.quantity')}</label>
                            <input type="number" value={pan.quantity}
                              onChange={(e) => updatePan(pan.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" step="0.5" />
                          </div>
                          <div>
                            <label className="text-xs text-ink-subtle block">{t('advDashboard.division')}</label>
                            <input type="number" value={pan.divisionCount}
                              onChange={(e) => updatePan(pan.id, 'divisionCount', parseInt(e.target.value) || 1)}
                              className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                          </div>
                          <div>
                            <label className="text-xs text-ink-subtle block">{t('advDashboard.panWeight')}</label>
                            <input type="number" value={pan.panWeight}
                              onChange={(e) => updatePan(pan.id, 'panWeight', parseInt(e.target.value) || 0)}
                              className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                          </div>
                          <div>
                            <label className="text-xs text-ink-subtle block">{t('advDashboard.divisionWeight')}</label>
                            <div className="text-center py-1 font-mono bg-surface-paper rounded border">{pan.divisionWeight}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* 개수 모드 (모닝빵 등) */}
                    {pan.mode === 'count' && (
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <div>
                          <label className="text-xs text-ink-subtle block">{t('advDashboard.count')}</label>
                          <input type="number" value={pan.unitCount || 10}
                            onChange={(e) => updatePan(pan.id, 'unitCount', parseInt(e.target.value) || 0)}
                            className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                        </div>
                        <div>
                          <label className="text-xs text-ink-subtle block">{t('advDashboard.weightPerPiece')}</label>
                          <input type="number" value={pan.unitWeight || 50}
                            onChange={(e) => updatePan(pan.id, 'unitWeight', parseInt(e.target.value) || 0)}
                            className="w-full border rounded px-1.5 py-1 text-center bg-surface-paper" />
                        </div>
                        <div>
                          <label className="text-xs text-ink-subtle block">{t('advDashboard.total')}</label>
                          <div className="text-center py-1 font-mono bg-surface-paper rounded border font-semibold">
                            {(pan.unitCount || 10) * (pan.unitWeight || 50)}g
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addPan} className="w-full text-xs text-info-600 hover:text-info-700 py-1.5 border border-dashed border-info-200 rounded">
                  {t('advDashboard.addPan')}
                </button>
                <div className="text-xs text-info-700 text-right">
                  {t('advDashboard.total')}: <b className="tnum">{panTotalWeight}g</b>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* 비용적/비중 설정 - 제빵: 비용적, 제과: 비중 */}
          <CollapsibleSection
            title={productType === 'bread' ? t('advDashboard.specificVolume') : t('advDashboard.specificGravity')}
            icon={<Scale className="w-4 h-4" />}
            defaultOpen={false}
            onReset={resetSpecificVolume}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-subtle block mb-1">{t('advDashboard.originalProduct')}</label>
                <select value={originalProduct} onChange={(e) => setOriginalProduct(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1">
                  {productType === 'bread'
                    ? Object.keys(BREAD_SPECIFIC_VOLUMES).map(p => <option key={p} value={p}>{getLocalizedProductName(p)}</option>)
                    : Object.keys(CAKE_BATTER_SPECIFIC_GRAVITY).map(p => <option key={p} value={p}>{getLocalizedProductName(p)}</option>)
                  }
                </select>
                <div className="text-xs text-ink-disabled mt-1">
                  {productType === 'bread'
                    ? `비용적: ${BREAD_SPECIFIC_VOLUMES[originalProduct] || SPECIFIC_VOLUMES[originalProduct]} cm³/g`
                    : `비중: ${CAKE_BATTER_SPECIFIC_GRAVITY[originalProduct]}`
                  }
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-subtle block mb-1">{t('advDashboard.convertedProduct')}</label>
                <select value={convertedProduct} onChange={(e) => setConvertedProduct(e.target.value)}
                  className="w-full text-xs border rounded px-2 py-1">
                  {productType === 'bread'
                    ? Object.keys(BREAD_SPECIFIC_VOLUMES).map(p => <option key={p} value={p}>{getLocalizedProductName(p)}</option>)
                    : Object.keys(CAKE_BATTER_SPECIFIC_GRAVITY).map(p => <option key={p} value={p}>{getLocalizedProductName(p)}</option>)
                  }
                </select>
                <div className="text-xs text-ink-disabled mt-1">
                  {productType === 'bread'
                    ? `비용적: ${BREAD_SPECIFIC_VOLUMES[convertedProduct] || SPECIFIC_VOLUMES[convertedProduct]} cm³/g`
                    : `비중: ${CAKE_BATTER_SPECIFIC_GRAVITY[convertedProduct]}`
                  }
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* 수율 손실 예측 - 제빵 전용 */}
          {productType === 'bread' && (
            <CollapsibleSection
              title={t('advDashboard.yieldPrediction')}
              icon={<TrendingDown className="w-4 h-4" />}
              defaultOpen={false}
              badge={`${Math.round((1 - 0.19) * totalWeight)}g ${t('advDashboard.expectedYield')}`}
            >
              <YieldLossCalculator
                inputWeight={totalWeight}
                category={originalProduct === '쉬폰케이크' || originalProduct === '제누와즈' || originalProduct === '파운드케이크' ? 'cake'
                  : originalProduct === '크루아상' || originalProduct === '데니쉬' ? 'pastry'
                  : originalProduct === '쿠키' ? 'cookie'
                  : 'bread'}
                productType={
                  originalProduct === '풀먼식빵' ? 'pullman'
                  : originalProduct === '산형식빵' ? 'mountain'
                  : originalProduct === '브리오슈' ? 'brioche'
                  : originalProduct === '제누와즈' ? 'genoise'
                  : originalProduct === '쉬폰케이크' ? 'chiffon'
                  : originalProduct === '파운드케이크' ? 'pound'
                  : originalProduct === '크루아상' ? 'croissant'
                  : undefined
                }
                stageSelection={yieldStageSelection}
                onStageSelectionChange={setYieldStageSelection}
                compact={false}
                className="border-0 shadow-none"
              />
            </CollapsibleSection>
          )}

          {/* 오븐 설정 */}
          <CollapsibleSection
            title={t('advDashboard.oven')}
            defaultOpen={false}
            icon={<Flame className="w-4 h-4" />}
            badge={(() => {
              const typeLabel = t(`advDashboard.ovenTypes.${oven.type}`);
              const levelInfo = oven.type === 'convection' && oven.level ? ` ${oven.level}${t('advDashboard.level')}` : '';
              const tempInfo = oven.type === 'deck'
                ? `${oven.firstBake.topTemp}/${oven.firstBake.bottomTemp}°C`
                : `${oven.firstBake.topTemp}°C`;
              const firstBake = `${tempInfo} ${oven.firstBake.time}${t('units.minute')}`;
              // 2차 굽기가 있으면 추가 표시
              const secondBake = oven.secondBake.time > 0
                ? oven.type === 'deck'
                  ? ` → ${oven.secondBake.topTemp}/${oven.secondBake.bottomTemp}°C ${oven.secondBake.time}${t('units.minute')}`
                  : ` → ${oven.secondBake.topTemp}°C ${oven.secondBake.time}${t('units.minute')}`
                : '';
              return `${typeLabel}${levelInfo} ${firstBake}${secondBake}`;
            })()}
            badgeColor="bg-surface-muted text-ink-muted"
            onReset={resetOvenSettings}
          >
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {(['convection', 'deck', 'airfryer'] as const).map(type => (
                  <button key={type} onClick={() => setOven({ ...oven, type })}
                    className={`flex-1 px-2 py-1 text-xs rounded ${oven.type === type ? 'bg-brand-500 text-white' : 'bg-surface-muted'}`}>
                    {t(`advDashboard.ovenTypes.${type}`)}
                  </button>
                ))}
              </div>
              {/* 컨벡션 오븐일 때만 단 선택 표시 */}
              {oven.type === 'convection' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ink-subtle">{t('advDashboard.levelSelect')}:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(level => {
                      const levels = oven.level ? oven.level.split(',').map(s => s.trim()) : [];
                      const isSelected = levels.includes(String(level));
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            let newLevels: string[];
                            if (isSelected) {
                              newLevels = levels.filter(l => l !== String(level));
                            } else {
                              newLevels = [...levels, String(level)].sort((a, b) => Number(a) - Number(b));
                            }
                            setOven({ ...oven, level: newLevels.join(', ') });
                          }}
                          className={`w-6 h-6 rounded text-xs font-medium tnum ${isSelected ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink-muted hover:bg-line'}`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                  {oven.level && <span className="text-ink-muted font-medium">{oven.level}{t('advDashboard.level')}</span>}
                </div>
              )}
              <div className="bg-surface-muted rounded p-2">
                <div className="text-xs font-medium text-ink-muted mb-1.5">{t('advDashboard.firstBake')}</div>
                {oven.type === 'deck' ? (
                  /* 데크 오븐: 윗불/아랫불 분리 */
                  <div className="grid grid-cols-3 gap-1.5">
                    <div><label className="text-xs text-ink-subtle">{t('advDashboard.topHeat')}</label>
                      <input type="number" value={oven.firstBake.topTemp}
                        onChange={(e) => setOven({ ...oven, firstBake: { ...oven.firstBake, topTemp: parseInt(e.target.value) || 0 } })}
                        className="w-full text-xs border rounded px-1.5 py-1 text-center" /></div>
                    <div><label className="text-xs text-ink-subtle">{t('advDashboard.bottomHeat')}</label>
                      <input type="number" value={oven.firstBake.bottomTemp}
                        onChange={(e) => setOven({ ...oven, firstBake: { ...oven.firstBake, bottomTemp: parseInt(e.target.value) || 0 } })}
                        className="w-full text-xs border rounded px-1.5 py-1 text-center" /></div>
                    <div><label className="text-xs text-ink-subtle">{t('advDashboard.timeMin')}</label>
                      <input type="number" value={oven.firstBake.time}
                        onChange={(e) => setOven({ ...oven, firstBake: { ...oven.firstBake, time: parseInt(e.target.value) || 0 } })}
                        className="w-full text-xs border rounded px-1.5 py-1 text-center" /></div>
                  </div>
                ) : (
                  /* 컨벡션/에어프라이: 단일 온도 */
                  <div className="grid grid-cols-2 gap-1.5">
                    <div><label className="text-xs text-ink-subtle">{t('advDashboard.temperature')}</label>
                      <input type="number" value={oven.firstBake.topTemp}
                        onChange={(e) => {
                          const temp = parseInt(e.target.value) || 0;
                          setOven({ ...oven, firstBake: { ...oven.firstBake, topTemp: temp, bottomTemp: temp } });
                        }}
                        className="w-full text-xs border rounded px-1.5 py-1 text-center" /></div>
                    <div><label className="text-xs text-ink-subtle">{t('advDashboard.timeMin')}</label>
                      <input type="number" value={oven.firstBake.time}
                        onChange={(e) => setOven({ ...oven, firstBake: { ...oven.firstBake, time: parseInt(e.target.value) || 0 } })}
                        className="w-full text-xs border rounded px-1.5 py-1 text-center" /></div>
                  </div>
                )}
              </div>
              <div className="bg-surface-muted rounded p-2">
                <div className="text-xs text-ink-subtle mb-1.5">{t('advDashboard.secondBake')}</div>
                {oven.type === 'deck' ? (
                  /* 데크 오븐: 윗불/아랫불 분리 */
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="number" value={oven.secondBake.topTemp || ''}
                      onChange={(e) => setOven({ ...oven, secondBake: { ...oven.secondBake, topTemp: parseInt(e.target.value) || 0 } })}
                      className="text-xs border rounded px-1.5 py-1 text-center" placeholder={t('advDashboard.topHeat')} />
                    <input type="number" value={oven.secondBake.bottomTemp || ''}
                      onChange={(e) => setOven({ ...oven, secondBake: { ...oven.secondBake, bottomTemp: parseInt(e.target.value) || 0 } })}
                      className="text-xs border rounded px-1.5 py-1 text-center" placeholder={t('advDashboard.bottomHeat')} />
                    <input type="number" value={oven.secondBake.time || ''}
                      onChange={(e) => setOven({ ...oven, secondBake: { ...oven.secondBake, time: parseInt(e.target.value) || 0 } })}
                      className="text-xs border rounded px-1.5 py-1 text-center" placeholder={t('units.time')} />
                  </div>
                ) : (
                  /* 컨벡션/에어프라이: 단일 온도 */
                  <div className="grid grid-cols-2 gap-1.5">
                    <input type="number" value={oven.secondBake.topTemp || ''}
                      onChange={(e) => {
                        const temp = parseInt(e.target.value) || 0;
                        setOven({ ...oven, secondBake: { ...oven.secondBake, topTemp: temp, bottomTemp: temp } });
                      }}
                      className="text-xs border rounded px-1.5 py-1 text-center" placeholder={t('advDashboard.temperature')} />
                    <input type="number" value={oven.secondBake.time || ''}
                      onChange={(e) => setOven({ ...oven, secondBake: { ...oven.secondBake, time: parseInt(e.target.value) || 0 } })}
                      className="text-xs border rounded px-1.5 py-1 text-center" placeholder={t('units.time')} />
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* 제법/사전반죽 - 제빵 전용 */}
          {productType === 'bread' && (
            <CollapsibleSection
              title={t('advDashboard.method')}
              defaultOpen={false}
              icon={<Wheat className="w-4 h-4" />}
              badge={t(METHOD_KEYS[method.type])}
              badgeColor="bg-surface-muted text-ink-muted"
            >
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-1">
                  {Object.entries(METHOD_KEYS).map(([key, labelKey]) => (
                    <button key={key} onClick={() => handleMethodChange(key)}
                      className={`px-1.5 py-1 text-xs rounded ${method.type === key ? 'bg-brand-500 text-white' : 'bg-surface-muted hover:bg-line'}`}>
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
                {/* 저온발효/저온숙성: 이스트 조정 정보 표시 */}
                {(method.type === 'coldFerment' || method.type === 'retard') && (
                  <div className="bg-info-50 rounded p-2">
                    <div className="inline-flex items-center gap-1 text-xs font-medium text-info-700 mb-1">
                      {method.type === 'coldFerment'
                        ? <><Snowflake className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.coldFerment')}</>
                        : <><Moon className="w-3 h-3" strokeWidth={1.75} />{t('advDashboard.coldRetard')}</>}
                    </div>
                    <div className="text-xs text-info-600">
                      {method.type === 'coldFerment'
                        ? t('advDashboard.coldFermentDesc', { percent: Math.round(method.yeastAdjustment * 100) })
                        : t('advDashboard.coldRetardDesc')
                      }
                    </div>
                  </div>
                )}
                {/* 사전반죽이 있는 제법만 비율 조정 표시 (coldFerment/retard 제외) */}
                {method.type !== 'straight' && method.type !== 'coldFerment' && method.type !== 'retard' && (
                  <div className="bg-surface-muted rounded p-2">
                    <div className="text-xs font-medium text-ink-muted mb-1.5">{t('advDashboard.prefermentRatio')}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-ink-subtle">{t('advDashboard.flourPercent')}</label>
                        <input type="number" value={Math.round(method.flourRatio * 100)}
                          onChange={(e) => setMethod({ ...method, flourRatio: (parseFloat(e.target.value) || 0) / 100 })}
                          className="w-full text-xs border rounded px-1.5 py-1 text-center" step="10" /></div>
                      <div><label className="text-xs text-ink-subtle">{t('advDashboard.waterPercent')}</label>
                        <input type="number" value={Math.round(method.waterRatio * 100)}
                          onChange={(e) => setMethod({ ...method, waterRatio: (parseFloat(e.target.value) || 0) / 100 })}
                          className="w-full text-xs border rounded px-1.5 py-1 text-center" step="10" /></div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 레이아웃 초기화 버튼 */}
          <div className="p-2 border-t">
            <button
              onClick={resetLayoutSettings}
              className="w-full flex items-center justify-center gap-1 text-xs text-ink-subtle hover:text-ink-muted py-1"
              title={t('advDashboard.layoutReset')}
            >
              <RotateCcw className="w-3 h-3" />
              {t('advDashboard.layoutReset')}
            </button>
          </div>
        </div>

        {/* 사이드바 리사이즈 핸들 (모바일 세로 스택에서는 의미 없어 숨김 / 데스크톱만 표시) */}
        <div className="hidden lg:block">
          <ResizeHandle
            direction="horizontal"
            onResize={(delta) => setSidebarWidth(layoutSettings.sidebarWidth + delta)}
            className="hover:bg-brand-100"
          />
        </div>
        </>
        )}

        {/* ===== 중앙: 레시피 테이블 (컴팩트) ===== */}
        <div className="workspace-content flex-1 min-w-0 flex flex-col overflow-visible lg:overflow-hidden min-h-0">
          {/* 새 레시피 안내: 빈 상태일 때 직접 입력 또는 예시 불러오기 유도 */}
          {isEmptyRecipe && (
            <div className="mx-1 mt-1 rounded-md bg-brand-50 border border-brand-200 px-3 py-2 flex items-center justify-between gap-2 flex-wrap flex-shrink-0">
              <span className="text-xs text-ink-muted flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                {t('advDashboard.emptyRecipeHint', { defaultValue: '새 레시피입니다. 재료를 직접 입력하거나 예시를 불러와 시작하세요.' })}
              </span>
              <button
                onClick={loadExample}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition-colors flex-shrink-0"
              >
                {t('advDashboard.loadExample', { defaultValue: '예시 불러오기' })}
              </button>
            </div>
          )}
          <div className="workspace-tables flex-1 overflow-auto p-3 min-h-0">
            {/* 모바일: 원본/변환을 세로 스택(grid-cols-1)으로 가로 스크롤 방지 / 데스크톱(lg): 변환 시에만 2열, 미변환 시 원본표 전체폭 */}
            <div className={`grid gap-3 h-full grid-cols-1 ${isConverted ? 'xl:grid-cols-2' : ''}`}>

              {/* 원래 레시피 */}
              <div className="workspace-original bg-surface-paper rounded-xl border flex flex-col overflow-hidden min-w-0">
                <div className="bg-surface-muted border-b px-2 py-1 flex items-center justify-between flex-shrink-0 gap-2">
                  <span className="font-semibold text-ink-muted flex items-center gap-1 text-xs">
                    <Droplets className="w-3 h-3 flex-shrink-0" />{t('advDashboard.originalRecipe')}
                  </span>
                  <div className="flex gap-2 print-hide">
                    {/* 가독 최소치 text-xs로 상향 + 모바일 터치영역(py) 확보 */}
                    <button onClick={() => setIsBulkInputOpen(true)} className="inline-flex items-center gap-1 text-xs text-info-600 hover:text-info-700 font-medium py-1.5 lg:py-0"><ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} />{t('advDashboard.bulkInput')}</button>
                    <button onClick={addIngredient} className="text-xs text-brand-600 hover:text-brand-700 font-medium py-1.5 lg:py-0">{t('advDashboard.addIngredient')}</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-surface-muted sticky top-0">
                      <tr className={`text-ink-subtle font-semibold tracking-wide ${dynamicStyles.fontSize}`}>
                        <th className="px-1.5 py-1 text-left w-16">{t('advDashboard.category')}</th>
                        <th className="px-1.5 py-1 text-left">{t('advDashboard.ingredients')}</th>
                        <th className={`px-1.5 py-1 text-left w-20 ${isExpertMode ? '' : 'hidden'}`}>{t('advDashboard.process')}</th>
                        <th className={`px-1.5 py-1 text-right w-14 ${isExpertMode ? '' : 'hidden'}`}>{t('advDashboard.tableHeaderPercent')}</th>
                        <th className="px-1.5 py-1 text-right w-16 border-l border-line">{t('advDashboard.tableHeaderGram')}</th>
                        <th className="w-5"></th>
                      </tr>
                    </thead>
                    <tbody className={dynamicStyles.fontSize}>
                      {ingredientsByPhase.map(({ phase, items }, phaseIndex) => {
                        const phaseMeta = PHASE_META[phase] || PHASE_META.other;
                        const PhaseIcon = phaseMeta.icon;
                        return (
                          <React.Fragment key={`${phase}-${phaseIndex}`}>
                            {/* 단계 구분선 (2개 이상 단계가 있을 때만 표시) */}
                            {hasMultiplePhases && (
                              <tr className={`${phaseMeta.bgColor} ${phaseMeta.borderColor} border-y-2`}>
                                <td colSpan={6} className={`px-2 py-1 ${phaseMeta.textColor} font-semibold text-xs tracking-wide`}>
                                  <span className="flex items-center gap-1.5">
                                    <PhaseIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                                    <span>{t(phaseMeta.labelKey)}</span>
                                    <span className="text-xs font-normal opacity-70 tnum">({t('advDashboard.itemCount', { count: items.length })})</span>
                                    <span className="ml-auto font-mono font-semibold tnum">{t('advDashboard.subtotal', { defaultValue: '소계' })} {formatWeight(items.reduce((s: number, i: any) => s + (i.amount || 0), 0))}g</span>
                                  </span>
                                </td>
                              </tr>
                            )}
                            {/* 해당 단계의 재료들 */}
                            {items.map(ing => {
                              // 제품 타입에 따라 사용 가능한 phase 목록 결정
                              const availablePhases = productType === 'bread'
                                ? ['main', 'preferment', 'tangzhong', 'autolyse', 'topping', 'other']
                                : ['main', 'filling', 'frosting', 'topping', 'glaze', 'other'];

                              return (
                                // key: 원본 재료 id는 전역 고유하지만 단계(phase) 스코프를 prefix로
                                // 추가해 단계 재배치 시에도 안정적이고 고유한 키를 보장
                                <tr key={`${phase}-${ing.id}`} className={`ingredient-row border-b border-line-soft hover:bg-surface-muted ${dynamicStyles.rowHeight}`}>
                                  <td className="px-1.5 rounded focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-inset">
                                    <select aria-label={`${ing.name} ${t('advDashboard.category')}`} value={ing.category} onChange={(e) => updateIngredient(ing.id, 'category', e.target.value)}
                                      className="w-full text-xs border-0 bg-transparent p-0 focus:outline-none appearance-none cursor-pointer">
                                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-1.5 rounded focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-inset">
                                    <AutocompleteInput
                                      value={ing.name}
                                      onChange={(value) => updateIngredient(ing.id, 'name', value)}
                                      onSelect={(value) => {
                                        // 재료 선택 시 카테고리도 자동 설정
                                        const info = findIngredientInfo(value);
                                        if (info) {
                                          updateIngredient(ing.id, 'name', value);
                                          // 카테고리 매핑
                                          const categoryMap: Record<string, string> = {
                                            flour: 'flour', liquid: 'liquid', fat: 'wetOther',
                                            sugar: 'other', egg: 'wetOther', dairy: 'liquid',
                                            leavening: 'other', salt: 'other', flavoring: 'other',
                                            nut: 'other', fruit: 'other', chocolate: 'other', other: 'other'
                                          };
                                          updateIngredient(ing.id, 'category', categoryMap[info.category] || 'other');
                                        }
                                      }}
                                      placeholder={t('advDashboard.name')}
                                      className="!border-0 !p-0 !ring-0 text-sm bg-transparent"
                                      maxSuggestions={6}
                                    />
                                  </td>
                                  <td className={`px-1.5 rounded focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-inset ${isExpertMode ? '' : 'hidden'}`}>
                                    <select
                                      value={ing.phase || 'main'}
                                      onChange={(e) => updateIngredient(ing.id, 'phase', e.target.value)}
                                      className="w-full text-xs border-0 bg-transparent p-0 focus:outline-none appearance-none cursor-pointer"
                                    >
                                      {availablePhases.map(phaseKey => {
                                        const meta = PHASE_META[phaseKey];
                                        return (
                                          <option key={phaseKey} value={phaseKey}>
                                            {t(meta.labelKey)}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>
                                  <td className={`px-1.5 text-right font-mono text-ink-subtle text-xs ${isExpertMode ? '' : 'hidden'}`}>{flourTotal > 0 ? Math.round((ing.amount / flourTotal) * 1000) / 10 : 0}%</td>
                                  <td className="px-1.5 border-l border-line rounded focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-inset">
                                    <input type="number" min="0" step="any" inputMode="decimal" aria-label={`${ing.name} ${t('advDashboard.tableHeaderGram')}`} value={ing.amount} onChange={(e) => updateIngredient(ing.id, 'amount', Math.max(0, parseFloat(e.target.value) || 0))}
                                      className="w-full text-right font-mono bg-transparent border-0 p-0 focus:outline-none text-sm font-semibold text-ink" />
                                  </td>
                                  <td className="px-0.5 print-hide">
                                    <button onClick={() => removeIngredient(ing.id)} className="p-2 text-ink-subtle hover:text-danger" title={t('advDashboard.removeIngredient', { defaultValue: '재료 삭제' })}>
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-surface-muted border-t px-2 py-1 text-xs flex-shrink-0">
                  <span>{t('advDashboard.total')}: <b className="tnum">{totalWeight}g</b></span>
                </div>
              </div>

              {/* 변환 레시피 (단계별 구분선 포함) — 배수가 1이면 원본과 동일하므로 숨김 */}
              {/* H7: 태블릿/모바일에선 변환(결과) 표를 먼저 노출(결과우선). 데스크톱(lg) 2열에선 기존 좌우 배치 유지. */}
              {(isConverted || !isDesktop) && (
              <div className="workspace-result bg-surface-paper rounded-xl border border-info-200 flex flex-col overflow-hidden min-w-0">
                <div className="bg-info-50 border-b border-info-200 px-2 py-1 flex items-center justify-between flex-shrink-0 gap-2">
                  <span className="font-semibold text-info-700 flex items-center gap-1 text-xs">
                    <ThermometerSun className="w-3 h-3 flex-shrink-0" />{t('advDashboard.convertedRecipe')}
                  </span>
                  {effectiveMultiplier !== 1 && <span className="text-xs bg-info-200 text-info-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">×{effectiveMultiplier}</span>}
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-info-50 sticky top-0">
                      <tr className={`text-info-700 font-semibold tracking-wide ${dynamicStyles.fontSize}`}>
                        <th className="w-6 px-1 py-1 print-hide" title={t('advDashboard.miseEnPlace', { defaultValue: '계량 체크' })}></th>
                        <th className="px-2 py-1 text-left">{t('advDashboard.category')}</th>
                        <th className="px-2 py-1 text-left">{t('advDashboard.ingredients')}</th>
                        <th className={`px-2 py-1 text-right w-12 ${isExpertMode ? '' : 'hidden'}`}>%</th>
                        <th className="px-2 py-1 text-right w-16 border-l border-info-100">{t('advDashboard.tableHeaderGram')}</th>
                      </tr>
                    </thead>
                    <tbody className={dynamicStyles.fontSize}>
                      {convertedIngredientsByPhase.map(({ phase, items }, phaseIndex) => {
                        const phaseMeta = PHASE_META[phase] || PHASE_META.other;
                        const PhaseIcon = phaseMeta.icon;
                        return (
                          <React.Fragment key={`${phase}-${phaseIndex}`}>
                            {/* 단계 구분선 (2개 이상 단계가 있을 때만 표시) */}
                            {convertedHasMultiplePhases && (
                              <tr className={`${phaseMeta.bgColor} ${phaseMeta.borderColor} border-y-2`}>
                                <td colSpan={5} className={`px-2 py-1 ${phaseMeta.textColor} font-semibold text-xs tracking-wide`}>
                                  <span className="flex items-center gap-1.5">
                                    <PhaseIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                                    <span>{t(phaseMeta.labelKey)}</span>
                                    <span className="text-xs font-normal opacity-70 tnum">({t('advDashboard.itemCount', { count: items.length })})</span>
                                    <span className="ml-auto font-mono font-semibold tnum">{t('advDashboard.subtotal', { defaultValue: '소계' })} {formatWeight(items.reduce((s: number, i: any) => s + (i.convertedAmount || 0), 0))}g</span>
                                  </span>
                                </td>
                              </tr>
                            )}
                            {/* 해당 단계의 재료들 */}
                            {/* key: 단계(phase) + 카테고리 + id + index 복합 키로 중복 방지
                                (스트레이트법 합산 경로에서 liquid/other 이름이 같으면 ing.id가
                                 'straight-${name}' 형태로 충돌할 수 있어 phase 스코프로 격리) */}
                            {items.map((ing: any, ingIndex: number) => {
                              const rowKey = `${phase}-${ing.category}-${ing.id}-${ingIndex}`;
                              const isChecked = checkedIngredients.has(rowKey);
                              return (
                              <tr key={rowKey} className={`border-b border-info-100 ${dynamicStyles.rowHeight} ${isChecked ? 'opacity-50 line-through' : ''}`}>
                                <td className="px-1 text-center print-hide">
                                  <button
                                    onClick={() => toggleIngredientChecked(rowKey)}
                                    className="text-ink-disabled hover:text-success align-middle"
                                    title={t('advDashboard.toggleWeighed', { defaultValue: '계량 완료' })}
                                    aria-pressed={isChecked}
                                  >
                                    {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-success" /> : <Square className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                                <td className="px-2 text-info-600">{CATEGORY_LABELS[ing.category as keyof typeof CATEGORY_LABELS]}</td>
                                <td className="px-2">{translateIngredient(ing.name)}</td>
                                <td className={`px-2 text-right font-mono text-ink-subtle ${isExpertMode ? '' : 'hidden'}`}>{convertedFlourTotal > 0 ? Math.round((ing.convertedAmount / convertedFlourTotal) * 1000) / 10 : 0}%</td>
                                <td className="px-2 text-right font-mono text-sm font-semibold text-info-700 border-l border-info-100"><span key={ing.convertedAmount} className="inline-block px-1 rounded animate-valueFlash">{formatWeight(ing.convertedAmount)}</span></td>
                              </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-info-50 border-t border-info-200 px-2 py-1 text-xs flex-shrink-0">
                  <span className="text-info-700">{t('advDashboard.total')}: <b className="tnum">{convertedTotal}g</b></span>
                </div>
              </div>
              )}

              {/* 변환 없음: 배수/팬을 바꾸면 변환표가 표시된다는 조용한 안내 */}
              {!isConverted && isDesktop && (
                <div className="rounded-md bg-surface-muted border border-line px-3 py-2 text-xs text-ink-muted flex items-center gap-1.5 self-start">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  {isExpertMode
                    ? t('advDashboard.conversionHint', { defaultValue: '배수 또는 팬 크기를 바꾸면 변환 결과가 여기에 표시됩니다.' })
                    : t('advDashboard.conversionHintSimple', { defaultValue: '배수를 바꾸면 변환 결과가 여기에 표시됩니다.' })}
                </div>
              )}
            </div>
          </div>

          {/* 공정 패널 리사이즈 핸들 (모바일 세로 스택에서는 숨김 / 데스크톱만 표시) */}
          <div className="hidden lg:block">
            <ResizeHandle
              direction="vertical"
              onResize={(delta) => setProcessPanelHeight(layoutSettings.processPanelHeight - delta)}
              className="hover:bg-brand-100"
            />
          </div>

          {/* ===== 하단: 공정 패널 (리사이즈 가능) ===== */}
          {/* 모바일: 고정 높이 인라인 style 미적용(내용만큼 자연 확장) / 데스크톱(lg): 기존 리사이즈 높이 보존 */}
          <div
            className="workspace-process bg-surface-paper border-t flex-shrink-0 overflow-hidden flex flex-col"
            style={isDesktop ? { minHeight: layoutSettings.processPanelHeight } : undefined}
          >
            <div className="bg-surface-muted border-b px-3 py-1 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold text-ink-muted flex items-center gap-1.5 text-sm">
                <ListOrdered className="w-4 h-4" />{t('advDashboard.processMemo')}
                <span className="text-xs font-normal text-ink-subtle ml-1">
                  {t('advDashboard.totalMinutes', { minutes: processes.reduce((s, p) => s + (p.time || 0), 0) })}
                </span>
                {processes.length > 0 && (
                  <span className="text-xs font-normal text-ink-subtle ml-1 inline-flex items-center gap-0.5">
                    <CheckSquare className="w-3 h-3" />
                    {t('advDashboard.doneCount', { defaultValue: '완료 {{done}}/{{total}}', done: completedProcesses.size, total: processes.length })}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3 print-hide">
                {/* H1: 전용 베이킹 모드 진입 (공정이 있을 때만) */}
                <button
                  onClick={() => setIsBakingMode(true)}
                  disabled={processes.length === 0}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('advDashboard.bakingMode.title', { defaultValue: '베이킹 모드' })}
                >
                  <Flame className="w-3.5 h-3.5" />{t('advDashboard.bakingMode.title', { defaultValue: '베이킹 모드' })}
                </button>
                <button onClick={addProcess} className="text-xs text-brand-600 hover:text-brand-700 font-medium">{t('advDashboard.addProcess')}</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-2 py-1.5">
              <div className="flex flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-start">
                {/* H4: 공정을 phase 그룹(타임라인)으로 렌더. 단일 phase면 구분선 없이 기존 flat 동작. */}
                {processesByPhase.map((group) => {
                  const groupMeta = PHASE_META[group.phase] || PHASE_META.other;
                  const GroupIcon = groupMeta.icon;
                  return (
                  <React.Fragment key={group.phase}>
                    {hasMultipleProcessPhases && (
                      <div className={`w-full lg:basis-full flex items-center gap-1.5 mt-1 first:mt-0 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide ${groupMeta.bgColor} ${groupMeta.textColor}`}>
                        <GroupIcon className="w-3 h-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span>{t(groupMeta.labelKey)}</span>
                      </div>
                    )}
                    {group.items.map((proc) => {
                  const idx = processes.findIndex(p => p.id === proc.id);
                  const availablePhases = productType === 'bread'
                    ? ['main', 'preferment', 'tangzhong', 'autolyse', 'topping', 'other']
                    : ['main', 'filling', 'frosting', 'topping', 'glaze', 'other'];
                  const itemSize = getProcessItemSize(proc.id);
                  const displayText = editingProcessId === proc.id ? proc.description : translateProcessStep(proc.description || '');
                  const isDone = completedProcesses.has(proc.id);
                  return (
                  <div
                    key={proc.id}
                    className={`flex items-start gap-1 bg-surface-muted border rounded px-1.5 py-1 text-xs group hover:bg-surface-muted relative transition-opacity ${isDone ? 'opacity-60' : ''}`}
                    style={{ minWidth: itemSize.width || 200, maxWidth: '100%' }}
                  >
                    {/* C1: 완료 체크(실행 모드) - 칩 탭(편집)과 충돌 않도록 별도 버튼 */}
                    <button
                      onClick={() => toggleProcessDone(proc.id)}
                      className="flex-shrink-0 mt-0.5 text-ink-disabled hover:text-success print-hide"
                      title={t('advDashboard.toggleDone', { defaultValue: '완료 표시' })}
                      aria-pressed={isDone}
                    >
                      {isDone ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4" />}
                    </button>
                    {/* 순서 변경 버튼 */}
                    <div className="flex flex-col opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex-shrink-0">
                      <button
                        onClick={() => moveProcess(proc.id, 'up')}
                        className="text-ink-disabled hover:text-ink-muted -mb-0.5"
                        disabled={idx === 0}
                        title={t('advDashboard.moveUp')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveProcess(proc.id, 'down')}
                        className="text-ink-disabled hover:text-ink-muted -mt-0.5"
                        disabled={idx === processes.length - 1}
                        title={t('advDashboard.moveDown')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-ink-disabled font-mono text-xs w-4 flex-shrink-0">{idx + 1}.</span>
                    {editingProcessId === proc.id ? (
                      <div
                        className="flex-1 min-w-0 flex flex-col gap-1"
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setEditingProcessId(null); }}
                      >
                        <textarea
                          value={displayText}
                          onChange={(e) => updateProcess(proc.id, 'description', e.target.value)}
                          autoFocus
                          className="bg-transparent border-0 p-0 focus:outline-none text-sm w-full resize-none leading-relaxed"
                          placeholder={t('advDashboard.processPlaceholder')}
                          rows={3}
                        />
                        {/* H4: 이 공정의 phase(단계) 지정 - 타임라인 그룹핑 소스 */}
                        <select
                          value={proc.phase || 'main'}
                          onChange={(e) => updateProcess(proc.id, 'phase', e.target.value)}
                          className="text-xs text-ink-muted border border-line rounded px-1 py-0.5 bg-surface-paper focus:outline-none cursor-pointer"
                          aria-label={t('advDashboard.processPhase', { defaultValue: '공정 단계' })}
                        >
                          {availablePhases.map(phaseKey => {
                            const m = PHASE_META[phaseKey];
                            return (
                              <option key={phaseKey} value={phaseKey}>
                                {t(m.labelKey)}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingProcessId(proc.id)}
                        className={`flex-1 min-w-0 cursor-text leading-relaxed whitespace-pre-wrap text-sm ${isDone ? 'line-through text-ink-subtle' : ''}`}
                      >
                        {displayText || <span className="text-ink-disabled">{t('advDashboard.processPlaceholder')}</span>}
                      </div>
                    )}
                    {/* 시간: 값이 있을 때 뱃지 표시 + 삭제 버튼 */}
                    {proc.time ? (
                      <div className="flex items-center gap-0.5 text-xs text-info-600 bg-info-50 px-1.5 py-0.5 rounded group/time">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <input
                          type="number"
                          value={proc.time}
                          onChange={(e) => updateProcess(proc.id, 'time', parseInt(e.target.value) || 0)}
                          className="w-8 bg-transparent border-0 p-0 text-center focus:outline-none tnum"
                        />
                        <span className="text-xs flex-shrink-0">{t('units.minute')}</span>
                        <button
                          onClick={() => startTimerFromProcess(translateProcessStep(proc.description || '') || t('advDashboard.processStepN', { defaultValue: '공정 {{n}}', n: idx + 1 }), proc.time || 0)}
                          className="text-info-600 hover:text-info-700 ml-0.5 flex-shrink-0 print-hide"
                          title={t('advDashboard.startTimer', { defaultValue: '이 시간으로 타이머 시작' })}
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => updateProcess(proc.id, 'time', undefined)}
                          className="text-info-600 hover:text-info-700 opacity-100 lg:opacity-0 lg:group-hover/time:opacity-100 ml-0.5 flex-shrink-0 print-hide"
                          title={t('advDashboard.deleteTime')}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateProcess(proc.id, 'time', 1)}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-60 hover:opacity-100 text-info-600 bg-info-50 px-1 py-0.5 rounded"
                        title={t('advDashboard.addTime')}
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    )}
                    {/* 온도: 값이 있을 때 뱃지 표시 + 삭제 버튼 */}
                    {proc.temp ? (
                      <div className="flex items-center gap-0.5 text-xs text-warning-600 bg-warning-50 px-1.5 py-0.5 rounded group/temp">
                        <ThermometerSun className="w-3 h-3 flex-shrink-0" />
                        <input
                          type="number"
                          value={proc.temp}
                          onChange={(e) => updateProcess(proc.id, 'temp', parseInt(e.target.value) || 0)}
                          className="w-8 bg-transparent border-0 p-0 text-center focus:outline-none tnum"
                        />
                        <span className="text-xs flex-shrink-0">{t('units.celsius')}</span>
                        <button
                          onClick={() => updateProcess(proc.id, 'temp', undefined)}
                          className="text-warning-600 hover:text-warning-700 opacity-100 lg:opacity-0 lg:group-hover/temp:opacity-100 ml-0.5 flex-shrink-0"
                          title={t('advDashboard.deleteTemp')}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateProcess(proc.id, 'temp', 27)}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-60 hover:opacity-100 text-warning-600 bg-warning-50 px-1 py-0.5 rounded"
                        title={t('advDashboard.addTemp')}
                      >
                        <ThermometerSun className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => removeProcess(proc.id)} className="p-2 text-ink-subtle hover:text-danger opacity-100 lg:opacity-0 lg:group-hover:opacity-100 print-hide" title={t('advDashboard.removeProcess', { defaultValue: '공정 삭제' })}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {/* 너비 조절 핸들 (데스크톱 전용 - 모바일 세로 1열에선 불필요) */}
                    <div
                      className="hidden lg:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-brand-400 transition-colors print-hide"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startWidth = itemSize.width || 120;

                        const handleMouseMove = (moveE: MouseEvent) => {
                          const delta = moveE.clientX - startX;
                          const newWidth = Math.max(80, Math.min(400, startWidth + delta));
                          setProcessItemSize(proc.id, { width: newWidth });
                        };

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                          document.body.style.cursor = '';
                          document.body.style.userSelect = '';
                        };

                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                        document.body.style.cursor = 'col-resize';
                        document.body.style.userSelect = 'none';
                      }}
                      title={t('advDashboard.resizeWidth')}
                    >
                      <GripVertical className="w-2 h-full text-line-strong group-hover:text-brand-400" />
                    </div>
                  </div>
                  );
                    })}
                  </React.Fragment>
                  );
                })}
              </div>
              {/* 메모 입력 */}
              <div className="mt-2 pt-2 border-t border-line">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-ink-subtle inline-flex items-center gap-1"><Pin size={12} />{t('advDashboard.memo')}</span>
                  {memo && <span className="text-xs text-ink-subtle">({t('advDashboard.memoCharCount', { count: memo.length })})</span>}
                </div>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={t('advDashboard.memoPlaceholder')}
                  className="w-full text-xs border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 입력 모달 */}
      <BulkIngredientInput
        isOpen={isBulkInputOpen}
        onClose={() => setIsBulkInputOpen(false)}
        onImport={handleBulkImport}
      />

      {/* 타이머 관리 모달 (C3: 고아 컴포넌트 배선) - 공정칩 시간에서 프리필 가능 */}
      <TimerManager
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        seed={timerSeed}
      />

      {/* H1: 전용 베이킹 모드 (전체화면 큰 글씨 단계뷰 + Wake Lock) */}
      <BakingMode
        isOpen={isBakingMode}
        onClose={() => setIsBakingMode(false)}
        steps={processes}
        recipeName={productName}
        translateStep={translateProcessStep}
        completed={completedProcesses}
        onToggleDone={toggleProcessDone}
      />


    </div>
  );
};

export default AdvancedDashboard;
