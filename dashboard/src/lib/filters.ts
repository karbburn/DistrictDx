// Shared filter state + reducer for map and scatter pages.

import type { IndexType, TimeHorizon } from "./data";

export type FilterState = {
  indexType: IndexType;
  timeHorizon: TimeHorizon;
  stateFilter: string;
};

export type FilterAction =
  | { type: "SET_INDEX"; indexType: IndexType }
  | { type: "SET_TIME"; timeHorizon: TimeHorizon }
  | { type: "SET_STATE"; stateFilter: string };

export const INITIAL_FILTERS: FilterState = {
  indexType: "overall",
  timeHorizon: "current",
  stateFilter: "all",
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_INDEX":
      return { ...state, indexType: action.indexType };
    case "SET_TIME":
      return { ...state, timeHorizon: action.timeHorizon };
    case "SET_STATE":
      return { ...state, stateFilter: action.stateFilter };
  }
}
