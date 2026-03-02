import { useEffect, useRef } from "react";
import {
  PostProcessStage,
  Viewer as CesiumViewer,
} from "cesium";
import type { FilterMode } from "@/lib/constants";
import { SHADERS } from "@/shaders";

interface FilterPipelineProps {
  viewer: CesiumViewer | null;
  mode: FilterMode;
}

export function FilterPipeline({ viewer, mode }: FilterPipelineProps) {
  const stageRef = useRef<PostProcessStage | null>(null);

  useEffect(() => {
    if (!viewer) return;

    // Remove existing stage
    if (stageRef.current) {
      viewer.scene.postProcessStages.remove(stageRef.current);
      stageRef.current = null;
    }

    // Add new stage if mode is not "none"
    if (mode !== "none") {
      const shader = SHADERS[mode];
      const stage = new PostProcessStage({
        fragmentShader: shader,
        name: `worldview-${mode}`,
      });
      viewer.scene.postProcessStages.add(stage);
      stageRef.current = stage;
    }

    return () => {
      if (stageRef.current && viewer && !viewer.isDestroyed()) {
        try {
          viewer.scene.postProcessStages.remove(stageRef.current);
        } catch {
          // Viewer might be destroyed
        }
        stageRef.current = null;
      }
    };
  }, [viewer, mode]);

  return null;
}
