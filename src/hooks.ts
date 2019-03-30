import { Component } from "./component";
import { Context, createConsumerLoadedEvent } from "./context";

type Option<T> = T | undefined;

type Callback<Arg = void, Return = void> = (arg: Arg) => Return;

export type Hook =
  | AttributeHook
  | PropertyHook<any>
  | QueryHook<Element | Element[] | null>
  | StateHook<any>
  | ReducerHook<any, any>
  | ContextHook
  | EffectHook
  | MemoHook<any>;

export interface AttributeHook {
  value?: string;
  cleanup?: () => void;
}

export interface PropertyHook<T> {
  value?: T;
}

export interface QueryHook<T> {
  value?: {
    readonly current: T;
  };
}

type SetState<T> = (value: T | Callback<T, T>) => void;

export interface StateHook<T> {
  value?: T;
  setter?: SetState<T>;
}

export interface ReducerHook<S, A> {
  state?: S;
  dispatch?: (action: A) => void;
}

export interface ContextHook {
  called?: boolean;
}

export interface EffectHook {
  handler?: () => Callback | void;
  fields?: any[];
  cleanup?: Callback;
}

export interface MemoHook<T> {
  value?: T;
  fields?: any[];
}

let currentCursor: number;
let currentElement: Component;

export function setCurrent(el: Component, cursor: number) {
  currentElement = el;
  currentCursor = cursor;
}

function getHook() {
  while (currentElement.hooks.length <= currentCursor) {
    currentElement.hooks.push({});
  }
  return currentElement.hooks[currentCursor++];
}

const fieldsChanged = (prev: any[] | undefined, next: any[]) =>
  prev == null || next.some((f, i) => f !== prev[i]);

export const useAttribute = (name: string) => {
  const hook = getHook() as AttributeHook;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = el.getAttribute(name) || "";
    const m = new MutationObserver(m => {
      console.log(m);
      hook.value = el.getAttribute(name) || "";
      el.update();
    });
    m.observe(el, { attributes: true, attributeFilter: [name] });
    hook.cleanup = () => m.disconnect();
  }
  return hook.value;
};

export const useProperty = <T>(name: string) => {
  const hook = getHook() as PropertyHook<T>;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = (el as any)[name];
    Object.defineProperty(el, name, {
      get() {
        return hook.value;
      },
      set(newValue) {
        hook.value = newValue;
        el.update();
      }
    });
  }
  return hook.value;
};

const query = <T = Element | Element[] | null>(fn: Callback<Component, T>) => {
  const hook = getHook() as QueryHook<T>;
  const el = currentElement;
  if (hook.value == null) {
    hook.value = {
      get current() {
        return fn(el);
      }
    };
  }
  return hook.value;
};

export const useQuery = (selector: string) =>
  query(el => el.querySelector(selector));

export const useQueryAll = (selector: string) =>
  query(el => el.querySelectorAll(selector));

export const useState = <T>(initValue: T): [T, SetState<T>] => {
  const hook = getHook() as StateHook<T>;
  const el = currentElement;
  if (hook.value == null || hook.setter == null) {
    hook.value = initValue;
    hook.setter = function(newValue) {
      if (typeof newValue === "function") {
        newValue = (newValue as Callback<Option<T>, T>)(hook.value);
      }
      hook.value = newValue;
      el.update();
    };
  }
  return [hook.value, hook.setter];
};

const initAction = { type: "__@@init__" };

export const useReducer = <S, A>(
  reducer: (state: Option<S>, action: A | typeof initAction) => S,
  initialState: S
): [S, (action: A) => void] => {
  const hook = getHook() as ReducerHook<S, A>;
  const el = currentElement;
  if (hook.state == null || hook.dispatch == null) {
    hook.state = reducer(initialState, initAction);
    hook.dispatch = (action: A) => {
      hook.state = reducer(hook.state, action);
      el.update();
    };
  }
  return [hook.state, hook.dispatch];
};

export const useContext = <T>(context: Context<T>) => {
  const hook = getHook() as ContextHook;
  const el = currentElement;
  if (!hook.called) {
    hook.called = true;
    el.dispatchEvent(createConsumerLoadedEvent(context, el));
  }
  return context.value;
};

export const useEffect = (
  handler: () => Callback | void,
  fields: any[] = []
) => {
  const hook = getHook() as EffectHook;
  const el = currentElement;
  if (fieldsChanged(hook.fields, fields)) {
    hook.fields = fields;
    hook.handler = handler;
    el.effects.push(hook);
  }
};

export const useMemo = <T>(fn: Callback<void, T>, fields: any[] = []) => {
  const hook = getHook() as MemoHook<T>;
  if (fieldsChanged(hook.fields, fields)) {
    hook.fields = fields;
    hook.value = fn();
  }
  return hook.value;
};

export const useCallback = <A, R>(
  callback: Callback<A, R>,
  fields: any[] = []
) => useMemo(() => callback, fields);
