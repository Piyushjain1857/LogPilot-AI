import React from "react";

export default function Badge({
  children,
  variant = "default",
  icon: Icon = null,
  className = "",
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}
