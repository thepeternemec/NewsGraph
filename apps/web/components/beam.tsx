"use client";

import { BorderBeam, type BorderBeamColorVariant } from "border-beam";
import type { ReactNode } from "react";

export interface BeamProps {
  children: ReactNode;
  /** md = full rotating border, sm = compact, line = bottom traveler, pulse-* = bloom */
  size?: "sm" | "md" | "line" | "pulse-inner" | "pulse-outside";
  /** Glow intensity 0–1 */
  strength?: number;
  /** Wrapper class. Defaults to the box-filling helper. */
  className?: string;
  colorVariant?: BorderBeamColorVariant;
}

/**
 * One consistent BorderBeam wrapper for every box in the app, so all panels
 * share the same mono beam, theme and box geometry.
 */
export default function Beam({
  children,
  size = "md",
  strength = 0.5,
  className = "beam-box",
  colorVariant = "mono",
}: BeamProps) {
  return (
    <BorderBeam
      size={size}
      colorVariant={colorVariant}
      theme="dark"
      strength={strength}
      className={className}
    >
      {children}
    </BorderBeam>
  );
}
