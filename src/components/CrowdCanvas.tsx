"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef, useState } from "react";

interface CrowdCanvasProps {
  src: string;
  rows?: number;
  cols?: number;
}

// Minimalist vector character drawing function
const drawPeepCharacter = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  type: number,
  walkX: number,
  isDark: boolean
) => {
  ctx.save();
  
  // Set theme stroke color: terracotta in light mode, salmon rose in dark mode
  ctx.strokeStyle = isDark ? "#e58e8a" : "#c96f53";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const cx = w / 2;
  const headRadius = h * 0.085;
  const headY = headRadius + 14;
  
  // Calculate leg swing cycle
  const swing = Math.sin(walkX * 0.05);
  const hipY = h * 0.63;
  const groundY = h - 2;
  
  const legX1 = cx - 4 + 11 * swing;
  const legX2 = cx + 4 - 11 * swing;
  
  // 1. Draw Legs
  ctx.beginPath();
  ctx.moveTo(cx - 2.5, hipY);
  ctx.lineTo(legX1, groundY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 2.5, hipY);
  ctx.lineTo(legX2, groundY);
  ctx.stroke();

  // 2. Draw Torso / Clothing based on type
  const neckY = headY + headRadius;
  const shoulderY = neckY + 4;
  
  ctx.beginPath();
  if (type % 4 === 0) {
    // Trench Coat (Trapezoid silhouette)
    ctx.moveTo(cx - 9, shoulderY);
    ctx.lineTo(cx + 9, shoulderY);
    ctx.lineTo(cx + 12, hipY);
    ctx.lineTo(cx - 12, hipY);
    ctx.closePath();
    ctx.fillStyle = isDark ? "#1b110e" : "#f7f1ed";
    ctx.fill();
    ctx.stroke();
  } else if (type % 4 === 1) {
    // Cozy Sweater
    ctx.moveTo(cx - 10, shoulderY);
    ctx.lineTo(cx + 10, shoulderY);
    ctx.lineTo(cx + 9, hipY);
    ctx.lineTo(cx - 9, hipY);
    ctx.closePath();
    ctx.fillStyle = isDark ? "#2c1b18" : "#f3ded7";
    ctx.fill();
    ctx.stroke();
  } else {
    // Standard torso
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();
  }

  // 3. Draw Head (fill it with background color to cover lines behind)
  ctx.beginPath();
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "#0d0806" : "#fdfcfb";
  ctx.fill();
  ctx.stroke();

  // Glasses (type 2 or 6)
  if (type % 5 === 2) {
    ctx.beginPath();
    ctx.arc(cx - 3, headY - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 3, headY - 1, 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5.5, headY - 1);
    ctx.lineTo(cx + 5.5, headY - 1);
    ctx.stroke();
  }

  // Hats & Hair Accessories
  if (type % 6 === 0) {
    // Wide Brim Hat
    ctx.beginPath();
    ctx.moveTo(cx - headRadius * 1.5, headY - headRadius * 0.7);
    ctx.lineTo(cx + headRadius * 1.5, headY - headRadius * 0.7);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.rect(cx - headRadius * 0.8, headY - headRadius * 1.4, headRadius * 1.6, headRadius * 0.7);
    ctx.fillStyle = isDark ? "#e58e8a" : "#c96f53";
    ctx.fill();
    ctx.stroke();
  } else if (type % 6 === 1) {
    // Beanie
    ctx.beginPath();
    ctx.arc(cx, headY - 2, headRadius * 0.85, Math.PI, Math.PI * 2);
    ctx.stroke();
    // Beanie pompom
    ctx.beginPath();
    ctx.arc(cx, headY - headRadius - 3, 2.5, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type % 6 === 3) {
    // Long hair outline
    ctx.beginPath();
    ctx.moveTo(cx - headRadius, headY);
    ctx.quadraticCurveTo(cx - headRadius - 5, headY + 10, cx - headRadius - 1, headY + 20);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cx + headRadius, headY);
    ctx.quadraticCurveTo(cx + headRadius + 5, headY + 10, cx + headRadius + 1, headY + 20);
    ctx.stroke();
  }

  // 4. Draw Arms
  const armSwing = Math.sin(walkX * 0.05 + Math.PI); // offset arm swing from leg swing
  ctx.beginPath();
  if (type % 4 === 0) {
    // Carrying a briefcase
    ctx.moveTo(cx - 8, shoulderY);
    ctx.lineTo(cx - 11 + 4 * armSwing, shoulderY + h * 0.2);
    ctx.stroke();
    
    // Briefcase box
    const bcX = cx - 11 + 4 * armSwing;
    const bcY = shoulderY + h * 0.2;
    ctx.beginPath();
    ctx.rect(bcX - 5, bcY + 2, 10, 7);
    ctx.fillStyle = isDark ? "#a86c95" : "#5fa6a0";
    ctx.fill();
    ctx.stroke();
    
    ctx.moveTo(cx + 8, shoulderY);
    ctx.lineTo(cx + 9 - 4 * armSwing, shoulderY + h * 0.24);
    ctx.stroke();
  } else if (type % 4 === 3) {
    // Scholar holding a folder
    ctx.moveTo(cx - 8, shoulderY);
    ctx.lineTo(cx - 2, shoulderY + h * 0.14);
    ctx.stroke();
    
    // Book/Folder
    ctx.beginPath();
    ctx.rect(cx - 4, shoulderY + h * 0.08, 8, 11);
    ctx.fillStyle = isDark ? "#c96f53" : "#e58e8a";
    ctx.fill();
    ctx.stroke();

    ctx.moveTo(cx + 8, shoulderY);
    ctx.lineTo(cx + 3, shoulderY + h * 0.14);
    ctx.stroke();
  } else {
    // Simple walking arms
    ctx.moveTo(cx - 7, shoulderY);
    ctx.lineTo(cx - 10 + 5 * armSwing, shoulderY + h * 0.2);
    ctx.stroke();

    ctx.moveTo(cx + 7, shoulderY);
    ctx.lineTo(cx + 10 - 5 * armSwing, shoulderY + h * 0.2);
    ctx.stroke();
  }

  ctx.restore();
};

const CrowdCanvas = ({ src, rows = 15, cols = 7 }: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync dark mode state from documentElement
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDark();

    // Listen to dark mode toggling via MutationObserver
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // UTILS
    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => randomRange(0, array.length) | 0;
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = (array: any[], item: any) =>
      removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array: any[]) =>
      removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: any; peep: any }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 40 - 150 * gsap.parseEase("power2.in")(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return {
        startX,
        startY,
        endX,
      };
    };

    const normalWalk = ({ peep, props }: { peep: any; props: any }) => {
      const { startX, startY, endX } = props;
      const xDuration = randomRange(12, 18);
      const yDuration = 0.28;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.6, 1.4));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0,
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 8,
        },
        0,
      );

      return tl;
    };

    const walks = [normalWalk];

    // TYPES
    type Peep = {
      width: number;
      height: number;
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      type: number;
      walk: any;
      render: (ctx: CanvasRenderingContext2D, isDarkTheme: boolean) => void;
    };

    // MAIN
    const stage = {
      width: 0,
      height: 0,
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = () => {
      const totalCount = 20; // Generate 20 distinct characters
      for (let i = 0; i < totalCount; i++) {
        const pWidth = randomRange(50, 65);
        const pHeight = pWidth * 2.2; // Keep proper proportions
        allPeeps.push({
          width: pWidth,
          height: pHeight,
          x: 0,
          y: 0,
          anchorY: 0,
          scaleX: 1,
          type: i,
          walk: null,
          render: (renderCtx: CanvasRenderingContext2D, isDarkTheme: boolean) => {
            renderCtx.save();
            renderCtx.translate(allPeeps[i].x, allPeeps[i].y);
            renderCtx.scale(allPeeps[i].scaleX, 1);
            drawPeepCharacter(
              renderCtx,
              allPeeps[i].width,
              allPeeps[i].height,
              allPeeps[i].type,
              allPeeps[i].x,
              isDarkTheme
            );
            renderCtx.restore();
          },
        });
      }
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;

      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);

      // Check current dark mode dynamically from parent state
      const currentDark = document.documentElement.classList.contains("dark");

      crowd.forEach((peep) => {
        peep.render(ctx, currentDark);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = stage.width * dpr;
      canvas.height = stage.height * dpr;

      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    // Initialize peeps
    createPeeps();
    resize();
    gsap.ticker.add(render);

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, [rows, cols, isDark]);

  return (
    <canvas ref={canvasRef} className="absolute bottom-0 h-[90vh] w-full animate-fade-in duration-1000" />
  );
};

export { CrowdCanvas };
