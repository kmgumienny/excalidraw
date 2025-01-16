import clsx from "clsx";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import type { ColorPaletteCustom } from "../../colors";
import type { TranslationKeys } from "../../i18n";
import { t } from "../../i18n";
import AreaTypeHotkeyLabel from "./AreaTypeLabel";
import {
  activeColorPickerSectionAtom,
  colorPickerHotkeyBindings,
  getColorNameAndShadeFromColor,
} from "./colorPickerUtils";

interface PickerColorListProps {
  palette: ColorPaletteCustom;
  color: string;
  onChange: (color: string) => void;
  label: string;
  activeShade: number;
}

const AreaPickerColorList = ({
  palette,
  color,
  onChange,
  label,
  activeShade,
}: PickerColorListProps) => {
  const colorObj = getColorNameAndShadeFromColor({
    color: color || "transparent",
    palette,
  });
  const [activeColorPickerSection, setActiveColorPickerSection] = useAtom(
    activeColorPickerSectionAtom,
  );

  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (btnRef.current && activeColorPickerSection === "baseColors") {
      btnRef.current.focus();
    }
  }, [colorObj?.colorName, activeColorPickerSection]);

  const getAreaTypeFromColor = (color: string) => {
    switch (color) {
      case "transparent":
        return "none";
      case "#fcb27c":
        return "stall";
      case "#e9ecef":
        return "tack room";
      case "#1e1e1e":
        return "pasture";
      case "#eaddd7":
        return "dry lot";
      case "#99e9f2":
        return "storage";
      case "#a5d8ff":
        return "feed room";
      case "#d0bfff":
        return "outdoor arena";
      case "#eebefa":
        return "indoor arena";
      case "#fcc2d7":
        return "restroom";
      case "#b2f2bb":
        return "office";
      case "#96f2d7":
        return "wash rack";
      case "#ffec99":
        return "trail access";
      case "#ffd8a8":
        return "round pen";
      case "#ffc9c9":
      default:
        return "lounge";
    }
  };

  return (
    <div className="area-color-picker-content--default">
      {Object.entries(palette).map(([key, value], index) => {
        let color =
          (Array.isArray(value) ? value[activeShade] : value) || "transparent";

        // no white, no zanks
        if (color === "#ffffff") {
          debugger;
          color = "#fcb27c";
        }

        const keybinding = colorPickerHotkeyBindings[index];
        const label = t(
          `colors.${key.replace(/\d+/, "")}` as unknown as TranslationKeys,
          null,
          "",
        );

        return (
          <button
            ref={colorObj?.colorName === key ? btnRef : undefined}
            tabIndex={-1}
            type="button"
            className={clsx(
              "area-color-picker__button area-color-picker__button--large",
              {
                active: colorObj?.colorName === key,
                "is-transparent": color === "transparent" || !color,
              },
            )}
            onClick={() => {
              onChange(color);
              setActiveColorPickerSection("baseColors");
            }}
            title={`Stall`}
            aria-label={`${label} — ${keybinding}`}
            style={color ? { "--swatch-color": color } : undefined}
            data-testid={`Stall`}
            key={key}
          >
            <div className="area-color-picker__button-outline" />
            <AreaTypeHotkeyLabel
              color={color}
              keyLabel={getAreaTypeFromColor(color)}
            />
          </button>
        );
      })}
    </div>
  );
};

export default AreaPickerColorList;
