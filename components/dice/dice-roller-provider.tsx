"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { DiceRollerProvider as ContextProvider } from "@/contexts/dice-roller-context";

// Separate context for DiceBox initialization to avoid circular dependency
const DiceBoxInitContext = createContext<{
  initializeDiceBox: (diceBox: any) => void;
}>({
  initializeDiceBox: () => {},
});

export function DiceRollerProvider({ children }: { children: React.ReactNode }) {
  const [diceBoxInstance, setDiceBoxInstance] = useState<any>(null);

  const initializeDiceBox = (diceBox: any) => {
    setDiceBoxInstance(diceBox);
  };

  return (
    <DiceBoxInitContext.Provider value={{ initializeDiceBox }}>
      <DiceBoxInitializer diceBoxInstance={diceBoxInstance} setDiceBoxInstance={setDiceBoxInstance}>
        <ContextProvider diceBoxInstance={diceBoxInstance}>
          {children}
        </ContextProvider>
      </DiceBoxInitializer>
    </DiceBoxInitContext.Provider>
  );
}

function DiceBoxInitializer({ 
  children, 
  diceBoxInstance,
  setDiceBoxInstance 
}: { 
  children: React.ReactNode;
  diceBoxInstance: any;
  setDiceBoxInstance: (instance: any) => void;
}) {
  const { initializeDiceBox } = useContext(DiceBoxInitContext);
  const canvasRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized || diceBoxInstance) return;

    const initDiceBox = async () => {
      try {
        // Dynamically import DiceBox (default export)
        const DiceBoxModule = await import("@3d-dice/dice-box");
        const DiceBox = DiceBoxModule.default || DiceBoxModule;

        // Wait for DOM to be ready
        if (typeof window === "undefined" || !document.body) {
          return;
        }

        // Create container element for dice rendering
        // DiceBox will create its own canvas - we need to provide a container div
        const canvasId = "dice-canvas-container";
        const canvasElementId = "dice-canvas"; // This is what DiceBox will use for the canvas id
        
        let canvasContainer = document.getElementById(canvasId);

        if (!canvasContainer) {
          canvasContainer = document.createElement("div");
          canvasContainer.id = canvasId;
          canvasContainer.style.position = "fixed";
          canvasContainer.style.top = "0";
          canvasContainer.style.left = "0";
          canvasContainer.style.width = "100vw";
          canvasContainer.style.height = "100vh";
          canvasContainer.style.pointerEvents = "none";
          canvasContainer.style.zIndex = "9999";
          canvasContainer.style.overflow = "visible";
          canvasContainer.style.backgroundColor = "transparent";
          canvasContainer.style.display = "block";
          canvasContainer.style.visibility = "visible";
          document.body.appendChild(canvasContainer);
          console.log("Created dice canvas container:", canvasContainer);
        }

        // Wait a tick to ensure DOM is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify container exists
        const containerElement = document.getElementById(canvasId);
        if (!containerElement) {
          console.error("Canvas container not found after creation");
          return;
        }
        
        console.log("DiceBox container element found:", containerElement);

        // Check if DiceBox is a constructor
        if (typeof DiceBox !== "function") {
          console.error("DiceBox is not a constructor:", DiceBox);
          return;
        }

        // Initialize DiceBox with config object (v1.1.0 API)
        // The id should be the element ID where DiceBox will create the canvas
        // DiceBox creates a canvas element with this id, not a container
        const diceBoxConfig = {
          id: canvasElementId, // This will be the canvas element's id
          assetPath: "/assets/",
          theme: "default",
          themeColor: "#3b82f6",
          scale: 6,
          gravity: 1,
          mass: 1,
          friction: 0.8,
          restitution: 0.3,
          linearDamping: 0.5,
          angularDamping: 0.5,
          lightIntensity: 1.5,
          shadows: true,
          sound: true,
          offscreen: false,
        };
        
        console.log("Initializing DiceBox with config:", diceBoxConfig);
        
        const diceBox = new DiceBox(diceBoxConfig);

        // Initialize the dice box
        await diceBox.init();
        console.log("DiceBox initialized successfully");
        
        // After init, DiceBox creates a canvas element
        // We need to move it into our container and ensure it has proper dimensions
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for canvas creation
        
        const canvasElement = document.getElementById(canvasElementId) as HTMLCanvasElement;
        if (canvasElement) {
          console.log("DiceBox canvas found:", canvasElement);
          
          // Move canvas into our container if it's not already there
          if (canvasElement.parentElement !== containerElement) {
            containerElement.appendChild(canvasElement);
            console.log("Moved canvas into container");
          }
          
          // Set up resize handler to keep canvas sized correctly
          const resizeCanvas = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            canvasElement.width = width;
            canvasElement.height = height;
            // Notify DiceBox of resize if it has a resize method
            if (diceBox && typeof diceBox.resize === 'function') {
              diceBox.resize(width, height);
            }
          };
          
          // Set initial dimensions
          resizeCanvas();
          
          // Add resize listener
          window.addEventListener('resize', resizeCanvas);
          
          // Ensure canvas is visible
          canvasElement.style.position = "absolute";
          canvasElement.style.top = "0";
          canvasElement.style.left = "0";
          canvasElement.style.width = "100%";
          canvasElement.style.height = "100%";
          canvasElement.style.display = "block";
          canvasElement.style.visibility = "visible";
          
          console.log("Canvas dimensions:", canvasElement.width, "x", canvasElement.height);
          console.log("Canvas style:", window.getComputedStyle(canvasElement));
          
          // Store resize handler for cleanup
          (diceBox as any)._resizeHandler = resizeCanvas;
        } else {
          console.warn("DiceBox canvas not found after init");
          // Check if canvas is created elsewhere
          const allCanvases = document.querySelectorAll("canvas");
          console.log("All canvases on page:", allCanvases.length);
          allCanvases.forEach((canvas, idx) => {
            console.log(`Canvas ${idx}:`, canvas, "Parent:", canvas.parentElement);
          });
        }

        diceBoxRef.current = diceBox;
        setDiceBoxInstance(diceBox);
        initializeDiceBox(diceBox);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize DiceBox:", error);
      }
    };

    initDiceBox();

    return () => {
      // Cleanup
      if (diceBoxRef.current) {
        try {
          // Remove resize handler
          const resizeHandler = (diceBoxRef.current as any)?._resizeHandler;
          if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
          }
          diceBoxRef.current.clear();
        } catch (error) {
          console.error("Error cleaning up DiceBox:", error);
        }
      }
    };
  }, [initializeDiceBox, isInitialized, diceBoxInstance, setDiceBoxInstance]);

  return (
    <>
      <div ref={canvasRef} style={{ display: "none" }} />
      {children}
    </>
  );
}
