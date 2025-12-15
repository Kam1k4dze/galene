import React, { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  localInputAnalyser,
  localOutputAnalyser,
  localAudioCompressor,
} from "../../stores/state";

export function CompressorVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAnalyser = useStore(localInputAnalyser);
  const outputAnalyser = useStore(localOutputAnalyser);
  const compressor = useStore(localAudioCompressor);

  // Refs for smoothing values
  const valuesRef = useRef({
    input: -60,
    output: -60,
    gr: 0,
  });

  useEffect(() => {
    if (!canvasRef.current || !inputAnalyser || !outputAnalyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let animationId: number;
    const bufferLength = inputAnalyser.fftSize;
    const inputData = new Float32Array(bufferLength);
    const outputData = new Float32Array(bufferLength);

    const getDb = (data: Float32Array) => {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      const db = 20 * Math.log10(rms || 0.00001);
      return Math.max(-100, db);
    };

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      inputAnalyser.getFloatTimeDomainData(inputData);
      outputAnalyser.getFloatTimeDomainData(outputData);

      const targetInput = getDb(inputData);
      const targetOutput = getDb(outputData);
      const targetGr = compressor ? compressor.reduction : 0;

      // Smooth decay
      const decay = 1.5;
      valuesRef.current.input = Math.max(
        targetInput,
        valuesRef.current.input - decay
      );
      valuesRef.current.output = Math.max(
        targetOutput,
        valuesRef.current.output - decay
      );
      // GR is negative, so "decay" means going back to 0 (increasing)
      valuesRef.current.gr = Math.min(targetGr, valuesRef.current.gr + decay);

      const { input, output, gr } = valuesRef.current;

      // Clear
      ctx.fillStyle = "#18181b"; // zinc-900
      ctx.fillRect(0, 0, rect.width, rect.height);

      const meterHeight = 12;
      const labelWidth = 40;
      const valueWidth = 40;
      const barX = labelWidth;
      const barWidth = rect.width - labelWidth - valueWidth;

      // Helper to draw LED segments
      const drawLedBar = (y: number, db: number, isGr: boolean = false) => {
        const segments = 30;
        const segmentWidth = barWidth / segments;
        const segmentGap = 1;

        // Background
        ctx.fillStyle = "#27272a"; // zinc-800
        ctx.fillRect(barX, y, barWidth, meterHeight);

        for (let i = 0; i < segments; i++) {
          let active = false;
          let color = "#4ade80"; // green-400

          if (isGr) {
            // GR: 0 to -30dB. 0 is right (no reduction), -30 is left (max reduction)
            // Actually standard GR meters grow from right to left.
            // Let's map 0 -> right end, -30 -> left end.
            const dbVal = -30 + (i / segments) * 30; // -30 to 0
            if (db <= dbVal) active = true; // If current GR (-5) <= threshold (-2), active? No.
            // If GR is -5. We want to light up segments from 0 down to -5.
            // 0 is at index segments-1. -30 is at index 0.
            // Range of this segment:
            // If GR is -5, we want to light up segments where range is > -5?
            // Let's simplify: GR bar grows from Right (0dB) to Left (-30dB).
            // Segment i represents range [-30...0].
            // Let's say i=29 (rightmost). Represents -1dB to 0dB.
            // If GR is -5, we want to light up 0 to -5.
            const threshold = -(segments - 1 - i) * (30 / segments);
            if (db < threshold) active = true;

            color = "#f87171"; // red-400
          } else {
            // Level: -60 to 0.
            const threshold = -60 + (i / segments) * 60;
            if (db >= threshold) active = true;

            // Color gradient
            if (threshold > -6) color = "#f87171"; // red-400
            else if (threshold > -18) color = "#facc15"; // yellow-400
          }

          if (active) {
            ctx.fillStyle = color;
            ctx.fillRect(
              barX + i * segmentWidth,
              y,
              segmentWidth - segmentGap,
              meterHeight
            );
          }
        }
      };

      // Draw Input
      ctx.fillStyle = "#a1a1aa"; // zinc-400
      ctx.font = "10px monospace";
      ctx.fillText("IN", 0, 20);
      ctx.fillText(`${input.toFixed(0)}`, rect.width - 30, 20);
      drawLedBar(10, input);

      // Draw GR
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText("GR", 0, 40);
      ctx.fillText(`${gr.toFixed(1)}`, rect.width - 30, 40);
      drawLedBar(30, gr, true);

      // Draw Output
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText("OUT", 0, 60);
      ctx.fillText(`${output.toFixed(0)}`, rect.width - 30, 60);
      drawLedBar(50, output);

      // Draw Scale
      ctx.fillStyle = "#52525b"; // zinc-600
      const scaleY = 72;
      const steps = [-40, -20, -10, -6, -3, 0];
      steps.forEach((s) => {
        const x = barX + ((s + 60) / 60) * barWidth;
        ctx.fillText(`${s}`, x - 6, scaleY);
        ctx.fillRect(x, 10, 1, 52); // Grid line
      });
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [inputAnalyser, outputAnalyser, compressor]);

  if (!inputAnalyser)
    return (
      <div className="h-20 w-full bg-zinc-900 rounded flex items-center justify-center text-xs text-zinc-500">
        Visualizer inactive
      </div>
    );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20 rounded border border-zinc-700 bg-zinc-900"
    />
  );
}
