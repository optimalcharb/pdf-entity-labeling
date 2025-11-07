import { Reducer } from './types';
import { CoreState } from './initial-state';
import {
  CoreAction,
  LOAD_DOCUMENT,
  REFRESH_DOCUMENT,
  SET_DOCUMENT,
  SET_DOCUMENT_ERROR,
  SET_PAGES,
  SET_ROTATION,
  SET_SCALE,
} from './actions';

export const coreReducer: Reducer<CoreState, CoreAction> = (state, action): CoreState => {
  switch (action.type) {
    case LOAD_DOCUMENT:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case SET_DOCUMENT:
      return {
        ...state,
        document: action.payload,
        pages: action.payload.pages.map((page) => [page]),
        loading: false,
        error: null,
      };

    case REFRESH_DOCUMENT:
      return {
        ...state,
        document: action.payload,
        pages: action.payload.pages.map((page) => [page]),
        loading: false,
        error: null,
      };

    case SET_ROTATION:
      return {
        ...state,
        rotation: action.payload,
      };

    case SET_PAGES:
      return {
        ...state,
        pages: action.payload,
      };

    case SET_DOCUMENT_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case SET_SCALE:
      return {
        ...state,
        scale: action.payload,
      };

    default:
      return state;
  }
};
