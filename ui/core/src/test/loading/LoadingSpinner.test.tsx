/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { mount, shallow } from "enzyme";
import * as React from "react";
import { LoadingSpinner } from "../../ui-core";

describe("<LoadingSpinner />", () => {
  it("should render", () => {
    const wrapper = mount(
      <LoadingSpinner />,
    );
    wrapper.unmount();
  });

  it("renders correctly", () => {
    shallow(
      <LoadingSpinner />,
    ).should.matchSnapshot();
  });

  it("renders with message correctly", () => {
    shallow(<LoadingSpinner message="test" />).should.matchSnapshot();
  });

  it("renders with message and position correctly", () => {
    shallow(<LoadingSpinner message="test" messageOnTop={true} />).should.matchSnapshot();
  });

});
