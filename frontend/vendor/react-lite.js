(function (global) {
  const TEXT_ELEMENT = 'TEXT_NODE';
  const FRAGMENT = Symbol('fragment');

  const hookStore = new Map();
  let currentComponent = null;
  let hookIndex = 0;
  let pendingEffects = [];
  let rootContainer = null;
  let rootElement = null;
  let updateScheduled = false;

  function createTextElement(text) {
    return {
      type: TEXT_ELEMENT,
      props: { nodeValue: text == null ? '' : String(text) },
      children: []
    };
  }

  function normalizeChild(child) {
    if (child === null || child === false || child === true) {
      return null;
    }
    if (typeof child === 'object') {
      return child;
    }
    return createTextElement(child);
  }

  function createElement(type, props, ...children) {
    const normalizedChildren = children.flat().map(normalizeChild).filter(Boolean);
    const nextProps = props ? { ...props } : {};
    nextProps.children = normalizedChildren;
    return { type, props: nextProps, children: normalizedChildren };
  }

  function getHookEntry(key) {
    if (!hookStore.has(key)) {
      hookStore.set(key, { hooks: [], effects: [] });
    }
    return hookStore.get(key);
  }

  function scheduleUpdate() {
    if (!updateScheduled) {
      updateScheduled = true;
      Promise.resolve().then(() => {
        updateScheduled = false;
        if (rootContainer && rootElement) {
          commitRoot();
        }
      });
    }
  }

  function commitRoot() {
    hookIndex = 0;
    currentComponent = null;
    const dom = renderVNode(rootElement, ['root']);
    if (dom) {
      rootContainer.innerHTML = '';
      rootContainer.appendChild(dom);
    }
    const effects = pendingEffects;
    pendingEffects = [];
    effects.forEach((run) => run());
  }

  function renderVNode(vnode, path) {
    if (Array.isArray(vnode)) {
      const fragment = document.createDocumentFragment();
      vnode.forEach((child, index) => {
        const node = renderVNode(child, path.concat(index));
        if (node) fragment.appendChild(node);
      });
      return fragment;
    }

    if (!vnode) {
      return null;
    }

    if (typeof vnode.type === 'function') {
      const componentKey = `${path.join('.')}:${vnode.type.name || 'Component'}`;
      const entry = getHookEntry(componentKey);
      const prevComponent = currentComponent;
      currentComponent = { key: componentKey, entry };
      hookIndex = 0;
      const rendered = vnode.type({ ...(vnode.props || {}), children: vnode.props?.children || [] });
      const dom = renderVNode(rendered, path.concat('child'));
      currentComponent = prevComponent;
      return dom;
    }

    if (vnode.type === FRAGMENT) {
      const fragment = document.createDocumentFragment();
      vnode.children.forEach((child, index) => {
        const node = renderVNode(child, path.concat(index));
        if (node) fragment.appendChild(node);
      });
      return fragment;
    }

    if (vnode.type === TEXT_ELEMENT) {
      return document.createTextNode(vnode.props?.nodeValue ?? '');
    }

    const dom = document.createElement(vnode.type);
    applyProps(dom, vnode.props || {});
    (vnode.children || []).forEach((child, index) => {
      const childNode = renderVNode(child, path.concat(index));
      if (childNode) dom.appendChild(childNode);
    });
    return dom;
  }

  function applyProps(dom, props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === 'ref') return;
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        dom.addEventListener(eventName, value);
        return;
      }
      if (key === 'className') {
        dom.setAttribute('class', value);
        return;
      }
      if (key === 'style' && value && typeof value === 'object') {
        Object.assign(dom.style, value);
        return;
      }
      if (key === 'value' || key === 'checked' || key === 'disabled') {
        dom[key] = value;
        return;
      }
      if (value === false || value === null || value === undefined) {
        return;
      }
      dom.setAttribute(key, value);
    });
  }

  function ensureComponent() {
    if (!currentComponent) {
      throw new Error('Hooks can only be used inside components.');
    }
    return currentComponent.entry;
  }

  function useState(initialValue) {
    const entry = ensureComponent();
    const index = hookIndex++;
    if (!Object.prototype.hasOwnProperty.call(entry.hooks, index)) {
      entry.hooks[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
    }
    const setState = (value) => {
      const next = typeof value === 'function' ? value(entry.hooks[index]) : value;
      if (!Object.is(entry.hooks[index], next)) {
        entry.hooks[index] = next;
        scheduleUpdate();
      }
    };
    return [entry.hooks[index], setState];
  }

  function useMemo(factory, deps) {
    const entry = ensureComponent();
    const index = hookIndex++;
    const record = entry.hooks[index] || { deps: undefined, value: undefined };
    const changed = !record.deps || !deps || deps.some((dep, i) => !Object.is(dep, record.deps[i]));
    if (changed) {
      record.value = factory();
      record.deps = deps ? [...deps] : deps;
    }
    entry.hooks[index] = record;
    return record.value;
  }

  function useCallback(callback, deps) {
    return useMemo(() => callback, deps);
  }

  function useEffect(callback, deps) {
    const entry = ensureComponent();
    const index = hookIndex++;
    const record = entry.hooks[index] || { deps: undefined, cleanup: undefined };
    const changed = !record.deps || !deps || deps.some((dep, i) => !Object.is(dep, record.deps[i]));
    record.deps = deps ? [...deps] : deps;
    entry.hooks[index] = record;

    if (changed) {
      pendingEffects.push(() => {
        if (typeof record.cleanup === 'function') {
          try {
            record.cleanup();
          } catch (cleanupError) {
            loggerWarn('Effect cleanup failed', cleanupError);
          }
        }
        const cleanup = callback();
        record.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
      });
    }
  }

  function loggerWarn(message, error) {
    if (global.console && typeof global.console.warn === 'function') {
      global.console.warn(`[react-lite] ${message}`, error);
    }
  }

  function createRoot(container) {
    rootContainer = container;
    return {
      render(element) {
        rootElement = element;
        commitRoot();
      }
    };
  }

  const React = {
    createElement,
    Fragment: FRAGMENT,
    useState,
    useEffect,
    useMemo,
    useCallback
  };

  const ReactDOM = {
    createRoot
  };

  global.React = React;
  global.ReactDOM = ReactDOM;
})(typeof window !== 'undefined' ? window : globalThis);
