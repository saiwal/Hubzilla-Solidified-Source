import { A } from "@solidjs/router";
import type { Component } from "solid-js";

interface Props {
  href: string;
  label: string | (() => string);
}

const NavItem: Component<Props> = (props) => {
  const label = () =>
    typeof props.label === "function" ? props.label() : props.label;

  return (
    <A
      href={props.href}
      end={props.href === "/"}
      class="block px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      activeClass="bg-gray-200 dark:bg-gray-700"
    >
      {label()}
    </A>
  );
};

export default NavItem;
