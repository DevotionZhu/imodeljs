/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module WidgetPanels */

import * as classnames from "classnames";
import * as React from "react";
import { CommonProps } from "@bentley/ui-core";
import { WidgetPanelSide } from "./Panel";
import "./GripOverlay.scss";

/** Properties of [[WidgetPanelsGripOverlay]] component.
 * @internal
 */
export interface WidgetPanelsGripOverlayProps extends CommonProps {
  side: WidgetPanelSide;
}

/** Resize grip of used in side panel component.
 * @internal
 */
export function WidgetPanelsGripOverlay(props: WidgetPanelsGripOverlayProps) {
  const className = classnames(
    "nz-widgetPanels-gripOverlay",
    `nz-${props.side}`,
    props.className,
  );
  return (
    <div
      className={className}
      style={props.style}
    />
  );
}