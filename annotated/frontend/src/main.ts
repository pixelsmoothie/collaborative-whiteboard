// This is a .ts file, not .tsx -- there is no JSX syntax (no "<App />") anywhere below.
// Instead we call React.createElement() directly, which is EXACTLY what JSX compiles into
// under the hood. Writing it by hand here is purely for learning what's really happening
// when you normally see angle-bracket syntax in a .tsx file.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// React.createElement takes THREE kinds of arguments:
//   1. The type: a string like "div" for a plain HTML tag, OR a component function/class
//      like React.StrictMode or App.
//   2. The props: an object of props to pass, or `null` if there are none.
//   3. Any number of further arguments: the children to render inside it.
//
// So this call:
//   React.createElement(React.StrictMode, null, React.createElement(App, null))
//
// means: "create a <React.StrictMode> element with no props, whose one child is
// <App /> (also with no props)." That's the literal, no-JSX equivalent of writing:
//   <React.StrictMode><App /></React.StrictMode>
ReactDOM.createRoot(document.getElementById("root")!).render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
);
