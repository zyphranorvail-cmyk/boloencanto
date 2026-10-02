(function () {
  const KEY = "cookie_consent";
  const RECORD = "cookie_consent_record";
  const NOTICE =
    "v1: Bolos Encanto usa a tag do Google Ads para medir visitas e compras, com valor da compra e número do pedido. Dados de navegação podem ser recebidos pelo Google para medição e otimização de anúncios. Você pode aceitar, recusar ou mudar sua escolha a qualquer momento.";
  const REGIONS = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
    "IS",
    "LI",
    "NO",
    "GB",
    "CH",
    "CA",
  ];
  const IDS = [
    "AW-18478757629",
    "AW-18387980072",
    "AW-18481966186",
    "AW-18481758044",
    "AW-18485492276",
    "AW-18488279914",
    "AW-18488217659",
  ];
  let regionRequired = true;
  let regionKnown = false;
  let loaded = false;
  let banner;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  window.gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
    region: [
      "AT",
      "BE",
      "BG",
      "HR",
      "CY",
      "CZ",
      "DK",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "HU",
      "IE",
      "IT",
      "LV",
      "LT",
      "LU",
      "MT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SK",
      "SI",
      "ES",
      "SE",
      "IS",
      "LI",
      "NO",
      "GB",
      "CH",
      "CA-QC",
    ],
  });

  function choice() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  function allowed() {
    const c = choice();
    return c === "granted" || (c === null && regionKnown && !regionRequired);
  }
  function signal() {
    const value = allowed() ? "granted" : "denied";
    if (value === "denied") window.gtag("set", "user_data", null);
    window.gtag("consent", "update", { ad_storage: value, ad_user_data: value, ad_personalization: value });
  }
  function load() {
    if (!allowed() || loaded) return;
    loaded = true;
    signal();
    window.gtag("js", new Date());
    IDS.forEach((id) => window.gtag("config", id));
    const script = document.createElement("script");
    script.async = true;
    script.dataset.googleAds = "";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + IDS[0];
    document.head.appendChild(script);
  }
  window.enviarConversaoGoogle = function (sendTo, payload) {
    if (!allowed()) return false;
    load();
    window.gtag("event", "conversion", Object.assign({ send_to: sendTo }, payload));
    return true;
  };

  async function lookup() {
    try {
      const response = await fetch("/cdn-cgi/trace", { signal: AbortSignal.timeout(2000) });
      if (!response.ok) return true;
      const code = (await response.text()).match(/^loc=([A-Z0-9]{2})$/m)?.[1];
      if (!code || code === "XX" || code === "T1") return true;
      return REGIONS.includes(code);
    } catch {
      return true;
    }
  }
  function draw(open) {
    if (banner) banner.hidden = !open;
  }
  function save(value) {
    try {
      let visitor = localStorage.getItem("cookie_consent_visitor");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("cookie_consent_visitor", visitor);
      }
      localStorage.setItem(
        RECORD,
        JSON.stringify({ visitor, at: new Date().toISOString(), choice: value, notice: NOTICE }),
      );
      localStorage.setItem(KEY, value);
    } catch {
      return;
    }
    signal();
    if (value === "granted") load();
    draw(false);
    window.dispatchEvent(new Event("ads-consent-change"));
  }
  function setup() {
    const style = document.createElement("style");
    style.textContent =
      ".ads-consent{position:fixed;z-index:99999;bottom:0;left:0;right:0;background:#fff;color:#20212a;border-top:2px solid #d62d70;box-shadow:0 -5px 20px #20212a22;font:14px/1.5 Arial,sans-serif;padding:18px max(18px,calc((100vw - 620px)/2));box-sizing:border-box}.ads-consent[hidden]{display:none}.ads-consent p{margin:0 0 12px}.ads-consent a{color:#a61e4d;text-decoration:underline}.ads-consent-actions{display:flex;gap:10px}.ads-consent button{font:600 14px Arial,sans-serif;padding:10px 18px;border:1px solid #d62d70;border-radius:4px;cursor:pointer;background:#fff;color:#a61e4d;flex:1}.ads-consent button.accept{background:#d62d70;color:#fff}.ads-settings{position:fixed;z-index:99998;bottom:8px;right:8px;background:#fff;color:#a61e4d;border:1px solid #d62d70;border-radius:4px;padding:5px 8px;font:12px Arial,sans-serif;cursor:pointer}";
    document.head.appendChild(style);
    banner = document.createElement("section");
    banner.className = "ads-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferências de publicidade");
    banner.hidden = true;
    banner.innerHTML =
      '<p>Usamos Google Ads para medir visitas e compras e melhorar os anúncios. Você pode aceitar ou recusar e mudar sua escolha depois. <a href="/privacidade.html">Política de privacidade</a></p><div class="ads-consent-actions"><button type="button" data-choice="denied">Recusar</button><button class="accept" type="button" data-choice="granted">Aceitar</button></div>';
    banner.querySelectorAll("[data-choice]").forEach((b) => b.addEventListener("click", () => save(b.dataset.choice)));
    document.body.appendChild(banner);
    const settings = document.createElement("button");
    settings.className = "ads-settings";
    settings.type = "button";
    settings.textContent = "Cookies";
    settings.setAttribute("aria-label", "Abrir preferências de publicidade");
    settings.addEventListener("click", () => draw(true));
    document.body.appendChild(settings);
    if (choice() === null && regionRequired) draw(true);
  }
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) {
      signal();
      load();
      draw(false);
    }
  });
  if (choice() !== null) {
    signal();
    load();
  }
  document.addEventListener("DOMContentLoaded", setup);
  lookup().then((required) => {
    regionRequired = required;
    regionKnown = true;
    signal();
    load();
    if (banner && choice() === null && required) draw(true);
    window.dispatchEvent(new Event("ads-consent-change"));
  });
})();
