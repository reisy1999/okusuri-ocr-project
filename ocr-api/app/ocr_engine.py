import io
import logging
import sys
import threading
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image
from yaml import safe_load

# ---------------------------------------------------------------------------
# Add ndlocr-lite/src to import path so we can use its modules directly
# ---------------------------------------------------------------------------
_NDLOCR_SRC = Path(__file__).resolve().parent.parent / "ndlocr-lite" / "src"
if str(_NDLOCR_SRC) not in sys.path:
    sys.path.insert(0, str(_NDLOCR_SRC))

sys.setrecursionlimit(5000)  # required by xy-cut reading order algorithm

from deim import DEIM  # noqa: E402
from ndl_parser import convert_to_xml_string3  # noqa: E402
from parseq import PARSEQ  # noqa: E402
from reading_order.xy_cut.eval import eval_xml  # noqa: E402

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# RecogLine — thin wrapper used by cascade recognition (from ndlocr-lite)
# ---------------------------------------------------------------------------
class RecogLine:
    def __init__(self, npimg: np.ndarray, idx: int, pred_char_cnt: float, pred_str: str = ""):
        self.npimg = npimg
        self.idx = idx
        self.pred_char_cnt = pred_char_cnt
        self.pred_str = pred_str

    def __lt__(self, other):
        return self.idx < other.idx


def _process_cascade(alllineobj, recognizer30, recognizer50, recognizer100):
    """Cascade recognition: route lines to 30/50/100-char models."""
    targetdflist30: list[RecogLine] = []
    targetdflist50: list[RecogLine] = []
    targetdflist100: list[RecogLine] = []

    for lineobj in alllineobj:
        if lineobj.pred_char_cnt == 3:
            targetdflist30.append(lineobj)
        elif lineobj.pred_char_cnt == 2:
            targetdflist50.append(lineobj)
        else:
            targetdflist100.append(lineobj)

    targetdflistall: list[RecogLine] = []
    with ThreadPoolExecutor(thread_name_prefix="parseq") as executor:
        # --- 30-char model ---
        resultlines30: list[str] = []
        if targetdflist30:
            resultlines30 = list(executor.map(recognizer30.read, [t.npimg for t in targetdflist30]))
        for i, lineobj in enumerate(targetdflist30):
            pred_str = resultlines30[i]
            if len(pred_str) >= 25:
                targetdflist50.append(lineobj)
            else:
                lineobj.pred_str = pred_str
                targetdflistall.append(lineobj)

        # --- 50-char model ---
        resultlines50: list[str] = []
        if targetdflist50:
            resultlines50 = list(executor.map(recognizer50.read, [t.npimg for t in targetdflist50]))
        for i, lineobj in enumerate(targetdflist50):
            pred_str = resultlines50[i]
            if len(pred_str) >= 45:
                targetdflist100.append(lineobj)
            else:
                lineobj.pred_str = pred_str
                targetdflistall.append(lineobj)

        # --- 100-char model ---
        resultlines100: list[str] = []
        if targetdflist100:
            resultlines100 = list(executor.map(recognizer100.read, [t.npimg for t in targetdflist100]))
        for i, lineobj in enumerate(targetdflist100):
            lineobj.pred_str = resultlines100[i]
            targetdflistall.append(lineobj)

    targetdflistall.sort()
    return [t.pred_str for t in targetdflistall]


# ---------------------------------------------------------------------------
# NdlOCREngine — main engine class
# ---------------------------------------------------------------------------
class NdlOCREngine:
    def __init__(self) -> None:
        self._detector: DEIM | None = None
        self._recognizer30: PARSEQ | None = None
        self._recognizer50: PARSEQ | None = None
        self._recognizer100: PARSEQ | None = None
        self._lock = threading.Lock()
        self._device = "cpu"

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------
    def initialize(self, device: str | None = None) -> None:
        """Load DEIM detector and 3 PARSEQ recognizers. Call once at startup."""
        import onnxruntime

        if device is None:
            # Check if CUDA is actually usable (not just listed by the package)
            self._device = "cpu"
            if "CUDAExecutionProvider" in onnxruntime.get_available_providers():
                try:
                    _test_sess = onnxruntime.InferenceSession(
                        str(_NDLOCR_SRC / "model" / "deim-s-1024x1024.onnx"),
                        providers=["CUDAExecutionProvider"],
                    )
                    del _test_sess
                    self._device = "cuda"
                except Exception:
                    logger.info("CUDAExecutionProvider listed but not usable, falling back to cpu")
        else:
            self._device = device

        base_dir = _NDLOCR_SRC
        logger.info("Initializing ndlocr-lite on device=%s ...", self._device)

        # DEIM detector
        self._detector = DEIM(
            model_path=str(base_dir / "model" / "deim-s-1024x1024.onnx"),
            class_mapping_path=str(base_dir / "config" / "ndl.yaml"),
            score_threshold=0.2,
            conf_threshold=0.25,
            iou_threshold=0.2,
            device=self._device,
        )
        logger.info("DEIM detector loaded.")

        # Character set for PARSEQ
        with open(base_dir / "config" / "NDLmoji.yaml", encoding="utf-8") as f:
            charobj = safe_load(f)
        charlist = list(charobj["model"]["charset_train"])

        # 3 cascade PARSEQ recognizers
        self._recognizer30 = PARSEQ(
            model_path=str(base_dir / "model" / "parseq-ndl-16x256-30-tiny-192epoch-tegaki3.onnx"),
            charlist=charlist,
            device=self._device,
        )
        self._recognizer50 = PARSEQ(
            model_path=str(base_dir / "model" / "parseq-ndl-16x384-50-tiny-146epoch-tegaki2.onnx"),
            charlist=charlist,
            device=self._device,
        )
        self._recognizer100 = PARSEQ(
            model_path=str(base_dir / "model" / "parseq-ndl-16x768-100-tiny-165epoch-tegaki2.onnx"),
            charlist=charlist,
            device=self._device,
        )
        logger.info("PARSEQ recognizers (30/50/100) loaded. ndlocr-lite ready.")

    @property
    def device(self) -> str:
        return self._device

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------
    def predict(self, image_bytes: bytes) -> list[dict]:
        """Run OCR on raw image bytes. Returns list of line dicts."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        with self._lock:
            # --- Detection ---
            detections = self._detector.detect(img_np)
            classeslist = list(self._detector.classes.values())

            # Build resultobj for convert_to_xml_string3
            # resultobj[0] = {0: [[x1,y1,x2,y2], ...]}  (text_block polygons)
            # resultobj[1] = {cls_id: [[x1,y1,x2,y2,conf,char_count], ...]}
            resultobj: list[dict] = [dict(), dict()]
            resultobj[0][0] = []
            for i in range(17):
                resultobj[1][i] = []
            for det in detections:
                xmin, ymin, xmax, ymax = det["box"]
                conf = float(det["confidence"])
                char_count = float(det.get("pred_char_count", 0))
                if det["class_index"] == 0:
                    resultobj[0][0].append([xmin, ymin, xmax, ymax])
                resultobj[1][det["class_index"]].append(
                    [xmin, ymin, xmax, ymax, conf, char_count]
                )

            # --- XML conversion & reading order ---
            xmlstr = convert_to_xml_string3(img_w, img_h, "input.jpg", classeslist, resultobj)
            xmlstr = "<OCRDATASET>" + xmlstr + "</OCRDATASET>"
            root = ET.fromstring(xmlstr)
            eval_xml(root, logger=None)

            # --- Extract line images ---
            line_elems = root.findall(".//LINE")
            alllineobj: list[RecogLine] = []
            for idx, le in enumerate(line_elems):
                xmin = int(le.get("X"))
                ymin = int(le.get("Y"))
                line_w = int(le.get("WIDTH"))
                line_h = int(le.get("HEIGHT"))
                try:
                    pred_char_cnt = float(le.get("PRED_CHAR_CNT"))
                except (TypeError, ValueError):
                    pred_char_cnt = 100.0
                # Clamp to image bounds
                lineimg = img_np[
                    max(0, ymin): min(img_h, ymin + line_h),
                    max(0, xmin): min(img_w, xmin + line_w),
                    :,
                ]
                if lineimg.size == 0:
                    continue
                alllineobj.append(RecogLine(lineimg, idx, pred_char_cnt))

            # --- Cascade recognition ---
            resultlinesall = _process_cascade(
                alllineobj, self._recognizer30, self._recognizer50, self._recognizer100
            )

        # --- Build response ---
        # Map recognized text back to line elements by order
        recog_idx = 0
        lines: list[dict] = []
        for le in line_elems:
            xmin = int(le.get("X"))
            ymin = int(le.get("Y"))
            line_w = int(le.get("WIDTH"))
            line_h = int(le.get("HEIGHT"))
            try:
                conf = float(le.get("CONF"))
            except (TypeError, ValueError):
                conf = 0.0
            is_vertical = line_h > line_w
            text = resultlinesall[recog_idx] if recog_idx < len(resultlinesall) else ""
            recog_idx += 1
            lines.append(
                {
                    "text": text,
                    "confidence": conf,
                    "box": [
                        [xmin, ymin],
                        [xmin + line_w, ymin],
                        [xmin + line_w, ymin + line_h],
                        [xmin, ymin + line_h],
                    ],
                    "is_vertical": is_vertical,
                }
            )
        return lines
