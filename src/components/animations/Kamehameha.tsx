"use client";
import React from "react";
import clsx from "clsx";

export const Kamehameha: React.FC<{
  className?: string;
  charging?: boolean;
  auto?: boolean;          // if true: auto play loop (charge -> release -> reset)
  speedMs?: number;        // base speed multiplier
}> = ({ className, charging = false, auto = true, speedMs = 4000 }) => {
  return (
    <div
      className={clsx(
        "relative flex items-center justify-center",
        "kame-scene",
        auto && "kame-auto",
        charging && "kame-charge",
        className
      )}
      style={{ ["--kame-speed" as any]: `${speedMs}ms` }}
    >
      {/* Ground glow */}
      <div className="kame-ground" />
      {/* Character (silhouette) */}
      <div className="kame-char">
        <div className="kame-head" />
        <div className="kame-hair">
          <span /><span /><span /><span /><span />
        </div>
        <div className="kame-torso" />
        <div className="kame-arms">
          <div className="kame-arm left" />
          <div className="kame-arm right" />
        </div>
        <div className="kame-legs">
          <div className="kame-leg left" />
          <div className="kame-leg right" />
        </div>
        {/* Charging orb between hands */}
        <div className="kame-orb" />
        {/* Beam container */}
        <div className="kame-beam">
          <div className="core" />
          <div className="halo" />
          <div className="distortion" />
        </div>
        {/* Aura layers */}
        <div className="kame-aura layer1" />
        <div className="kame-aura layer2" />
        <div className="kame-aura layer3" />
      </div>
    </div>
  );
};