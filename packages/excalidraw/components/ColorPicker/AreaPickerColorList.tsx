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

  const getAreaTypeFromColor = (key: string) => {
    switch (key) {
      case "transparent":
        return barnTranslations ? barnTranslations["none"] : "none";
      case "a":
        return barnTranslations ? barnTranslations["stall"] : "stall";
      case "b":
        return barnTranslations ? barnTranslations["tack_room"] : "tack_room";
      case "c":
        return barnTranslations ? barnTranslations["pasture"] : "pasture";
      case "d":
        return barnTranslations ? barnTranslations["dry_lot"] : "dry_lot";
      case "e":
        return barnTranslations
          ? barnTranslations["storage_room"]
          : "storage_room";
      case "f":
        return barnTranslations ? barnTranslations["feed_room"] : "feed_room";
      case "g":
        return barnTranslations
          ? barnTranslations["outdoor_arena"]
          : "outdoor_arena";
      case "h":
        return barnTranslations
          ? barnTranslations["indoor_arena"]
          : "indoor_arena";
      case "i":
        return barnTranslations ? barnTranslations["restroom"] : "restroom";
      case "j":
        return barnTranslations ? barnTranslations["office"] : "office";
      case "k":
        return barnTranslations ? barnTranslations["wash_rack"] : "wash_rack";
      case "l":
        return barnTranslations ? barnTranslations["trail"] : "trail";
      case "m":
        return barnTranslations ? barnTranslations["round_pen"] : "round_pen";
      case "n":
        return barnTranslations ? barnTranslations["parking"] : "parking";
      case "o":
      default:
        return barnTranslations ? barnTranslations["lounge"] : "lounge";
    }
  };

  // palette["gween"] = ["#4B5320", "#8F9779", "#87A96B", "#32de84", "#4FFFB0"];

  return (
    <div className="area-color-picker-content--default">
      {Object.entries(palette).map(([key, value], index) => {
        let color =
          (Array.isArray(value) ? value[activeShade] : value) || "transparent";

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
              keyLabel={getAreaTypeFromColor(key)}
            />
          </button>
        );
      })}
    </div>
  );
};

export default AreaPickerColorList;
