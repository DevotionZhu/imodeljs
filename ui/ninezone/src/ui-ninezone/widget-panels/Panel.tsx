/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WidgetPanels
 */

import "./Panel.scss";
import classnames from "classnames";
import * as React from "react";
import { DraggedPanelSideContext } from "../base/DragManager";
import { NineZoneDispatchContext, WidgetsStateContext } from "../base/NineZone";
import { isHorizontalPanelState, PanelState, WidgetState } from "../base/NineZoneState";
import { PanelWidget, PanelWidgetProps } from "../widget/PanelWidget";
import { WidgetTarget } from "../widget/WidgetTarget";
import { WidgetPanelGrip } from "./Grip";
import { PanelTarget } from "./PanelTarget";
import { RectangleProps, SizeProps } from "@bentley/ui-core";
import { assert } from "../base/assert";
import { WidgetComponent } from "../widget/Widget";
import produce from "immer";

/** @internal */
export type TopPanelSide = "top";

/** @internal */
export type BottomPanelSide = "bottom";

/** @internal */
export type LeftPanelSide = "left";

/** @internal */
export type RightPanelSide = "right";

/** @internal */
export type HorizontalPanelSide = TopPanelSide | BottomPanelSide;

/** @internal */
export type VerticalPanelSide = LeftPanelSide | RightPanelSide;

/** @internal future */
export type PanelSide = VerticalPanelSide | HorizontalPanelSide;

/** Properties of [[WidgetPanel]] component.
 * @internal
 */
export interface WidgetPanelProps {
  panel: PanelState;
  spanBottom?: boolean;
  spanTop?: boolean;
}

/** Widget panel component is a side panel with multiple widgets.
 * @internal
 */
export const WidgetPanel = React.memo<WidgetPanelProps>(function WidgetPanel(props) { // eslint-disable-line @typescript-eslint/naming-convention, no-shadow
  return (
    <PanelStateContext.Provider value={props.panel}>
      <PanelSideContext.Provider value={props.panel.side}>
        <WidgetPanelComponent
          spanTop={props.spanTop}
          spanBottom={props.spanBottom}
        />
      </PanelSideContext.Provider>
    </PanelStateContext.Provider>
  );
});

/** @internal */
export interface WidgetPanelComponentProps {
  spanBottom?: boolean;
  spanTop?: boolean;
}

/** @internal */
export const WidgetPanelComponent = React.memo<WidgetPanelComponentProps>(function WidgetPanelComponent({
  spanBottom,
  spanTop,
}) { // eslint-disable-line @typescript-eslint/naming-convention, no-shadow
  const panel = React.useContext(PanelStateContext);
  assert(panel);
  const { handleBeforeTransition, handlePrepareTransition, handleTransitionEnd, getRef, sizes, ...animatePanelWidgets } = useAnimatePanelWidgets();
  const draggedPanelSide = React.useContext(DraggedPanelSideContext);
  const dispatch = React.useContext(NineZoneDispatchContext);
  const captured = draggedPanelSide === panel.side;
  const horizontalPanel = isHorizontalPanelState(panel) ? panel : undefined;
  const [transition, setTransition] = React.useState<"prepared" | "transitioning">();
  const [size, setSize] = React.useState<number | undefined>(panel.size);
  const firstLayoutEffect = React.useRef(true);
  const style = React.useMemo(() => {
    if (size === undefined)
      return undefined;
    const s: React.CSSProperties = {};
    if (isHorizontalPanelSide(panel.side)) {
      s.height = `${size}px`;
    } else {
      s.width = `${size}px`;
    }
    return s;
  }, [size, panel.side]);
  const contentStyle = React.useMemo(() => {
    if (size === undefined)
      return undefined;
    const s: React.CSSProperties = {};
    if (isHorizontalPanelSide(panel.side)) {
      s.height = `${panel.size}px`;
    } else {
      s.width = `${panel.size}px`;
    }
    return s;
  }, [panel.size, panel.side, size]);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (panel.size !== undefined)
      return;
    const bounds = ref.current?.getBoundingClientRect();
    const newSize = isHorizontalPanelSide(panel.side) ? bounds?.height : bounds?.width;
    newSize && dispatch({
      type: "PANEL_INITIALIZE",
      side: panel.side,
      size: newSize,
    });
  });
  React.useLayoutEffect(() => {
    const newSize = panel.collapsed ? 0 : panel.size;
    setTransition(undefined);
    setSize(newSize);
  }, [panel.collapsed, panel.size]);
  React.useLayoutEffect(() => {
    if (firstLayoutEffect.current)
      return;
    setTransition("prepared");
  }, [panel.collapsed, panel.side]);
  React.useLayoutEffect(() => {
    const transitionTo = panel.collapsed ? 0 : panel.size;
    if (transition === "prepared") {
      setTransition("transitioning");
      setSize(transitionTo);
      return;
    }
  }, [transition, panel.side, panel.size, panel.collapsed]);
  React.useEffect(() => {
    firstLayoutEffect.current = false;
  }, []);
  const getBounds = React.useCallback(() => {
    assert(ref.current);
    return ref.current.getBoundingClientRect();
  }, []);
  const widgetPanel = React.useMemo<WidgetPanelContextArgs>(() => {
    return {
      getBounds,
    };
  }, [getBounds]);
  if (panel.widgets.length === 0)
    return (
      <PanelTarget />
    );
  const showTargets = panel.widgets.length < panel.maxWidgetCount;
  const className = classnames(
    "nz-widgetPanels-panel",
    `nz-${panel.side}`,
    panel.pinned && "nz-pinned",
    horizontalPanel && "nz-horizontal",
    panel.collapsed && "nz-collapsed",
    captured && "nz-captured",
    horizontalPanel?.span && "nz-span",
    !horizontalPanel && spanTop && "nz-span-top",
    !horizontalPanel && spanBottom && "nz-span-bottom",
    !!transition && "nz-transition",
  );
  return (
    <WidgetPanelContext.Provider value={widgetPanel}>
      <div
        className={className}
        ref={ref}
        style={style}
        onTransitionEnd={() => {
          setTransition(undefined);
        }}
      >
        <div
          className="nz-content"
          style={contentStyle}
        >
          {panel.widgets.map((widgetId, index, array) => {
            const last = index === array.length - 1;
            return (
              <React.Fragment key={widgetId}>
                {index === 0 && showTargets && <WidgetTarget
                  position="first"
                  widgetIndex={0}
                />}
                <PanelWidget
                  onBeforeTransition={handleBeforeTransition}
                  onPrepareTransition={handlePrepareTransition}
                  onTransitionEnd={handleTransitionEnd}
                  size={sizes[widgetId]}
                  transition={animatePanelWidgets.transition}
                  widgetId={widgetId}
                  ref={getRef(widgetId)}
                />
                {showTargets && <WidgetTarget
                  position={last ? "last" : undefined}
                  widgetIndex={index + 1}
                />}
              </React.Fragment>
            );
          })}
        </div>
        {panel.resizable &&
          <div className="nz-grip-container">
            <WidgetPanelGrip className="nz-grip" />
          </div>
        }
      </div>
    </WidgetPanelContext.Provider>
  );
});

/** @internal */
export const PanelSideContext = React.createContext<PanelSide | undefined>(undefined); // eslint-disable-line @typescript-eslint/naming-convention
PanelSideContext.displayName = "nz:PanelSideContext";

/** @internal */
export const PanelStateContext = React.createContext<PanelState | undefined>(undefined); // eslint-disable-line @typescript-eslint/naming-convention
PanelStateContext.displayName = "nz:PanelStateContext";

/** @internal */
export interface WidgetPanelContextArgs {
  getBounds(): RectangleProps;
}

/** @internal */
export const WidgetPanelContext = React.createContext<WidgetPanelContextArgs | undefined>(undefined);
WidgetPanelContext.displayName = "nz:WidgetPanelContext";

/** @internal */
export const isHorizontalPanelSide = (side: PanelSide): side is HorizontalPanelSide => {
  return side === "top" || side === "bottom";
};

/** @internal */
export const panelSides: [LeftPanelSide, RightPanelSide, TopPanelSide, BottomPanelSide] = [
  "left",
  "right",
  "top",
  "bottom",
];

/** @internal */
export function useAnimatePanelWidgets(): {
  handleBeforeTransition: PanelWidgetProps["onBeforeTransition"];
  handlePrepareTransition: PanelWidgetProps["onPrepareTransition"];
  handleTransitionEnd: PanelWidgetProps["onTransitionEnd"];
  getRef(widgetId: WidgetState["id"]): React.Ref<WidgetComponent>;
  transition: PanelWidgetProps["transition"];
  sizes: { [id: string]: PanelWidgetProps["size"] };
} {
  const panel = React.useContext(PanelStateContext);
  const widgets = React.useContext(WidgetsStateContext);
  assert(panel);
  const [prepareTransition, setPrepareTransition] = React.useState(false);
  const [transition, setTransition] = React.useState<PanelWidgetProps["transition"] | undefined>();
  const [prevPanelWidgets, setPrevPanelWidgets] = React.useState(panel.widgets);
  const [prevWidgets, setPrevWidgets] = React.useState(widgets);
  const [sizes, setSizes] = React.useState<{ [id: string]: number | undefined }>({});
  const refs = React.useRef(new Map<WidgetState["id"], React.RefObject<WidgetComponent>>());
  const widgetTransitions = React.useRef(new Map<WidgetState["id"], {
    from: number;
    to: number | undefined;
  }>());
  const measured = React.useRef(false);
  const horizontal = React.useRef(false);
  horizontal.current = isHorizontalPanelSide(panel.side);
  if (prevPanelWidgets !== panel.widgets) {
    const widgetsToMeasure = panel.widgets.length > prevPanelWidgets.length ? panel.widgets : prevPanelWidgets;
    for (const widgetId of widgetsToMeasure) {
      const ref = refs.current.get(widgetId);

      if (!ref || !ref.current) {
        widgetTransitions.current.set(widgetId, { from: 0, to: undefined });
        continue;
      }
      const size = ref.current.measure();
      widgetTransitions.current.set(widgetId, { from: getSize(horizontal.current, size), to: undefined });
    }
    if (panel.widgets.length < prevPanelWidgets.length) {
      // Widget removed.
      let removedWidgetIndex = 0;
      for (let i = 0; i < prevPanelWidgets.length; i++) {
        const newWidget = panel.widgets[i];
        const lastWidget = prevPanelWidgets[i];
        if (newWidget !== lastWidget) {
          removedWidgetIndex = i;
          break;
        }
      }

      const removedWidget = prevPanelWidgets[removedWidgetIndex];
      let fillWidget: string | undefined;
      if (removedWidgetIndex === 0) {
        for (let i = removedWidgetIndex + 1; i < prevPanelWidgets.length; i++) {
          const widgetId = prevPanelWidgets[i];
          const widget = prevWidgets[widgetId];
          if (widget.minimized)
            continue;
          fillWidget = widgetId;
          break;
        }
      } else {
        for (let i = removedWidgetIndex - 1; i >= 0; i--) {
          const widgetId = prevPanelWidgets[i];
          const widget = prevWidgets[widgetId];
          if (widget.minimized)
            continue;
          fillWidget = widgetId;
          break;
        }
      }

      if (fillWidget) {
        const removedWidgetTransition = widgetTransitions.current.get(removedWidget);
        const fillWidgetTransition = widgetTransitions.current.get(fillWidget);
        assert(removedWidgetTransition);
        assert(fillWidgetTransition);
        const removedWidgetSize = removedWidgetTransition.from;
        const fillWidgetSize = fillWidgetTransition.from;

        widgetTransitions.current.delete(removedWidget);
        fillWidgetTransition.from = removedWidgetSize + fillWidgetSize;
      }
    }
    measured.current = true;
    setPrepareTransition(true);
    // Reset before measuring in case we were already in a transition.
    setTransition(undefined);
    setSizes({});
    setPrevPanelWidgets(panel.widgets);
  }
  React.useEffect(() => {
    setPrevWidgets(widgets);
  }, [widgets]);
  React.useEffect(() => {
    measured.current = false;
  });
  const handleTransitionEnd = React.useCallback(() => {
    widgetTransitions.current.clear();
    setSizes({});
    setTransition(undefined);
  }, []);
  React.useLayoutEffect(() => {
    if (!prepareTransition)
      return;
    let initTransition = false;
    for (const [widgetId, widgetTransition] of widgetTransitions.current) {
      const ref = refs.current.get(widgetId);
      if (!ref || !ref.current) {
        initTransition = false;
        widgetTransitions.current.clear();
        break;
      }
      const size = ref.current.measure();
      widgetTransition.to = getSize(horizontal.current, size);

      if (widgetTransition.from !== widgetTransition.to) {
        initTransition = true;
      }
    }
    setPrepareTransition(false);
    if (initTransition) {
      // Transition needs to be started.
      setSizes((prev) => produce(prev, (draft) => {
        for (const [widgetId, widgetTransition] of widgetTransitions.current) {
          draft[widgetId] = widgetTransition.from;
        }
      }));
      setTransition("init");
    }
  }, [prepareTransition]);
  React.useEffect(() => {
    if (transition !== "init")
      return;
    const handle = window.requestAnimationFrame(() => {
      setSizes((prev) => produce(prev, (draft) => {
        for (const [widgetId, widgetTransition] of widgetTransitions.current) {
          draft[widgetId] = widgetTransition.to;
        }
      }));
      setTransition("transition");
    });
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [transition]);
  const getRef = React.useCallback((widgetId: WidgetState["id"]) => {
    let ref = refs.current.get(widgetId);
    if (!ref) {
      ref = React.createRef();
      refs.current.set(widgetId, ref);
    }
    return ref;
  }, []);
  React.useEffect(() => {
    // Clean-up ref objects.
    const newRefs: typeof refs.current = new Map();
    for (const widgetId of panel.widgets) {
      const ref = refs.current.get(widgetId);
      if (ref)
        newRefs.set(widgetId, ref);
    }
    refs.current = newRefs;
  }, [panel.widgets]);
  const handleBeforeTransition = React.useCallback(() => {
    // PanelWidget reports mode changes on same render pass, but we want to keep our initial measurements if panel.widgets have changed.
    if (measured.current)
      return;
    for (const wId of panel.widgets) {
      const ref = refs.current.get(wId);
      if (!ref || !ref.current) {
        widgetTransitions.current.clear();
        return;
      }
      const size = ref.current.measure();
      const from = getSize(horizontal.current, size);
      widgetTransitions.current.set(wId, { from, to: undefined });
    }
  }, [panel.widgets]);
  const handlePrepareTransition = React.useCallback(() => {
    if (widgetTransitions.current.size === 0)
      return;
    setPrepareTransition(true);
    // Reset before measuring in case we were already in a transition.
    setTransition(undefined);
    setSizes({});
  }, []);
  return {
    handleBeforeTransition,
    handlePrepareTransition,
    handleTransitionEnd,
    getRef,
    transition,
    sizes,
  };
}

function getSize(horizontal: boolean, size: SizeProps) {
  return horizontal ? size.width : size.height;
}
