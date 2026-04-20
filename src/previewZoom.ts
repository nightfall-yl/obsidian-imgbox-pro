/**
 * 图片预览和缩放功能模块
 */

/**
 * 创建缩放遮罩
 * @returns 遮罩元素
 */
export function createZoomMask(): HTMLDivElement {
  const mask = document.createElement("div");
  mask.id = "preview-mask";
  mask.style.position = "fixed";
  mask.style.top = "0";
  mask.style.left = "0";
  mask.style.width = "100%";
  mask.style.height = "100%";
  mask.style.background = "rgba(0, 0, 0, 0.5)";
  mask.style.zIndex = "9998";
  document.body.appendChild(mask);
  return mask;
}

/**
 * 创建缩放的图片
 * @param src 图片源
 * @param adaptiveRatio 自适应比例
 * @returns 缩放的图片信息
 */
export async function createZoomedImage(
  src: string,
  adaptiveRatio: number
): Promise<{ zoomedImage: HTMLImageElement; originalWidth: number; originalHeight: number }> {
  const zoomedImage = document.createElement("img");
  zoomedImage.id = "preview-zoomed-image";
  zoomedImage.src = src;
  zoomedImage.style.position = "fixed";
  zoomedImage.style.zIndex = "9999";
  zoomedImage.style.top = "50%";
  zoomedImage.style.left = "50%";
  zoomedImage.style.transform = "translate(-50%, -50%)";
  document.body.appendChild(zoomedImage);

  const originalWidth = zoomedImage.naturalWidth;
  const originalHeight = zoomedImage.naturalHeight;
  adaptivelyDisplayImage(zoomedImage, originalWidth, originalHeight, adaptiveRatio);

  return { zoomedImage, originalWidth, originalHeight };
}

/**
 * 创建缩放比例显示元素
 * @param zoomedImage 缩放的图片
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @returns 缩放比例显示元素
 */
export function createZoomScaleDiv(
  zoomedImage: HTMLImageElement,
  originalWidth: number,
  originalHeight: number
): HTMLDivElement {
  const scaleDiv = document.createElement("div");
  scaleDiv.id = "preview-scale-div";
  scaleDiv.classList.add("preview-scale-div");
  scaleDiv.style.zIndex = "10000";
  updateZoomScaleDiv(scaleDiv, zoomedImage, originalWidth, originalHeight);
  document.body.appendChild(scaleDiv);
  return scaleDiv;
}

/**
 * 更新缩放比例显示
 * @param scaleDiv 缩放比例显示元素
 * @param zoomedImage 缩放的图片
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 */
export function updateZoomScaleDiv(
  scaleDiv: HTMLDivElement,
  zoomedImage: HTMLImageElement,
  originalWidth: number,
  originalHeight: number
): void {
  const width = zoomedImage.offsetWidth;
  const height = zoomedImage.offsetHeight;
  const scalePercent = (width / originalWidth) * 100;
  scaleDiv.innerText = `${width}×${height} (${scalePercent.toFixed(1)}%)`;
}

/**
 * 处理鼠标滚轮缩放
 * @param e 鼠标滚轮事件
 * @param zoomedImage 缩放的图片
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @param scaleDiv 缩放比例显示元素
 */
export function handleZoomMouseWheel(
  e: WheelEvent,
  zoomedImage: HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  scaleDiv: HTMLDivElement
): void {
  e.preventDefault();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const scale = e.deltaY > 0 ? 0.95 : 1.05;
  const newWidth = scale * zoomedImage.offsetWidth;
  const newHeight = scale * zoomedImage.offsetHeight;
  const newLeft = mouseX - (mouseX - zoomedImage.offsetLeft) * scale;
  const newTop = mouseY - (mouseY - zoomedImage.offsetTop) * scale;
  zoomedImage.style.width = `${newWidth}px`;
  zoomedImage.style.height = `${newHeight}px`;
  zoomedImage.style.left = `${newLeft}px`;
  zoomedImage.style.top = `${newTop}px`;
  updateZoomScaleDiv(scaleDiv, zoomedImage, originalWidth, originalHeight);
}

/**
 * 处理缩放图片的右键菜单
 * @param e 鼠标事件
 * @param zoomedImage 缩放的图片
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @param scaleDiv 缩放比例显示元素
 */
export function handleZoomContextMenu(
  e: MouseEvent,
  zoomedImage: HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  scaleDiv: HTMLDivElement
): void {
  e.preventDefault();
  zoomedImage.style.width = `${originalWidth}px`;
  zoomedImage.style.height = `${originalHeight}px`;
  zoomedImage.style.left = "50%";
  zoomedImage.style.top = "50%";
  updateZoomScaleDiv(scaleDiv, zoomedImage, originalWidth, originalHeight);
}

/**
 * 自适应显示图片
 * @param zoomedImage 缩放的图片
 * @param originalWidth 原始宽度
 * @param originalHeight 原始高度
 * @param adaptiveRatio 自适应比例
 */
export function adaptivelyDisplayImage(
  zoomedImage: HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  adaptiveRatio: number
): void {
  zoomedImage.style.left = "50%";
  zoomedImage.style.top = "50%";
  const screenRatio = adaptiveRatio;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  if (originalWidth > screenWidth || originalHeight > screenHeight) {
    if (originalWidth / screenWidth > originalHeight / screenHeight) {
      zoomedImage.style.width = `${screenWidth * screenRatio}px`;
      zoomedImage.style.height = "auto";
    } else {
      zoomedImage.style.height = `${screenHeight * screenRatio}px`;
      zoomedImage.style.width = "auto";
    }
  } else {
    zoomedImage.style.width = `${originalWidth}px`;
    zoomedImage.style.height = `${originalHeight}px`;
  }
}

/**
 * 处理缩放图片的拖拽开始
 * @param e 鼠标事件
 * @param zoomedImage 缩放的图片
 */
export function handleZoomDragStart(e: MouseEvent, zoomedImage: HTMLImageElement): void {
  e.preventDefault();
  let clickX = e.clientX;
  let clickY = e.clientY;

  const updatePosition = (moveEvt: MouseEvent) => {
    const moveX = moveEvt.clientX - clickX;
    const moveY = moveEvt.clientY - clickY;
    zoomedImage.style.left = `${zoomedImage.offsetLeft + moveX}px`;
    zoomedImage.style.top = `${zoomedImage.offsetTop + moveY}px`;
    clickX = moveEvt.clientX;
    clickY = moveEvt.clientY;
  };

  document.addEventListener("mousemove", updatePosition);
  document.addEventListener(
    "mouseup",
    function listener() {
      document.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("mouseup", listener);
    },
    { once: true }
  );
}
