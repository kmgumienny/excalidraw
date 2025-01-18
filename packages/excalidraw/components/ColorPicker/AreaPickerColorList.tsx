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
  barnTranslations?: Record<string, string>;
}

const AreaPickerColorList = ({
  palette,
  color,
  onChange,
  label,
  activeShade,
  barnTranslations,
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
        return barnTranslations ? barnTranslations["none"] : "none";
      case "#fcb27c":
        return barnTranslations ? barnTranslations["stall"] : "stall";
      case "#e9ecef":
        return barnTranslations ? barnTranslations["tack_room"] : "tack_room";
      case "#1e1e1e":
        return barnTranslations ? barnTranslations["pasture"] : "pasture";
      case "#eaddd7":
        return barnTranslations ? barnTranslations["dry_lot"] : "dry_lot";
      case "#99e9f2":
        return barnTranslations
          ? barnTranslations["storage_room"]
          : "storage_room";
      case "#a5d8ff":
        return barnTranslations ? barnTranslations["feed_room"] : "feed_room";
      case "#d0bfff":
        return barnTranslations
          ? barnTranslations["outdoor_arena"]
          : "outdoor_arena";
      case "#eebefa":
        return barnTranslations
          ? barnTranslations["indoor_arena"]
          : "indoor_arena";
      case "#fcc2d7":
        return barnTranslations ? barnTranslations["restroom"] : "restroom";
      case "#b2f2bb":
        return barnTranslations ? barnTranslations["office"] : "office";
      case "#96f2d7":
        return barnTranslations ? barnTranslations["wash_rack"] : "wash_rack";
      case "#ffec99":
        return barnTranslations ? barnTranslations["trail"] : "trail";
      case "#ffd8a8":
        return barnTranslations ? barnTranslations["round_pen"] : "round_pen";
      case "#ffc9c9":
      default:
        return barnTranslations ? barnTranslations["lounge"] : "lounge";
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
