

/**
 * 视频宽度变化监视器，用于同步视频嵌入的宽度设置
 */
export class VideoDivWidthChangeWatcher {
  private observer: MutationObserver;

  constructor() {
    this.observer = new MutationObserver(this.observerCallback);
    const divs = document.querySelectorAll(".internal-embed.media-embed.video-embed.is-loaded");
    divs.forEach((div) => this.observeDiv(div));
  }

  private observeDiv(div: Element) {
    this.observer.observe(div, {
      attributes: true,
      attributeFilter: ["width"],
    });
  }

  private observerCallback = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      const target = mutation.target as Element;
      if (mutation.type === "attributes" && mutation.attributeName === "width") {
        const video = target.querySelector("video");
        const width = target.getAttribute("width");
        if (video && width) {
          (video as HTMLVideoElement).style.width = `${width}px`;
        }
      }
    }
  };

  disconnect() {
    this.observer.disconnect();
  }
}
