export { actionDeleteSelected } from "./actionDeleteSelected";
export { actionDuplicateSelection } from "./actionDuplicateSelection";
export {
  actionChangeAreaType,
  // actionChangeBackgroundColor,
  actionChangeFillStyle,
  actionChangeFontFamily,
  actionChangeFontSize,
  actionChangeOpacity,
  actionChangeSloppiness,
  actionChangeStrokeColor,
  actionChangeStrokeWidth,
  actionChangeTextAlign,
  actionChangeVerticalAlign,
} from "./actionProperties";
export { actionSelectAll } from "./actionSelectAll";
export {
  actionBringForward,
  actionBringToFront,
  actionSendBackward,
  actionSendToBack,
} from "./actionZindex";

export {
  actionChangeViewBackgroundColor,
  actionClearCanvas,
  actionResetZoom,
  actionToggleTheme,
  actionZoomIn,
  actionZoomOut,
  actionZoomToFit,
} from "./actionCanvas";

export { actionFinalize } from "./actionFinalize";

export {
  actionChangeExportBackground,
  actionChangeProjectName,
  actionLoadScene,
  actionSaveFileToDisk,
  actionSaveToActiveFile,
} from "./actionExport";

export {
  actionShortcuts,
  actionToggleCanvasMenu,
  actionToggleEditMenu,
} from "./actionMenu";
export { actionCopyStyles, actionPasteStyles } from "./actionStyles";

export { actionGroup, actionUngroup } from "./actionGroup";

export { actionGoToCollaborator } from "./actionNavigate";

export { actionAddToLibrary } from "./actionAddToLibrary";

export {
  actionAlignBottom,
  actionAlignHorizontallyCentered,
  actionAlignLeft,
  actionAlignRight,
  actionAlignTop,
  actionAlignVerticallyCentered,
} from "./actionAlign";

export {
  distributeHorizontally,
  distributeVertically,
} from "./actionDistribute";

export { actionFlipHorizontal, actionFlipVertical } from "./actionFlip";

export {
  actionCopy,
  actionCopyAsPng,
  actionCopyAsSvg,
  actionCut,
  copyText,
} from "./actionClipboard";

export { actionToggleGridMode } from "./actionToggleGridMode";
export { actionToggleObjectsSnapMode } from "./actionToggleObjectsSnapMode";
export { actionToggleZenMode } from "./actionToggleZenMode";

export { actionBindText, actionUnbindText } from "./actionBoundText";
export { actionToggleElementLock } from "./actionElementLock";
export { actionToggleLinearEditor } from "./actionLinearEditor";
export { actionLink } from "./actionLink";
export { actionToggleStats } from "./actionToggleStats";

export { actionToggleSearchMenu } from "./actionToggleSearchMenu";

export { actionToggleCropEditor } from "./actionCropEditor";
