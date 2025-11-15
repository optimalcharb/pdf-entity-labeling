import { Action } from '@embedpdf/core';
import { HistoryState } from './types';

export const SET_HISTORY_STATE = 'HISTORY/SET_STATE';

export interface SetHistoryStateAction extends Action {
  type: typeof SET_HISTORY_STATE;
  payload: HistoryState;
}

export type HistoryAction = SetHistoryStateAction;

export const setHistoryState = (state: HistoryState): SetHistoryStateAction => ({
  type: SET_HISTORY_STATE,
  payload: state,
});
