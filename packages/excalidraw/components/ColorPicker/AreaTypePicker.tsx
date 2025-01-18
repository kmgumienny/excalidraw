import { useAtom } from "jotai";
import { useRef } from "react";
import type { ColorPaletteCustom, ColorTuple } from "../../colors";
import { COLOR_PALETTE } from "../../colors";
import type { ExcalidrawElement } from "../../element/types";
import type { AppState } from "../../types";
import { isTransparent } from "../../utils";
import { useExcalidrawContainer } from "../App";
import { activeEyeDropperAtom } from "../EyeDropper";
import type { ColorPickerType } from "./colorPickerUtils";
import { activeColorPickerSectionAtom } from "./colorPickerUtils";

import { AreaPicker } from "./AreaPicker";
import "./ColorPicker.scss";

const isValidColor = (color: string) => {
  const style = new Option().style;
  style.color = color;
  return !!style.color;
};

export const getColor = (color: string): string | null => {
  if (isTransparent(color)) {
    return color;
  }

  // testing for `#` first fixes a bug on Electron (more specfically, an
  // Obsidian popout window), where a hex color without `#` is (incorrectly)
  // considered valid
  return isValidColor(`#${color}`)
    ? `#${color}`
    : isValidColor(color)
    ? color
    : null;
};

interface ColorPickerProps {
  type: ColorPickerType;
  color: string;
  onChange: (color: string) => void;
  label: string;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  palette?: ColorPaletteCustom | null;
  topPicks?: ColorTuple;
  updateData: (formData?: any) => void;
  barnTranslations?: Record<string, string>;
}

const AreaColorPickerPopupContent = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  updateData,
  barnTranslations,
}: Pick<
  ColorPickerProps,
  | "type"
  | "color"
  | "onChange"
  | "label"
  | "elements"
  | "palette"
  | "updateData"
  | "barnTranslations"
>) => {
  const { container } = useExcalidrawContainer();
  const [, setActiveColorPickerSection] = useAtom(activeColorPickerSectionAtom);

  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  const popoverRef = useRef<HTMLDivElement>(null);

  const focusPickerContent = () => {
    popoverRef.current
      ?.querySelector<HTMLDivElement>(".color-picker-content")
      ?.focus();
  };

  return (
    <AreaPicker
      palette={palette as ColorPaletteCustom}
      color={color}
      onChange={(changedColor) => {
        onChange(changedColor);
      }}
      onEyeDropperToggle={(force) => {
        setEyeDropperState((state) => {
          if (force) {
            state = state || {
              keepOpenOnAlt: true,
              onSelect: onChange,
              colorPickerType: type,
            };
            state.keepOpenOnAlt = true;
            return state;
          }

          return force === false || state
            ? null
            : {
                keepOpenOnAlt: false,
                onSelect: onChange,
                colorPickerType: type,
              };
        });
      }}
      onEscape={(event) => {
        if (eyeDropperState) {
          setEyeDropperState(null);
        } else {
          updateData({ openPopup: null });
        }
      }}
      label={label}
      type={type}
      elements={elements}
      updateData={updateData}
      barnTranslations={barnTranslations}
    />
  );
};

export const AreaTypePicker = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  topPicks,
  updateData,
  appState,
  barnTranslations,
}: ColorPickerProps) => {
  console.log(`1: ${barnTranslations}`);

  return (
    <div>
      <div role="dialog" aria-modal="true" className="color-picker-container">
        <AreaColorPickerPopupContent
          type={type}
          color={color}
          onChange={onChange}
          label={label}
          elements={elements}
          palette={palette}
          updateData={updateData}
          barnTranslations={barnTranslations}
        />
      </div>
    </div>
  );
};
