import { getContrastYIQ } from "./colorPickerUtils";

interface HotkeyLabelProps {
  color: string;
  keyLabel: string | number;
  isCustomColor?: boolean;
  isShade?: boolean;
}
const AreaTypeHotkeyLabel = ({
  color,
  keyLabel,
  isCustomColor = false,
  isShade = false,
}: HotkeyLabelProps) => {
  console.log(`color: ${color} label:${keyLabel}`);
  return (
    <div
      className="color-picker__button__hotkey-label"
      style={{
        color: getContrastYIQ(color, isCustomColor),
      }}
    >
      {isShade && "⇧"}
      {keyLabel}
    </div>
  );
};

export default AreaTypeHotkeyLabel;
