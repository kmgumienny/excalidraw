import React, { useEffect, useState } from "react";

import type { ExcalidrawElement } from "../../element/types";

import { useAtom } from "jotai";
import {
  ColorPaletteCustom,
  DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX,
  DEFAULT_ELEMENT_STROKE_COLOR_INDEX,
} from "../../colors";
import { EVENT } from "../../constants";
import { KEYS } from "../../keys";
import AreaPickerColorList from "./AreaPickerColorList";
import type { ColorPickerType } from "./colorPickerUtils";
import {
  activeColorPickerSectionAtom,
  getColorNameAndShadeFromColor,
  getMostUsedCustomColors,
  isCustomColor,
} from "./colorPickerUtils";
import { colorPickerKeyNavHandler } from "./keyboardNavHandlers";

interface PickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  type: ColorPickerType;
  elements: readonly ExcalidrawElement[];
  updateData: (formData?: any) => void;
  children?: React.ReactNode;
  onEyeDropperToggle: (force?: boolean) => void;
  onEscape: (event: React.KeyboardEvent | KeyboardEvent) => void;
  barnTranslations?: Record<string, string>;
}

export const AreaPicker = ({
  color,
  onChange,
  label,
  type,
  elements,
  updateData,
  children,
  onEyeDropperToggle,
  onEscape,
  barnTranslations,
}: PickerProps) => {
  const palette: ColorPaletteCustom = {
    transparent: "transparent",
    a: "#a5d8ff",
    b: "#eaddd7",
    c: "#FBEC65",
    d: "#99e9f2",
    e: "#eebefa",
    f: "#e9ecef",
    g: "#b2f2bb",
    h: "#ffd8a8",
    i: "#fcc2d7",
    j: "#ffc9c9",
    k: "#96f2d7",
    l: "#d0bfff",
    m: "#ffec99",
    n: "#3BE8BD",
    o: "#EAAA35",
  };

  const [customColors] = React.useState(() => {
    if (type === "canvasBackground") {
      return [];
    }
    return getMostUsedCustomColors(elements, type, palette);
  });

  const [activeColorPickerSection, setActiveColorPickerSection] = useAtom(
    activeColorPickerSectionAtom,
  );

  const colorObj = getColorNameAndShadeFromColor({
    color,
    palette,
  });

  useEffect(() => {
    if (!activeColorPickerSection) {
      const isCustom = isCustomColor({ color, palette });
      const isCustomButNotInList = isCustom && !customColors.includes(color);

      setActiveColorPickerSection(
        isCustomButNotInList
          ? "hex"
          : isCustom
          ? "custom"
          : colorObj?.shade != null
          ? "shades"
          : "baseColors",
      );
    }
  }, [
    activeColorPickerSection,
    color,
    palette,
    setActiveColorPickerSection,
    colorObj,
    customColors,
  ]);

  const [activeShade, setActiveShade] = useState(
    colorObj?.shade ??
      (type === "elementBackground"
        ? DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX
        : DEFAULT_ELEMENT_STROKE_COLOR_INDEX),
  );

  useEffect(() => {
    if (colorObj?.shade != null) {
      setActiveShade(colorObj.shade);
    }

    const keyup = (event: KeyboardEvent) => {
      if (event.key === KEYS.ALT) {
        onEyeDropperToggle(false);
      }
    };
    document.addEventListener(EVENT.KEYUP, keyup, { capture: true });
    return () => {
      document.removeEventListener(EVENT.KEYUP, keyup, { capture: true });
    };
  }, [colorObj, onEyeDropperToggle]);

  const pickerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div role="dialog" aria-modal="true" aria-label={"Area Picker"}>
      <div
        ref={pickerRef}
        onKeyDown={(event) => {
          debugger;
          const handled = colorPickerKeyNavHandler({
            event,
            activeColorPickerSection,
            palette,
            color,
            onChange,
            onEyeDropperToggle,
            customColors,
            setActiveColorPickerSection,
            updateData,
            activeShade,
            onEscape,
          });

          if (handled) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        className="color-picker-content properties-content"
        // to allow focusing by clicking but not by tabbing
        tabIndex={-1}
      >
        {/* {!!customColors.length && (
          <div>
            <PickerHeading>
              {t("colorPicker.mostUsedCustomColors")}
            </PickerHeading>
            <AreaCustomColorList
              colors={customColors}
              color={color}
              label={t("colorPicker.mostUsedCustomColors")}
              onChange={onChange}
            />
          </div>
        )} */}

        <div>
          <AreaPickerColorList
            color={color}
            label={label}
            palette={palette}
            onChange={onChange}
            activeShade={activeShade}
            barnTranslations={barnTranslations}
          />
        </div>

        {children}
      </div>
    </div>
  );
};
