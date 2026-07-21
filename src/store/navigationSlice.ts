import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SheetType = 'profile' | 'settings' | 'support' | 'help' | 'demo' | 'subscription' | null;

interface NavigationState {
  // Sheet management
  activeSheet: SheetType;
  sheetVisible: boolean;
  sheetData?: Record<string, unknown>;

  // Help system
  helpWebViewUrl?: string;
  // Native-Modal sheets currently mounted that host the help Modal themselves
  // (a sibling Modal can't present above them on iOS); GlobalSheets yields
  // help presentation while this is non-zero.
  helpModalHostCount: number;

  // Header state
  headerTitle?: string;
  headerSubtitle?: string;
  showHeaderActions: boolean;
  showProfileIcon: boolean;

  // UI state
  isLoading: boolean;
  lastNavigatedTab?: string;
}

const initialState: NavigationState = {
  activeSheet: null,
  sheetVisible: false,
  sheetData: undefined,
  helpModalHostCount: 0,
  showHeaderActions: true,
  showProfileIcon: true,
  isLoading: false,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    // Sheet actions
    showSheet: (state, action: PayloadAction<{ sheet: SheetType; data?: Record<string, unknown> }>) => {
      state.activeSheet = action.payload.sheet;
      state.sheetVisible = true;
      state.sheetData = action.payload.data;
    },
    hideSheet: (state) => {
      state.sheetVisible = false;
      // Keep activeSheet for animation purposes
    },
    clearSheet: (state) => {
      state.activeSheet = null;
      state.sheetVisible = false;
      state.sheetData = undefined;
    },

    // Help system actions
    showHelpWebView: (state, action: PayloadAction<string>) => {
      state.helpWebViewUrl = action.payload;
    },
    hideHelpWebView: (state) => {
      state.helpWebViewUrl = undefined;
    },
    registerHelpModalHost: (state) => {
      state.helpModalHostCount += 1;
    },
    unregisterHelpModalHost: (state) => {
      state.helpModalHostCount = Math.max(0, state.helpModalHostCount - 1);
    },

    // Header actions
    setHeaderTitle: (state, action: PayloadAction<string | undefined>) => {
      state.headerTitle = action.payload;
    },
    setHeaderSubtitle: (state, action: PayloadAction<string | undefined>) => {
      state.headerSubtitle = action.payload;
    },
    setShowHeaderActions: (state, action: PayloadAction<boolean>) => {
      state.showHeaderActions = action.payload;
    },
    setShowProfileIcon: (state, action: PayloadAction<boolean>) => {
      state.showProfileIcon = action.payload;
    },
    
    // UI state
    setNavigationLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setLastNavigatedTab: (state, action: PayloadAction<string>) => {
      state.lastNavigatedTab = action.payload;
    },
    
    // Reset all navigation state
    resetNavigationState: () => initialState,
  },
});

export const {
  showSheet,
  hideSheet,
  clearSheet,
  showHelpWebView,
  hideHelpWebView,
  registerHelpModalHost,
  unregisterHelpModalHost,
  setHeaderTitle,
  setHeaderSubtitle,
  setShowHeaderActions,
  setShowProfileIcon,
  setNavigationLoading,
  setLastNavigatedTab,
  resetNavigationState,
} = navigationSlice.actions;

export default navigationSlice.reducer;
