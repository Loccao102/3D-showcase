/**
 * Showcase 3D Engine — Embeddable Web Component & SDK
 * Usage:
 *   <script src="/sdk/showcase-embed.js"></script>
 *   <showcase-viewer slug="automotive-concept-01" controls="1" height="500px"></showcase-viewer>
 */
(function () {
  if (typeof window === "undefined" || customElements.get("showcase-viewer")) {
    return;
  }

  class ShowcaseViewerElement extends HTMLElement {
    static get observedAttributes() {
      return ["slug", "controls", "theme", "atmosphere", "height", "width"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._iframe = null;
      this._onMessage = this._handleMessage.bind(this);
    }

    connectedCallback() {
      this._render();
      window.addEventListener("message", this._onMessage);
    }

    disconnectedCallback() {
      window.removeEventListener("message", this._onMessage);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue && this._iframe) {
        if (name === "height") {
          this._iframe.style.height = newValue || "100%";
        } else if (name === "width") {
          this._iframe.style.width = newValue || "100%";
        } else {
          this._updateSrc();
        }
      }
    }

    _updateSrc() {
      if (!this._iframe) return;
      const slug = this.getAttribute("slug") || "automotive-concept-01";
      const controls = this.getAttribute("controls") || "1";
      const theme = this.getAttribute("theme") || "dark";
      const atmosphere = this.getAttribute("atmosphere") || "studio";
      const host = this.getAttribute("host") || "";
      const url = `${host}/embed?slug=${encodeURIComponent(slug)}&controls=${controls}&theme=${theme}&atmosphere=${atmosphere}`;
      this._iframe.src = url;
    }

    _render() {
      const height = this.getAttribute("height") || "100%";
      const width = this.getAttribute("width") || "100%";

      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: block;
          position: relative;
          width: ${width};
          height: ${height};
          min-height: 300px;
          overflow: hidden;
          background: #090b0f;
          border-radius: inherit;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          background: transparent;
        }
      `;

      this._iframe = document.createElement("iframe");
      this._iframe.setAttribute("allow", "accelerometer; camera; gyroscope; web-share; xr-spatial-tracking");
      this._iframe.setAttribute("title", "3D Interactive Showcase Viewer");
      this._updateSrc();

      this.shadowRoot.innerHTML = "";
      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(this._iframe);
    }

    _handleMessage(event) {
      if (!this._iframe || event.source !== this._iframe.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "SHOWCASE_READY") {
        this.dispatchEvent(new CustomEvent("showcase-ready", { detail: data }));
      } else if (data.type === "SHOWCASE_SELECTION_CHANGED") {
        this.dispatchEvent(new CustomEvent("showcase-selection-change", { detail: data.snapshot }));
      } else if (data.type === "SHOWCASE_HOTSPOT_CLICKED") {
        this.dispatchEvent(new CustomEvent("showcase-hotspot-click", { detail: data }));
      }
    }

    _post(action) {
      if (this._iframe && this._iframe.contentWindow) {
        this._iframe.contentWindow.postMessage(action, "*");
      }
    }

    // Public API Methods
    selectOption(groupId, optionId) {
      this._post({ type: "SHOWCASE_SELECT_OPTION", groupId, optionId });
    }

    setCameraPreset(presetId) {
      this._post({ type: "SHOWCASE_SET_CAMERA_PRESET", presetId });
    }

    setAtmosphere(atmosphere) {
      this._post({ type: "SHOWCASE_SET_ATMOSPHERE", atmosphere });
    }

    toggleTechnical(active) {
      this._post({ type: "SHOWCASE_TRIGGER_TECHNICAL", active });
    }

    requestSnapshot() {
      this._post({ type: "SHOWCASE_REQUEST_SNAPSHOT" });
    }
  }

  customElements.define("showcase-viewer", ShowcaseViewerElement);
})();
