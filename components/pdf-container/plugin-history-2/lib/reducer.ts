import { Reducer } from '@embedpdf/core';
import { HistoryAction, SET_HISTORY_STATE } from './actions';
import { HistoryState } from './types';

export const initialState: HistoryState = {
  global: {
    canUndo: false,
    canRedo: false,
  },
  topics: {},
};

export const reducer: Reducer<HistoryState, HistoryAction> = (state = initialState, action) => {
  switch (action.type) {
    case SET_HISTORY_STATE:
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};
