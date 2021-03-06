/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Table
 */

import classnames from "classnames";
import * as React from "react";
import * as RDG from "react-data-grid";
import { DndComponentClass } from "react-dnd";
import { CommonProps } from "@bentley/ui-core";
import { DragSourceArguments, DropTargetArguments } from "../../dragdrop/DragDropDef";
import { withDragSource, WithDragSourceProps } from "../../dragdrop/withDragSource";
import { withDropTarget, WithDropTargetProps } from "../../dragdrop/withDropTarget";
import { ColumnDragLayer } from "./ColumnDragLayer";

// eslint-disable-next-line @typescript-eslint/naming-convention
const HeaderCell = (RDG && (RDG as any).HeaderCell); // react-data-grid @types does not support the HeaderCell export, but it is exported in the js-only library.

/** @internal */
export interface DragDropHeaderCellProps extends CommonProps {
  onHeaderDrop?: (source: string, target: string) => void; // inherited by parent
  column: any; // inherited by parent
}

interface HeaderWrapperProps extends CommonProps {
  item?: DropTargetArguments;
  type?: string;
  isDragging?: boolean;
  isOver?: boolean;
  canDrag?: boolean;
  canDrop?: boolean;
}

class HeaderWrapper extends React.Component<HeaderWrapperProps> {
  public render(): React.ReactNode {
    const { type, item, isOver, isDragging, canDrag, canDrop, ...props } = this.props as HeaderWrapperProps; // eslint-disable-line @typescript-eslint/no-unused-vars

    let mode = 0;
    if (item && item.clientOffset && item.initialClientOffset) {
      if (item.clientOffset.x > item.initialClientOffset.x)
        mode = 1;
      else
        mode = -1;
    }

    const classes = classnames(
      "components-table-header-drag-drop",
      {
        left: canDrop && !isDragging && isOver && mode === -1,
        right: canDrop && !isDragging && isOver && mode === 1,
        dragging: isDragging,
      },
      this.props.className,
    );
    return (
      <div className={classes} style={this.props.style}>
        <HeaderCell {...props} />
      </div>
    );
  }
}

/** @internal */
export const DragDropHeaderWrapper: DndComponentClass<HeaderWrapperProps & WithDropTargetProps<any> & WithDragSourceProps<any>> = withDragSource(withDropTarget(HeaderWrapper)); // eslint-disable-line @typescript-eslint/naming-convention

// Used only internally in ./Table.tsx
/** @internal */
export class DragDropHeaderCell extends React.Component<DragDropHeaderCellProps> {
  public render(): React.ReactNode {
    const { column } = this.props;
    const dropTargetProps = {
      onDropTargetDrop: (args: DropTargetArguments): DropTargetArguments => {
        const sourceKey = args.dataObject.key || "";
        const sourceXpos = args.dataObject.xpos || 0;
        const targetKey = (column && column.key) || "";
        const targetXpos = (column && column.left) || 0;
        args.dataObject = { sourceKey, targetKey, sourceXpos, targetXpos };
        return args;
      },
      objectTypes: ["Column"],
    };
    const dragSourceProps = {
      onDragSourceBegin: (args: DragSourceArguments) => {
        args.dataObject = {
          key: (column && column.key) || "",
          xpos: (column && column.left) || "",
          column,
        };
        return args;
      },
      onDragSourceEnd: (args: DragSourceArguments) => {
        const { sourceKey, targetKey } = args.dataObject;
        this.props.onHeaderDrop && this.props.onHeaderDrop(sourceKey, targetKey);
      },
      objectType: () => {
        return "Column";
      },
      defaultDragLayer: ColumnDragLayer,
    };
    return (
      <DragDropHeaderWrapper
        {...this.props}
        dragProps={dragSourceProps}
        dropProps={dropTargetProps}
        shallow={false}
      />
    );
  }
}
